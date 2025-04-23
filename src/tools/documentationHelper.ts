import * as fs from 'fs'
import * as path from 'path'
import { promisify } from 'util'
import { z } from 'zod'

const readdir = promisify(fs.readdir)
const readFile = promisify(fs.readFile)
const stat = promisify(fs.stat)

/**
 * Documentation Helper tool
 *   - Indexes and searches through project documentation
 *   - Helps find relevant information in project docs
 */

export const documentationHelperToolName = 'documentationHelper'
export const documentationHelperToolDescription =
  'Searches through project documentation to find relevant information.'

export const DocumentationHelperToolSchema = z.object({
  query: z.string().optional().describe('Search query to find relevant documentation'),
  docFile: z.string().optional().describe('Specific documentation file to read'),
  section: z.string().optional().describe('Specific section within a documentation file'),
  listDocs: z
    .boolean()
    .optional()
    .describe('Whether to list all documentation files with summaries'),
})

type DocumentationHelperToolInput = z.infer<typeof DocumentationHelperToolSchema>

interface DocumentationFile {
  filename: string
  title: string
  summary: string
  sections: { heading: string; content: string }[]
}

// Implementation
export async function runDocumentationHelperTool(params: DocumentationHelperToolInput) {
  // Get the project root
  const projectRoot = process.cwd()

  // Locate the docs directory - typically at the project root
  const docsDir = path.join(projectRoot, 'docs')

  // Check if the docs directory exists
  if (!fs.existsSync(docsDir)) {
    return {
      error: 'Documentation directory not found',
      path: docsDir,
    }
  }

  // Handle different actions based on the parameters
  try {
    // List all documentation files
    if (params.listDocs) {
      const docs = await getDocumentationList(docsDir)
      return {
        documentationFiles: docs.map(doc => ({
          filename: doc.filename,
          title: doc.title,
          summary: doc.summary,
          sections: doc.sections.map(s => s.heading),
        })),
      }
    }

    // Read a specific documentation file
    if (params.docFile) {
      const filePath = path.join(docsDir, params.docFile)

      if (!fs.existsSync(filePath)) {
        return {
          error: 'Documentation file not found',
          path: filePath,
        }
      }

      const content = await readFile(filePath, 'utf-8')
      const title = extractTitle(content)
      const sections = extractSections(content)

      // Return a specific section if requested
      if (params.section) {
        const section = sections.find(s =>
          s.heading.toLowerCase().includes(params.section!.toLowerCase()),
        )

        if (!section) {
          return {
            error: 'Section not found',
            section: params.section,
            availableSections: sections.map(s => s.heading),
          }
        }

        return {
          title,
          section: section.heading,
          content: section.content,
        }
      }

      // Return the full document
      return {
        title,
        filename: params.docFile,
        content,
        sections: sections.map(s => s.heading),
      }
    }

    // Search through documentation
    if (params.query) {
      const results = await searchDocumentation(docsDir, params.query)
      return {
        query: params.query,
        results,
      }
    }

    // Default: List available documentation files
    const docs = await getDocumentationList(docsDir)
    return {
      documentationFiles: docs.map(doc => ({
        filename: doc.filename,
        title: doc.title,
        summary: doc.summary,
      })),
    }
  } catch (error) {
    return {
      error: 'Error processing documentation',
      details: error instanceof Error ? error.message : String(error),
    }
  }
}

// Helper functions
async function getDocumentationList(docsDir: string): Promise<DocumentationFile[]> {
  const files = await readdir(docsDir)
  const mdFiles = files.filter(file => file.endsWith('.md'))

  const docs: DocumentationFile[] = []

  for (const file of mdFiles) {
    const filePath = path.join(docsDir, file)
    const fileStat = await stat(filePath)

    // Skip directories
    if (fileStat.isDirectory()) continue

    const content = await readFile(filePath, 'utf-8')
    const title = extractTitle(content)
    const summary = extractSummary(content)
    const sections = extractSections(content)

    docs.push({
      filename: file,
      title,
      summary,
      sections,
    })
  }

  return docs
}

function extractTitle(content: string): string {
  const titleMatch = content.match(/^# (.+)$/m)
  return titleMatch ? titleMatch[1] : 'Untitled Document'
}

function extractSummary(content: string): string {
  // Find the first paragraph after the title
  const paragraphMatch = content.match(/^# .+\n\n(.+?)\n/s)
  const summary = paragraphMatch ? paragraphMatch[1] : ''

  // Limit summary length to 200 characters
  return summary.length > 200 ? summary.substring(0, 197) + '...' : summary
}

function extractSections(content: string): { heading: string; content: string }[] {
  const headingRegex = /^(#+) (.+)$/gm
  const sections: { heading: string; content: string }[] = []

  let match
  let lastIndex = 0
  let lastLevel = 0
  let lastHeading = ''

  // Find all headings
  while ((match = headingRegex.exec(content)) !== null) {
    // If this isn't the first heading, add the content of the previous section
    if (lastHeading) {
      const sectionContent = content.substring(lastIndex, match.index).trim()
      sections.push({
        heading: lastHeading,
        content: sectionContent,
      })
    }

    // Save this heading's information
    lastLevel = match[1].length
    lastHeading = match[2]
    lastIndex = match.index + match[0].length
  }

  // Add the last section
  if (lastHeading) {
    const sectionContent = content.substring(lastIndex).trim()
    sections.push({
      heading: lastHeading,
      content: sectionContent,
    })
  }

  return sections
}

async function searchDocumentation(docsDir: string, query: string): Promise<any[]> {
  const docs = await getDocumentationList(docsDir)
  const searchTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter(term => term.length > 2)

  if (searchTerms.length === 0) {
    return []
  }

  const results = []

  for (const doc of docs) {
    const filePath = path.join(docsDir, doc.filename)
    const content = await readFile(filePath, 'utf-8')

    // Check if any search term is in the content
    const hasMatch = searchTerms.some(term => content.toLowerCase().includes(term))

    if (hasMatch) {
      // Extract snippets containing the search terms
      const snippets = extractSnippet(content, searchTerms)

      if (snippets.length > 0) {
        results.push({
          filename: doc.filename,
          title: doc.title,
          snippets,
        })
      }
    }
  }

  return results
}

function extractSnippet(content: string, searchTerms: string[]): string[] {
  const lines = content.split('\n')
  const snippets: string[] = []
  const maxSnippetLength = 200

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase()

    // Check if the line contains any of the search terms
    if (searchTerms.some(term => line.includes(term))) {
      // Build a snippet with context (1 line before and after)
      const start = Math.max(0, i - 1)
      const end = Math.min(lines.length - 1, i + 1)
      let snippet = lines.slice(start, end + 1).join('\n')

      // Limit snippet length
      if (snippet.length > maxSnippetLength) {
        snippet = snippet.substring(0, maxSnippetLength - 3) + '...'
      }

      snippets.push(snippet)

      // Skip the next few lines to avoid duplicate snippets
      i += 1
    }
  }

  return snippets
}

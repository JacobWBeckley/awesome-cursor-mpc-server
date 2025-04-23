import fs from 'fs'
import path from 'path'
import { z } from 'zod'

/**
 * File Analyzer tool
 *   - Provides detailed analysis of specific files in the project
 *   - Can detect validation/formatting patterns and provide insights
 */

export const fileAnalyzerToolName = 'fileAnalyzer'
export const fileAnalyzerToolDescription =
  'Analyzes specific files in the project to extract insights about their structure and patterns.'

export const FileAnalyzerToolSchema = z.object({
  filePath: z.string(),
  analysis: z.enum(['basic', 'validation', 'imports', 'exports', 'dependencies']).optional(),
})

// Function to analyze a file for validation usage
function analyzeValidationUsage(content: string): any {
  const analysis = {
    usesValidationService: false,
    usesFormatterService: false,
    validationImports: [] as string[],
    validationMethods: [] as string[],
    formatterMethods: [] as string[],
    potentialIssues: [] as string[],
  }

  // Check for imports
  const validationImportRegex = /import\s+.*from\s+['"]@\/lib\/validation['"]/g
  const validationImportMatches = content.match(validationImportRegex) || []

  if (validationImportMatches.length > 0) {
    analysis.validationImports = validationImportMatches

    // Check if it imports ValidationService
    if (content.includes('ValidationService')) {
      analysis.usesValidationService = true

      // Find ValidationService method calls
      const validationMethodRegex = /ValidationService\.([\w]+)/g
      let match
      while ((match = validationMethodRegex.exec(content)) !== null) {
        if (!analysis.validationMethods.includes(match[1])) {
          analysis.validationMethods.push(match[1])
        }
      }
    }

    // Check if it imports FormatterService
    if (content.includes('FormatterService')) {
      analysis.usesFormatterService = true

      // Find FormatterService method calls
      const formatterMethodRegex = /FormatterService\.([\w]+)/g
      let match
      while ((match = formatterMethodRegex.exec(content)) !== null) {
        if (!analysis.formatterMethods.includes(match[1])) {
          analysis.formatterMethods.push(match[1])
        }
      }
    }

    // Look for potential validation issues
    const inlineValidationPatterns = [/\.test\(/, /\.match\(/, /\.replace\(/]

    for (const pattern of inlineValidationPatterns) {
      if (pattern.test(content)) {
        analysis.potentialIssues.push(
          'Possibly contains inline validation/formatting that could be moved to centralized services',
        )
        break
      }
    }
  }

  return analysis
}

// Function to analyze imports in a file
function analyzeImports(content: string): any {
  const analysis = {
    imports: [] as { source: string; specifiers: string[] }[],
  }

  // Match all import statements
  const importRegex = /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g
  let match

  while ((match = importRegex.exec(content)) !== null) {
    const specifiersStr = match[1]
    const source = match[2]

    // Extract individual specifiers
    const specifiers = specifiersStr
      .split(',')
      .map(s => s.trim())
      .filter(s => s !== '')

    analysis.imports.push({
      source,
      specifiers,
    })
  }

  // Also catch default imports
  const defaultImportRegex = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g
  while ((match = defaultImportRegex.exec(content)) !== null) {
    const specifier = match[1]
    const source = match[2]

    analysis.imports.push({
      source,
      specifiers: [specifier + ' (default)'],
    })
  }

  return analysis
}

// Function to analyze exports in a file
function analyzeExports(content: string): any {
  const analysis = {
    exports: [] as string[],
    defaultExport: null as string | null,
  }

  // Match all named exports
  const exportRegex = /export\s+(?:const|function|class|let|var|type|interface|enum)\s+(\w+)/g
  let match

  while ((match = exportRegex.exec(content)) !== null) {
    analysis.exports.push(match[1])
  }

  // Also catch exports from object pattern
  const exportFromPatternRegex = /export\s+{([^}]+)}/g
  while ((match = exportFromPatternRegex.exec(content)) !== null) {
    const exportsList = match[1]
      .split(',')
      .map(s => s.trim())
      .filter(s => s !== '')

    analysis.exports.push(...exportsList)
  }

  // Check for default export
  const defaultExportRegex = /export\s+default\s+(?:function|class)?\s*(\w+)?/
  const defaultMatch = content.match(defaultExportRegex)

  if (defaultMatch) {
    analysis.defaultExport = defaultMatch[1] || 'anonymous'
  }

  return analysis
}

export async function runFileAnalyzerTool(args: z.infer<typeof FileAnalyzerToolSchema>) {
  const { filePath, analysis = 'basic' } = args
  const projectRoot = path.join(process.cwd(), '..')
  const fullPath = path.join(projectRoot, filePath)

  try {
    // Check if the file exists
    if (!fs.existsSync(fullPath)) {
      return {
        content: [
          {
            type: 'text',
            text: `File not found: ${filePath}`,
          },
        ],
      }
    }

    // Read the file content
    const content = await fs.promises.readFile(fullPath, 'utf-8')

    // Perform requested analysis
    const result: any = {
      filePath,
      size: content.length,
      lines: content.split('\n').length,
    }

    switch (analysis) {
      case 'validation':
        result.validation = analyzeValidationUsage(content)
        break

      case 'imports':
        result.imports = analyzeImports(content)
        break

      case 'exports':
        result.exports = analyzeExports(content)
        break

      case 'dependencies':
        result.imports = analyzeImports(content)
        result.validation = analyzeValidationUsage(content)
        break

      case 'basic':
      default:
        // Basic file info and a sample of content
        const lines = content.split('\n')
        result.preview = lines.slice(0, Math.min(20, lines.length)).join('\n')
        result.extension = path.extname(filePath)
        result.imports = analyzeImports(content)

        // Check for React component
        if (content.includes('import React') || content.includes("from 'react'")) {
          const componentNameMatch = path.basename(filePath).match(/^([A-Z][a-zA-Z0-9]*)\.tsx?$/)
          if (componentNameMatch) {
            result.isReactComponent = true
            result.componentName = componentNameMatch[1]

            // Check for props interface/type
            const propsTypeMatch = content.match(/interface\s+([A-Z][a-zA-Z0-9]*Props)/)
            if (propsTypeMatch) {
              result.propsInterface = propsTypeMatch[1]
            }
          }
        }

        // Check for validation usage
        if (content.includes('ValidationService') || content.includes('FormatterService')) {
          result.usesValidation = true
          result.validation = analyzeValidationUsage(content)
        }
        break
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error analyzing file ${filePath}: ${error.message || error}`,
        },
      ],
    }
  }
}

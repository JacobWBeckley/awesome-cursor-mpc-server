import fs from 'fs'
import path from 'path'
import { z } from 'zod'

/**
 * Project Structure tool
 *   - Scans the project directory and builds a representation of its structure
 *   - Focuses on important directories like src, components, pages, etc.
 */

export const projectStructureToolName = 'projectStructure'
export const projectStructureToolDescription =
  'Analyzes the project structure and returns a representation of it.'

export const ProjectStructureToolSchema = z.object({
  rootDir: z.string().optional(),
  depth: z.number().optional(),
  includeDirs: z.array(z.string()).optional(),
  excludeDirs: z.array(z.string()).optional(),
})

// Function to scan a directory recursively
async function scanDirectory(
  dir: string,
  rootDir: string,
  depth: number = 3,
  includeDirs: string[] = [],
  excludeDirs: string[] = ['node_modules', '.git', 'dist', 'build'],
): Promise<any> {
  if (depth <= 0)
    return { type: 'directory', name: path.basename(dir), note: '[max depth reached]' }

  const result: any = {
    type: 'directory',
    name: path.basename(dir),
    path: path.relative(rootDir, dir),
    children: [],
  }

  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name)
      const relativePath = path.relative(rootDir, entryPath)

      if (entry.isDirectory()) {
        // Skip excluded directories
        if (excludeDirs.includes(entry.name)) {
          result.children.push({
            type: 'directory',
            name: entry.name,
            note: '[excluded]',
          })
          continue
        }

        // If includeDirs is not empty, only include specified directories
        if (
          includeDirs.length > 0 &&
          !includeDirs.some(include => relativePath.startsWith(include))
        ) {
          continue
        }

        // Recursively scan subdirectories
        const childResult = await scanDirectory(
          entryPath,
          rootDir,
          depth - 1,
          includeDirs,
          excludeDirs,
        )
        result.children.push(childResult)
      } else {
        // Add file entries
        result.children.push({
          type: 'file',
          name: entry.name,
          path: relativePath,
          extension: path.extname(entry.name),
        })
      }
    }

    // Sort children by type then by name
    result.children.sort((a: any, b: any) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })
  } catch (error) {
    result.error = `Error scanning directory: ${(error as Error).message}`
  }

  return result
}

export async function runProjectStructureTool(args: z.infer<typeof ProjectStructureToolSchema>) {
  const rootDir = args.rootDir || process.cwd()
  const depth = args.depth || 5
  const includeDirs = args.includeDirs || []
  const excludeDirs = args.excludeDirs || ['node_modules', '.git', 'dist', 'build']

  try {
    // Go up one directory to get the actual project root
    const projectRoot = path.resolve(rootDir, '..')

    // Scan the project directory
    const structure = await scanDirectory(projectRoot, projectRoot, depth, includeDirs, excludeDirs)

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(structure, null, 2),
        },
      ],
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error analyzing project structure: ${error.message || error}`,
        },
      ],
    }
  }
}

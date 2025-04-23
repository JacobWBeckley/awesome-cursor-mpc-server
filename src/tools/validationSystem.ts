import fs from 'fs'
import path from 'path'
import { z } from 'zod'

/**
 * Validation System Analysis tool
 *   - Examines the validation and formatting system in the codebase
 *   - Focuses on ValidationService, FormatterService, and related components
 */

export const validationSystemToolName = 'validationSystem'
export const validationSystemToolDescription =
  'Analyzes the validation and formatting system, providing details about its structure and capabilities.'

export const ValidationSystemToolSchema = z.object({
  action: z.enum(['overview', 'details', 'schemas', 'formatters', 'validators']).optional(),
  specificFile: z.string().optional(),
})

// Function to get file content if it exists
async function getFileContent(
  filePath: string,
): Promise<{ exists: boolean; content?: string; error?: string }> {
  try {
    if (fs.existsSync(filePath)) {
      const content = await fs.promises.readFile(filePath, 'utf-8')
      return { exists: true, content }
    }
    return { exists: false }
  } catch (error) {
    return { exists: false, error: (error as Error).message }
  }
}

// Function to get all files in a directory with a specific extension
async function getFilesInDirectory(dirPath: string, extension = '.ts'): Promise<string[]> {
  try {
    if (!fs.existsSync(dirPath)) return []

    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
    const files = entries
      .filter(entry => entry.isFile() && entry.name.endsWith(extension))
      .map(entry => path.join(dirPath, entry.name))

    return files
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error)
    return []
  }
}

export async function runValidationSystemTool(args: z.infer<typeof ValidationSystemToolSchema>) {
  const projectRoot = process.cwd()
  const action = args.action || 'overview'
  const specificFile = args.specificFile

  // Path to the validation system
  const validationDir = path.join(projectRoot, '..', 'src/lib/validation')

  try {
    // If a specific file is requested
    if (specificFile) {
      const filePath = path.join(validationDir, specificFile)
      const fileResult = await getFileContent(filePath)

      if (!fileResult.exists) {
        return {
          content: [
            {
              type: 'text',
              text: `File not found: ${specificFile}`,
            },
          ],
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: `${specificFile} content:\n\n${fileResult.content}`,
          },
        ],
      }
    }

    // Handle different actions
    switch (action) {
      case 'overview': {
        // Get ValidationService details
        const validationServicePath = path.join(validationDir, 'ValidationService.ts')
        const validationServiceResult = await getFileContent(validationServicePath)

        // Get FormatterService details
        const formatterServicePath = path.join(validationDir, 'FormatterService.ts')
        const formatterServiceResult = await getFileContent(formatterServicePath)

        // Get config details
        const configPath = path.join(validationDir, 'config.ts')
        const configResult = await getFileContent(configPath)

        // Get directory structure
        const schemasDir = path.join(validationDir, 'schemas')
        const formattersDir = path.join(validationDir, 'formatters')
        const validatorsDir = path.join(validationDir, 'validators')

        const schemaFiles = await getFilesInDirectory(schemasDir)
        const formatterFiles = await getFilesInDirectory(formattersDir)
        const validatorFiles = await getFilesInDirectory(validatorsDir)

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  structure: {
                    validationServiceExists: validationServiceResult.exists,
                    formatterServiceExists: formatterServiceResult.exists,
                    configExists: configResult.exists,
                    schemas: schemaFiles.map(file => path.basename(file)),
                    formatters: formatterFiles.map(file => path.basename(file)),
                    validators: validatorFiles.map(file => path.basename(file)),
                  },
                  servicesSummary: {
                    validationService: validationServiceResult.exists
                      ? 'ValidationService.ts exists and defines methods for validating form inputs'
                      : 'ValidationService.ts not found',
                    formatterService: formatterServiceResult.exists
                      ? 'FormatterService.ts exists and defines methods for formatting values'
                      : 'FormatterService.ts not found',
                    config: configResult.exists
                      ? 'config.ts exists and defines validation constants and regular expressions'
                      : 'config.ts not found',
                  },
                },
                null,
                2,
              ),
            },
          ],
        }
      }

      case 'details': {
        // Get ValidationService details
        const validationServicePath = path.join(validationDir, 'ValidationService.ts')
        const validationServiceResult = await getFileContent(validationServicePath)

        // Get FormatterService details
        const formatterServicePath = path.join(validationDir, 'FormatterService.ts')
        const formatterServiceResult = await getFileContent(formatterServicePath)

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  validationService: {
                    exists: validationServiceResult.exists,
                    content: validationServiceResult.content,
                  },
                  formatterService: {
                    exists: formatterServiceResult.exists,
                    content: formatterServiceResult.content,
                  },
                },
                null,
                2,
              ),
            },
          ],
        }
      }

      case 'schemas': {
        const schemasDir = path.join(validationDir, 'schemas')
        const schemaFiles = await getFilesInDirectory(schemasDir)

        const schemas: Record<string, string | undefined> = {}

        for (const file of schemaFiles) {
          const filename = path.basename(file)
          const content = await getFileContent(file)
          schemas[filename] = content.content
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ schemas }, null, 2),
            },
          ],
        }
      }

      case 'formatters': {
        const formattersDir = path.join(validationDir, 'formatters')
        const formatterFiles = await getFilesInDirectory(formattersDir)

        const formatters: Record<string, string | undefined> = {}

        for (const file of formatterFiles) {
          const filename = path.basename(file)
          const content = await getFileContent(file)
          formatters[filename] = content.content
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ formatters }, null, 2),
            },
          ],
        }
      }

      case 'validators': {
        const validatorsDir = path.join(validationDir, 'validators')
        const validatorFiles = await getFilesInDirectory(validatorsDir)

        const validators: Record<string, string | undefined> = {}

        for (const file of validatorFiles) {
          const filename = path.basename(file)
          const content = await getFileContent(file)
          validators[filename] = content.content
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ validators }, null, 2),
            },
          ],
        }
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Invalid action: ${action}. Valid actions are: overview, details, schemas, formatters, validators.`,
            },
          ],
        }
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error analyzing validation system: ${error.message || error}`,
        },
      ],
    }
  }
}

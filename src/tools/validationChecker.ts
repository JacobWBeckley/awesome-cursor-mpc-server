import fs from 'fs'
import { globSync } from 'glob'
import path from 'path'
import { z } from 'zod'

/**
 * Validation Checker tool
 *   - Scans components for validation rule violations
 *   - Identifies cases where validation should use ValidationService
 */

export const validationCheckerToolName = 'validationChecker'
export const validationCheckerToolDescription =
  'Scans components for validation rule compliance and suggests improvements.'

export const ValidationCheckerToolSchema = z.object({
  target: z.string().optional(), // Directory or file to scan (default: src/components)
  fix: z.boolean().optional(), // Whether to suggest fixes
})

// Patterns that indicate possible validation issues
const VALIDATION_ISSUES = [
  {
    pattern:
      /\b(email|password|phone|name|address|zip|postal|code|username|url)\b.*?(validate|validation|valid|invalid|pattern|regex|match|test)/i,
    message: 'Contains field validation that might need ValidationService',
    severity: 'medium',
  },
  {
    pattern: /\.test\(\s*\/[^/]+\/\s*\)/,
    message: 'Using regex test() directly instead of ValidationService',
    severity: 'high',
  },
  {
    pattern: /\.match\(\s*\/[^/]+\/\s*\)/,
    message: 'Using regex match() directly instead of ValidationService',
    severity: 'high',
  },
  {
    pattern: /new RegExp\(/,
    message: 'Creating RegExp directly instead of using ValidationService',
    severity: 'high',
  },
  {
    pattern:
      /\.(substring|substr|slice|trim|replace|replaceAll|padStart|padEnd|toLowerCase|toUpperCase)\(/,
    message: 'String manipulation that might need FormatterService',
    severity: 'low',
  },
  {
    pattern: /\b(validation|validator|validate|validateField|isValid)\s*=\s*function|=>\s*{/,
    message: 'Custom validation function that might duplicate ValidationService functionality',
    severity: 'medium',
  },
]

// Check a file for validation issues
async function checkFile(filePath: string): Promise<any> {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8')
    const issues: any[] = []

    // Check if the file uses validation imports
    const usesValidationImport = content.includes('@/lib/validation')
    const usesValidationService = content.includes('ValidationService')
    const usesFormatterService = content.includes('FormatterService')

    // Check for validation issues
    for (const issue of VALIDATION_ISSUES) {
      const matches = content.match(issue.pattern)
      if (matches) {
        // Extract lines where issues were found
        for (const match of matches) {
          const lines = content.split('\n')
          const lineIndex = lines.findIndex(line => line.includes(match))

          if (lineIndex >= 0) {
            issues.push({
              pattern: issue.pattern.toString(),
              message: issue.message,
              severity: issue.severity,
              line: lineIndex + 1,
              content: lines[lineIndex].trim(),
              suggestion: getSuggestion(match, issue, usesValidationService, usesFormatterService),
            })
          }
        }
      }
    }

    return {
      path: filePath,
      usesValidationImport,
      usesValidationService,
      usesFormatterService,
      issueCount: issues.length,
      issues,
      suggestedFix:
        issues.length > 0 && !usesValidationImport
          ? `import { ValidationService, FormatterService } from "@/lib/validation";`
          : null,
    }
  } catch (error) {
    return {
      path: filePath,
      error: `Error checking file: ${(error as Error).message}`,
    }
  }
}

// Generate a suggestion based on the issue
function getSuggestion(
  match: string,
  issue: any,
  usesValidationService: boolean,
  usesFormatterService: boolean,
): string {
  if (match.includes('.test(')) {
    return `Use ValidationService.createValidator() or a specific validator from @/lib/validation instead of regex tests`
  } else if (match.includes('.match(')) {
    return `Use ValidationService.createValidator() or a specific validator from @/lib/validation instead of regex matching`
  } else if (match.includes('trim') || match.includes('replace') || match.includes('substring')) {
    return `Consider using FormatterService.formatValue() for consistent string formatting`
  } else {
    return `Consider using the appropriate method from ${usesValidationService ? '' : 'ValidationService or '}${usesFormatterService ? '' : 'FormatterService '}instead`
  }
}

export async function runValidationCheckerTool(args: z.infer<typeof ValidationCheckerToolSchema>) {
  const projectRoot = path.join(process.cwd(), '..')
  const target = args.target || 'src/components'
  const fix = args.fix || false

  try {
    const targetPath = path.join(projectRoot, target)

    // Check if target is a directory or file
    const isDirectory = fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()

    let files: string[] = []
    if (isDirectory) {
      // Get all relevant files in the directory
      files = globSync(`${targetPath}/**/*.{tsx,jsx,ts,js}`, { absolute: true })
    } else {
      // Single file
      if (fs.existsSync(targetPath)) {
        files = [targetPath]
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `Target not found: ${target}`,
            },
          ],
        }
      }
    }

    // Check each file
    const results = await Promise.all(files.map(file => checkFile(file)))

    // Filter out files with no issues
    const filesWithIssues = results.filter(result => result.issueCount > 0)
    const totalIssues = filesWithIssues.reduce((total, file) => total + file.issueCount, 0)

    // Sort by issue count
    filesWithIssues.sort((a, b) => b.issueCount - a.issueCount)

    const summary = {
      filesScanned: files.length,
      filesWithIssues: filesWithIssues.length,
      totalIssues,
      highSeverityIssues: filesWithIssues.reduce((count, file) => {
        return count + file.issues.filter((issue: any) => issue.severity === 'high').length
      }, 0),
      mostProblematicFiles: filesWithIssues.slice(0, 5).map(file => ({
        path: path.relative(projectRoot, file.path),
        issueCount: file.issueCount,
      })),
      detail: filesWithIssues.map(file => ({
        path: path.relative(projectRoot, file.path),
        issues: file.issues,
        suggestedFix: file.suggestedFix,
      })),
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(summary, null, 2),
        },
      ],
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error scanning for validation issues: ${error.message || error}`,
        },
      ],
    }
  }
}

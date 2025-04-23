import bodyParser from 'body-parser'
import cors from 'cors'
import express, { Request, Response } from 'express'
import { z } from 'zod'
import {
  architectToolDescription,
  architectToolName,
  ArchitectToolSchema,
  runArchitectTool,
} from './tools/architect'
import {
  codeReviewToolDescription,
  codeReviewToolName,
  CodeReviewToolSchema,
  runCodeReviewTool,
} from './tools/codeReview'
import {
  documentationHelperToolDescription,
  documentationHelperToolName,
  DocumentationHelperToolSchema,
  runDocumentationHelperTool,
} from './tools/documentationHelper'
import {
  fileAnalyzerToolDescription,
  fileAnalyzerToolName,
  FileAnalyzerToolSchema,
  runFileAnalyzerTool,
} from './tools/fileAnalyzer'
import {
  projectStructureToolDescription,
  projectStructureToolName,
  ProjectStructureToolSchema,
  runProjectStructureTool,
} from './tools/projectStructure'
import {
  runScreenshotTool,
  screenshotToolDescription,
  screenshotToolName,
  ScreenshotToolSchema,
} from './tools/screenshot'
import {
  runValidationSystemTool,
  validationSystemToolDescription,
  validationSystemToolName,
  ValidationSystemToolSchema,
} from './tools/validationSystem'

const app = express()
const port = 3130

app.use(cors())
app.use(bodyParser.json())

// Define the response structure for a tool
interface ToolResponse {
  name: string
  description: string
  schema?: Record<string, any>
}

// Define the basic request structure for invoking a tool
const InvokeToolRequestSchema = z.object({
  name: z.string(),
  arguments: z.record(z.any()).optional(),
})

/**
 * A simple endpoint to check if the server is running
 */
app.get('/', (req: Request, res: Response) => {
  res.send('MCP Server is running!')
})

/**
 * List available tools
 *
 * Available tools:
 * - projectStructure: Analyzes the project structure and returns a representation of it
 * - validationSystem: Analyzes the validation and formatting system
 * - fileAnalyzer: Analyzes specific files to extract insights about their structure and patterns
 * - screenshot: Takes a screenshot of a URL or local path
 * - architect: Provides architecture recommendations for a given task and code
 * - codeReview: Reviews code changes against main branch
 * - documentationHelper: Searches through project documentation to find relevant information
 */
app.get('/tools', (req: Request, res: Response) => {
  const tools: ToolResponse[] = [
    {
      name: projectStructureToolName,
      description: projectStructureToolDescription,
      schema: ProjectStructureToolSchema.shape,
    },
    {
      name: validationSystemToolName,
      description: validationSystemToolDescription,
      schema: ValidationSystemToolSchema.shape,
    },
    {
      name: fileAnalyzerToolName,
      description: fileAnalyzerToolDescription,
      schema: FileAnalyzerToolSchema.shape,
    },
    {
      name: screenshotToolName,
      description: screenshotToolDescription,
      schema: ScreenshotToolSchema.shape,
    },
    {
      name: architectToolName,
      description: architectToolDescription,
      schema: ArchitectToolSchema.shape,
    },
    {
      name: codeReviewToolName,
      description: codeReviewToolDescription,
      schema: CodeReviewToolSchema.shape,
    },
    {
      name: documentationHelperToolName,
      description: documentationHelperToolDescription,
      schema: DocumentationHelperToolSchema.shape,
    },
  ]

  res.json(tools)
})

/**
 * Invoke a tool with the provided arguments
 */
app.post('/invoke', async (req: Request, res: Response) => {
  try {
    const parseResult = InvokeToolRequestSchema.safeParse(req.body)

    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid request format',
        details: parseResult.error.format(),
      })
    }

    const { name, arguments: args = {} } = parseResult.data

    // Handle different tools
    switch (name) {
      case projectStructureToolName:
        return res.json(await runProjectStructureTool(args))
      case validationSystemToolName:
        return res.json(await runValidationSystemTool(args))
      case fileAnalyzerToolName:
        return res.json(await runFileAnalyzerTool(args))
      case screenshotToolName:
        return res.json(await runScreenshotTool(args))
      case architectToolName:
        return res.json(await runArchitectTool(args))
      case codeReviewToolName:
        return res.json(await runCodeReviewTool(args))
      case documentationHelperToolName:
        return res.json(await runDocumentationHelperTool(args))
      default:
        return res.status(404).json({
          error: `Tool '${name}' not found`,
        })
    }
  } catch (error) {
    console.error('Error invoking tool:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error),
    })
  }
})

app.listen(port, () => {
  console.log(`MCP Server is running at http://localhost:${port}`)
})

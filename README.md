# Project Awareness MCP Server

This is a custom Model Context Protocol (MCP) server for Cursor that provides enhanced awareness of the project structure and its validation/formatting system.

## Features

### Project Structure Tool

Analyzes the project structure and returns a representation of it.

```json
{
  "rootDir": "/path/to/project",
  "depth": 5,
  "includeDirs": ["src", "components"],
  "excludeDirs": ["node_modules", ".git"]
}
```

### Validation System Tool

Analyzes the validation and formatting system, providing details about its structure and capabilities.

```json
{
  "action": "overview"
}
```

Possible actions:

- `overview` - Provides a high-level overview of the validation system
- `details` - Provides detailed information about the ValidationService and FormatterService
- `schemas` - Lists all available validation schemas
- `formatters` - Lists all formatters
- `validators` - Lists all validators

You can also specify a particular file to examine:

```json
{
  "specificFile": "ValidationService.ts"
}
```

### File Analyzer Tool

Analyzes specific files in the project to extract insights about their structure and patterns.

```json
{
  "filePath": "src/components/SomeComponent.tsx",
  "analysis": "validation"
}
```

Possible analysis types:

- `basic` - Basic file analysis with validation detection
- `validation` - Focused validation analysis
- `imports` - Analysis of imports
- `exports` - Analysis of exports
- `dependencies` - Analysis of dependencies and validation usage

### Validation Checker Tool

Scans components for validation rule compliance and suggests improvements.

```json
{
  "target": "src/components/forms",
  "fix": true
}
```

This tool helps identify files that:

- May need to use ValidationService but don't
- Are using direct regex tests instead of ValidationService
- Contain string manipulation that should use FormatterService
- Have custom validation functions that might duplicate existing validators

### Component Generator Tool

Generates React components with proper validation patterns for forms and inputs.

```json
{
  "name": "ContactForm",
  "type": "form",
  "description": "A form for collecting contact information",
  "fields": [
    {
      "name": "name",
      "type": "string",
      "validations": ["required", "minLength:2"]
    },
    {
      "name": "email",
      "type": "string",
      "validations": ["required", "email"]
    },
    {
      "name": "phone",
      "type": "string",
      "validations": ["phone"],
      "formatting": "phone"
    }
  ]
}
```

This tool will generate a component that:

- Uses ValidationService for all validations
- Uses FormatterService for formatting
- Follows project conventions and best practices
- Properly structures the form with error handling

## Additional Tools

### Screenshot Tool

Takes screenshots of web pages (from the original example).

### Architect Tool

Analyzes code and tasks to provide architectural guidance (from the original example).

### Code Review Tool

Reviews code changes (from the original example).

## Setup

1. Make sure your `.cursor/mcp.json` file contains:

```json
{
  "mcpServers": {
    "project-awareness": {
      "command": "node",
      "args": ["/absolute/path/to/secure-wire-synchronize/cursor-mcp/build/index.js"],
      "env": {
        "OPENAI_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

2. Restart Cursor or refresh the MCP servers

## Using the Tools

In the Cursor Chat/Composer, you can explicitly ask for the tools:

- "Can you analyze the structure of this project?"
- "Give me an overview of our validation system"
- "Analyze the validation patterns in src/components/SomeForm.tsx"
- "Check if our components properly use ValidationService"
- "Generate a contact form component with name, email, and phone fields"

Or just ask questions, and Cursor will use the appropriate tools:

- "How does our validation system work?"
- "What validation schemas do we have?"
- "Does this component follow our validation standards?"
- "Create a new form component for collecting payment information"

## 🚀 Getting Started

### 1. Environment Setup

First, you'll need to set up your environment variables. Create a file at `src/env/keys.ts`:

```typescript
export const OPENAI_API_KEY = 'your_key_here'
// Add any other keys you need
```

> ⚠️ **Security Note**: Storing API keys directly in source code is not recommended for production environments. This is only for local development and learning purposes. You can set the env var inline in the Cursor MCP interface as well.

### 2. Installation

```bash
npm install
# or
yarn install
```

### 3. Build the Server

```bash
npm run build
```

### 4. Adding to Cursor

This project is designed to be used as an MCP server in Cursor. Here's how to set it up:

1. Open Cursor
2. Go to `Cursor Settings > Features > MCP`
3. Click `+ Add New MCP Server`
4. Fill out the form:
   - **Name**: AI Development Assistant
   - **Type**: stdio
   - **Command**: `node /path/to/your/project/dist/index.js`

> 📘 **Pro Tip**: You might need to use the full path to your project's built index.js file.

After adding the server, you should see your tools listed under "Available Tools". If not, try clicking the refresh button in the top right corner of the MCP server section.

For more details about MCP setup, check out the [Cursor MCP Documentation](https://docs.cursor.com/advanced/model-context-protocol).

## 🛠️ Using the Tools

Once configured, you can use these tools directly in Cursor's Composer. The AI will automatically suggest using relevant tools, or you can explicitly request them by name or description.

For example, try typing in Composer:

- "Review this code for best practices"
- "Help me architect a new feature"
- "Analyze this UI screenshot"

The agent will ask for your approval before making any tool calls.

> 📘 **Pro Tip**: You can update your .cursorrules file with instructions on how to use the tools for certain scenarios, and the agent will use the tools automatically.

## 📁 Project Structure

```
src/
├── tools/
│   ├── architect.ts    # Code structure generator
│   ├── screenshot.ts   # Screenshot analysis tool
│   └── codeReview.ts   # Code review tool
├── env/
│   └── keys.ts         # Environment configuration (add your API keys here!)
└── index.ts           # Main entry point
```

## 🤝 Contributing

Contributions welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Issues & Support

Found a bug or need help? Open an issue with:

1. What you were trying to do
2. What happened instead
3. Steps to reproduce
4. Your environment details

---

I'll be honest though, this is a tutorial demo, and not a production-ready tool so I likely won't be fixing issues. But feel free to fork it and make it your own!

Made with ❤️ by developers, for developers

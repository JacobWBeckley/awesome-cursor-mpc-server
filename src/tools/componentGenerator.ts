import fs from 'fs'
import OpenAI from 'openai'
import path from 'path'
import { z } from 'zod'
import { OPENAI_API_KEY } from '../env/keys.js'

/**
 * Component Generator tool
 *   - Creates React components that follow validation patterns
 *   - Uses OpenAI to intelligently generate code with proper validation
 */

export const componentGeneratorToolName = 'componentGenerator'
export const componentGeneratorToolDescription =
  'Generates React components with proper validation patterns for forms and inputs.'

export const ComponentGeneratorToolSchema = z.object({
  name: z.string(), // Component name
  type: z.enum(['form', 'field', 'display', 'page', 'layout']),
  description: z.string(), // Brief description of what the component should do
  fields: z
    .array(
      z.object({
        name: z.string(),
        type: z.string(),
        validations: z.array(z.string()).optional(),
        formatting: z.string().optional(),
      }),
    )
    .optional(),
  outputDir: z.string().optional(), // Where to output the file
})

// Validates a component name
function validateComponentName(name: string): string {
  // Convert to PascalCase if not already
  if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
    const pascalCase = name
      .split(/[-_\s]+/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('')
    return pascalCase
  }
  return name
}

// Load template for form components
async function loadTemplate(type: string): Promise<string> {
  try {
    const templatePath = path.join(process.cwd(), `src/templates/${type}.tsx`)
    if (fs.existsSync(templatePath)) {
      return await fs.promises.readFile(templatePath, 'utf-8')
    }

    // If template doesn't exist, use hardcoded basic templates
    switch (type) {
      case 'form':
        return `import React from 'react';
import { ValidationService, FormatterService } from '@/lib/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

// Define the form schema using zod
const formSchema = z.object({
  // FIELDS_SCHEMA
});

// Define component props
interface COMPONENT_NAMEProps {
  onSubmit: (data: z.infer<typeof formSchema>) => void;
  defaultValues?: Partial<z.infer<typeof formSchema>>;
}

export function COMPONENT_NAME({ onSubmit, defaultValues = {} }: COMPONENT_NAMEProps) {
  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      // FIELDS_DEFAULT_VALUES
      ...defaultValues,
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* FORM_FIELDS */}

        <Button type="submit" className="w-full">Submit</Button>
      </form>
    </Form>
  );}`

      case 'field':
        return `import React from 'react';
import { ValidationService, FormatterService } from '@/lib/validation';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

// Define component props
interface COMPONENT_NAMEProps {
  form: any;
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export function COMPONENT_NAME({
  form,
  name,
  label,
  placeholder = "",
  required = false,
  disabled = false
}: COMPONENT_NAMEProps) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}{required && <span className="text-destructive"> *</span>}</FormLabel>
          <FormControl>
            <Input
              {...field}
              placeholder={placeholder}
              value={FormatterService.formatValue(field.value, "FORMATTING_TYPE")}
              onChange={(e) => {
                field.onChange(e.target.value);
              }}
              disabled={disabled}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );}`

      default:
        return `import React from 'react';

interface COMPONENT_NAMEProps {
  // Props go here
}

export function COMPONENT_NAME({ }: COMPONENT_NAMEProps) {
  return (
    <div>
      {/* Component content */}
    </div>
  );}`
    }
  } catch (error) {
    console.error('Error loading template:', error)
    return ''
  }
}

// Generate code for the component using OpenAI's assistance
async function generateComponentCode(
  args: z.infer<typeof ComponentGeneratorToolSchema>,
): Promise<string> {
  try {
    // Try to use template first
    const templateCode = await loadTemplate(args.type)
    if (templateCode && !OPENAI_API_KEY) {
      // Basic template replacement without AI
      let code = templateCode.replace(/COMPONENT_NAME/g, args.name)

      // Handle fields
      if (args.fields && args.fields.length > 0) {
        let fieldsSchema = ''
        let fieldsDefaultValues = ''
        let formFields = ''

        args.fields.forEach(field => {
          // Add to schema
          fieldsSchema += `  ${field.name}: z.string()`
          if ((field.validations || []).includes('required')) {
            fieldsSchema += `.min(1, "${field.name} is required")`
          }
          fieldsSchema += ',\n'

          // Add default value
          fieldsDefaultValues += `      ${field.name}: "",\n`

          // Add form field
          formFields += `        <FormField
          control={form.control}
          name="${field.name}"
          render={({ field }) => (
            <FormItem>
              <FormLabel>${field.name.charAt(0).toUpperCase() + field.name.slice(1)}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />\n`
        })

        code = code.replace('  // FIELDS_SCHEMA', fieldsSchema)
        code = code.replace('      // FIELDS_DEFAULT_VALUES', fieldsDefaultValues)
        code = code.replace('        {/* FORM_FIELDS */}', formFields)
      }

      return code
    }

    // If OpenAI is available, use AI to generate better code
    if (OPENAI_API_KEY) {
      const openai = new OpenAI({
        apiKey: OPENAI_API_KEY,
      })

      // Prepare field descriptions for the prompt
      const fieldDescriptions = args.fields
        ? args.fields
            .map(field => {
              const validations = field.validations
                ? `Validations: ${field.validations.join(', ')}`
                : ''
              const formatting = field.formatting ? `Formatting: ${field.formatting}` : ''
              return `- ${field.name} (${field.type}) ${validations} ${formatting}`
            })
            .join('\n')
        : 'No specific fields defined.'

      const systemPrompt = `You are an expert React developer with a focus on validation and form handling.
You're generating a ${args.type} component named ${args.name} with proper validation using the project's ValidationService and FormatterService from @/lib/validation.

Always follow these rules:
1. Use the ValidationService for all field validations
2. Use the FormatterService for all value formatting
3. Follow modern React patterns with TypeScript
4. Use shadcn/ui components
5. For forms, use react-hook-form with zod validation
6. Make the code clean, professional, and well-documented
7. Return ONLY the component code with no explanations or markdown`

      const userPrompt = `Generate a ${args.type} component named ${args.name}.

Description: ${args.description}

Fields:
${fieldDescriptions}

The component should use proper validation and formatting from the central ValidationService and FormatterService.`

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 1500,
      })

      return response.choices[0].message.content || templateCode
    }

    return templateCode
  } catch (error) {
    console.error('Error generating component:', error)
    return ''
  }
}

export async function runComponentGeneratorTool(
  args: z.infer<typeof ComponentGeneratorToolSchema>,
) {
  try {
    // Validate component name
    const componentName = validateComponentName(args.name)

    // Determine output directory
    const projectRoot = path.join(process.cwd(), '..')
    const outputDir =
      args.outputDir ||
      (args.type === 'page'
        ? 'src/pages'
        : args.type === 'form'
          ? 'src/components/forms'
          : args.type === 'field'
            ? 'src/components/fields'
            : args.type === 'layout'
              ? 'src/components/layouts'
              : 'src/components')

    const fullOutputDir = path.join(projectRoot, outputDir)

    // Ensure output directory exists
    if (!fs.existsSync(fullOutputDir)) {
      fs.mkdirSync(fullOutputDir, { recursive: true })
    }

    // Generate component
    const componentCode = await generateComponentCode({
      ...args,
      name: componentName,
    })

    // Determine file path
    const filePath = path.join(fullOutputDir, `${componentName}.tsx`)

    // Check if file already exists
    if (fs.existsSync(filePath)) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                error: `Component ${componentName}.tsx already exists at ${outputDir}`,
                generatedCode: componentCode,
              },
              null,
              2,
            ),
          },
        ],
      }
    }

    // Write file
    await fs.promises.writeFile(filePath, componentCode)

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              message: `Component ${componentName}.tsx created at ${outputDir}/${componentName}.tsx`,
              componentName,
              filePath: `${outputDir}/${componentName}.tsx`,
              componentCode,
            },
            null,
            2,
          ),
        },
      ],
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error generating component: ${error.message || error}`,
        },
      ],
    }
  }
}

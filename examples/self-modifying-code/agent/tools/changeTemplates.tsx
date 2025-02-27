import fs from "fs/promises";
import path from "path";

import { GSXTool } from "@gensx/anthropic";
import { serializeError } from "serialize-error";
import { z } from "zod";

import { fileCache } from "./cacheManager.js";

// Define the schema for the change templates tool
const changeTemplatesSchema = z.object({
  action: z
    .enum(["list", "apply", "create", "learn"])
    .describe(
      "The action to perform. Options: list (show available templates), apply (use a template), create (create a new template), learn (generate template from changes)",
    ),
  template: z
    .string()
    .optional()
    .describe("The template name to apply or create"),
  path: z
    .string()
    .optional()
    .describe("Path to the file or directory to apply the template to"),
  parameters: z
    .record(z.string(), z.string())
    .optional()
    .describe("Parameters to customize the template"),
  content: z
    .string()
    .optional()
    .describe("Template content when creating a new template"),
  description: z
    .string()
    .optional()
    .describe("Description of the template when creating a new template"),
  changes: z
    .array(
      z.object({
        file: z.string(),
        before: z.string(),
        after: z.string(),
      })
    )
    .optional()
    .describe("Changes to learn from when creating a template"),
});

type ChangeTemplatesParams = z.infer<typeof changeTemplatesSchema>;

// Template interface
interface Template {
  name: string;
  description: string;
  content: string;
  parameters: string[];
  created: string;
  lastUsed?: string;
  useCount: number;
}

// Get the templates directory path
async function getTemplatesDir(): Promise<string> {
  // Create templates directory in the agent's directory
  const templatesDir = path.resolve(process.cwd(), "agent", "templates");
  
  try {
    await fs.mkdir(templatesDir, { recursive: true });
  } catch (error) {
    console.error("Error creating templates directory:", error);
  }
  
  return templatesDir;
}

// Load all available templates
async function loadTemplates(): Promise<Template[]> {
  const templatesDir = await getTemplatesDir();
  const templates: Template[] = [];
  
  try {
    const files = await fs.readdir(templatesDir);
    
    for (const file of files) {
      if (file.endsWith(".json")) {
        try {
          const content = await fs.readFile(path.join(templatesDir, file), "utf-8");
          templates.push(JSON.parse(content));
        } catch (error) {
          console.error(`Error loading template ${file}:`, error);
        }
      }
    }
  } catch (error) {
    console.error("Error reading templates directory:", error);
  }
  
  return templates;
}

// Save a template
async function saveTemplate(template: Template): Promise<void> {
  const templatesDir = await getTemplatesDir();
  const filePath = path.join(templatesDir, `${template.name}.json`);
  
  await fs.writeFile(filePath, JSON.stringify(template, null, 2), "utf-8");
}

// Apply a template to a file
async function applyTemplate(
  templateName: string,
  filePath: string,
  parameters: Record<string, string> = {}
): Promise<{ success: boolean; message: string; result?: string }> {
  // Load all templates
  const templates = await loadTemplates();
  
  // Find the requested template
  const template = templates.find(t => t.name === templateName);
  if (!template) {
    return {
      success: false,
      message: `Template '${templateName}' not found.`,
    };
  }
  
  // Check if all required parameters are provided
  const missingParams = template.parameters.filter(param => !(param in parameters));
  if (missingParams.length > 0) {
    return {
      success: false,
      message: `Missing required parameters: ${missingParams.join(", ")}`,
    };
  }
  
  try {
    // Read the target file
    let fileContent: string;
    if (fileCache.has(filePath)) {
      fileContent = fileCache.get(filePath)!;
    } else {
      fileContent = await fs.readFile(filePath, "utf-8");
      fileCache.set(filePath, fileContent);
    }
    
    // Apply the template
    let result = template.content;
    
    // Replace template parameters
    for (const [param, value] of Object.entries(parameters)) {
      result = result.replace(new RegExp(`\\{\\{${param}\\}\\}`, "g"), value);
    }
    
    // Update the file
    await fs.writeFile(filePath, result, "utf-8");
    
    // Invalidate cache
    fileCache.set(filePath, result);
    
    // Update template usage stats
    template.lastUsed = new Date().toISOString();
    template.useCount += 1;
    await saveTemplate(template);
    
    return {
      success: true,
      message: `Successfully applied template '${templateName}' to ${filePath}`,
      result,
    };
  } catch (error) {
    return {
      success: false,
      message: `Error applying template: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// Create a new template
async function createTemplate(
  name: string,
  content: string,
  description: string,
  parameters: string[] = []
): Promise<{ success: boolean; message: string; template?: Template }> {
  // Validate template name
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    return {
      success: false,
      message: "Template name must contain only letters, numbers, underscores, and hyphens.",
    };
  }
  
  // Check if template already exists
  const templates = await loadTemplates();
  if (templates.find(t => t.name === name)) {
    return {
      success: false,
      message: `Template '${name}' already exists.`,
    };
  }
  
  // Create the template
  const template: Template = {
    name,
    description,
    content,
    parameters,
    created: new Date().toISOString(),
    useCount: 0,
  };
  
  // Save the template
  await saveTemplate(template);
  
  return {
    success: true,
    message: `Successfully created template '${name}'.`,
    template,
  };
}

// Learn a template from code changes
async function learnTemplate(
  name: string,
  description: string,
  changes: { file: string; before: string; after: string }[]
): Promise<{ success: boolean; message: string; template?: Template }> {
  if (changes.length === 0) {
    return {
      success: false,
      message: "No changes provided to learn from.",
    };
  }
  
  // Focus on the first change for simplicity
  const change = changes[0];
  
  // Identify potential parameters by looking for patterns
  const parameterPatterns: [RegExp, string][] = [
    [/\b[A-Z][a-zA-Z0-9]*Component\b/g, "ComponentName"],
    [/\bfunction\s+([a-zA-Z0-9_]+)/g, "FunctionName"],
    [/\bconst\s+([a-zA-Z0-9_]+)\s*=/g, "VariableName"],
    [/\binterface\s+([a-zA-Z0-9_]+)/g, "InterfaceName"],
    [/\btype\s+([a-zA-Z0-9_]+)/g, "TypeName"],
    [/['"]([^'"]+\.(?:ts|tsx|js|jsx))['"]]/g, "FilePath"],
  ];
  
  let templateContent = change.after;
  const detectedParameters: string[] = [];
  
  // Extract parameters and replace values in the template
  for (const [pattern, paramName] of parameterPatterns) {
    const beforeMatches = Array.from(change.before.matchAll(pattern));
    const afterMatches = Array.from(change.after.matchAll(pattern));
    
    // If we find matches in both before and after, consider them as parameters
    if (beforeMatches.length > 0 && afterMatches.length > 0) {
      for (let i = 0; i < afterMatches.length; i++) {
        const afterMatch = afterMatches[i];
        const paramValue = afterMatch[1];
        const paramId = `${paramName}${i > 0 ? i + 1 : ""}`;
        
        if (!detectedParameters.includes(paramId)) {
          detectedParameters.push(paramId);
          templateContent = templateContent.replace(
            new RegExp(paramValue, "g"),
            `{{${paramId}}}`
          );
        }
      }
    }
  }
  
  // Create the template
  return createTemplate(name, templateContent, description, detectedParameters);
}

export const changeTemplates = new GSXTool<typeof changeTemplatesSchema>({
  name: "changeTemplates",
  description: `Tool for managing and applying code change templates.
  
Actions:
* list: Show available templates
  - Returns a list of templates with descriptions and usage information
* apply: Apply a template to a file
  - Applies a template with customization parameters
* create: Create a new template
  - Creates a reusable template from provided content
* learn: Generate a template from code changes
  - Analyzes changes to create a parameterized template`,
  schema: changeTemplatesSchema,
  run: async (params: ChangeTemplatesParams) => {
    console.log("📋 Calling the ChangeTemplates:", params);
    
    try {
      switch (params.action) {
        case "list": {
          const templates = await loadTemplates();
          return {
            count: templates.length,
            templates: templates.map(t => ({
              name: t.name,
              description: t.description,
              parameters: t.parameters,
              created: t.created,
              lastUsed: t.lastUsed,
              useCount: t.useCount,
            })),
          };
        }
        
        case "apply": {
          if (!params.template) {
            throw new Error("template is required for apply action");
          }
          
          if (!params.path) {
            throw new Error("path is required for apply action");
          }
          
          const result = await applyTemplate(
            params.template,
            params.path,
            params.parameters || {}
          );
          return result;
        }
        
        case "create": {
          if (!params.template) {
            throw new Error("template is required for create action");
          }
          
          if (!params.content) {
            throw new Error("content is required for create action");
          }
          
          if (!params.description) {
            throw new Error("description is required for create action");
          }
          
          const parameters = params.parameters
            ? Object.keys(params.parameters)
            : [];
          
          const result = await createTemplate(
            params.template,
            params.content,
            params.description,
            parameters
          );
          return result;
        }
        
        case "learn": {
          if (!params.template) {
            throw new Error("template is required for learn action");
          }
          
          if (!params.description) {
            throw new Error("description is required for learn action");
          }
          
          if (!params.changes || params.changes.length === 0) {
            throw new Error("changes are required for learn action");
          }
          
          const result = await learnTemplate(
            params.template,
            params.description,
            params.changes
          );
          return result;
        }
        
        default:
          throw new Error(`Unknown action: ${String(params.action)}`);
      }
    } catch (error) {
      return {
        success: false,
        output: serializeError(error),
      };
    }
  },
});
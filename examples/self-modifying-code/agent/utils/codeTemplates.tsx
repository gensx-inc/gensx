/**
 * Code templating system for generating consistent code structures
 * Provides templates for common patterns used in the project
 */

// Template variable pattern: {{variableName}}
const TEMPLATE_VARIABLE_REGEX = /\{\{([^}]+)\}\}/g;

// Basic types for the templating system
export interface TemplateVariable {
  name: string;
  description: string;
  required: boolean;
  defaultValue?: string;
}

export interface CodeTemplate {
  name: string;
  description: string;
  variables: TemplateVariable[];
  template: string;
}

// Collection of code templates
const templates: Record<string, CodeTemplate> = {
  // Component template
  component: {
    name: "component",
    description: "React component template with TypeScript props",
    variables: [
      {
        name: "componentName",
        description: "Name of the component",
        required: true,
      },
      {
        name: "propsInterface",
        description: "Props interface definition",
        required: false,
        defaultValue: "{}",
      },
      {
        name: "returnType",
        description: "Return type of the component",
        required: false,
        defaultValue: "JSX.Element",
      },
      {
        name: "imports",
        description: "Import statements",
        required: false,
        defaultValue: "import { gsx } from \"gensx\";",
      },
    ],
    template: `{{imports}}

interface {{componentName}}Props {{propsInterface}}

export const {{componentName}} = gsx.Component<{{componentName}}Props, {{returnType}}>(
  "{{componentName}}",
  (props) => {
    // Component implementation
    return (
      <div>
        {/* Component content */}
      </div>
    );
  }
);
`,
  },

  // Tool implementation template
  tool: {
    name: "tool",
    description: "GSX Tool implementation template",
    variables: [
      {
        name: "toolName",
        description: "Name of the tool",
        required: true,
      },
      {
        name: "toolDescription",
        description: "Description of the tool's functionality",
        required: true,
      },
      {
        name: "schemaProperties",
        description: "Zod schema properties",
        required: false,
        defaultValue: "{}",
      },
    ],
    template: `import { GSXTool } from "@gensx/anthropic";
import { z } from "zod";

// Define the schema
const {{toolName}}Schema = z.object({{schemaProperties}});

type {{toolName}}Params = z.infer<typeof {{toolName}}Schema>;

export const {{toolName}} = new GSXTool<typeof {{toolName}}Schema>({
  name: "{{toolName}}",
  description: "{{toolDescription}}",
  schema: {{toolName}}Schema,
  run: async (params: {{toolName}}Params) => {
    try {
      // Tool implementation
      console.log("Running {{toolName}} with params:", params);
      
      // Return the result
      return "Tool execution completed successfully";
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(\`{{toolName}} failed: \${errorMessage}\`);
    }
  },
});
`,
  },

  // Test file template
  test: {
    name: "test",
    description: "Test file template",
    variables: [
      {
        name: "testName",
        description: "Name of the test suite",
        required: true,
      },
      {
        name: "imports",
        description: "Import statements",
        required: true,
      },
      {
        name: "testCases",
        description: "Test case descriptions",
        required: false,
        defaultValue: "['should work correctly']",
      },
    ],
    template: `{{imports}}

describe('{{testName}}', () => {
  {{#each testCases}}
  it('{{this}}', () => {
    // Test implementation
    expect(true).toBe(true);
  });
  {{/each}}
});
`,
  },

  // Utility function template
  utilityFunction: {
    name: "utilityFunction",
    description: "Utility function template with TypeScript",
    variables: [
      {
        name: "functionName",
        description: "Name of the function",
        required: true,
      },
      {
        name: "params",
        description: "Function parameters with types",
        required: false,
        defaultValue: "",
      },
      {
        name: "returnType",
        description: "Return type of the function",
        required: true,
      },
      {
        name: "functionBody",
        description: "Function implementation",
        required: true,
      },
    ],
    template: `/**
 * {{functionName}} - Utility function
 */
export function {{functionName}}({{params}}): {{returnType}} {
  {{functionBody}}
}
`,
  },

  // Interface definition template
  interface: {
    name: "interface",
    description: "TypeScript interface definition",
    variables: [
      {
        name: "interfaceName",
        description: "Name of the interface",
        required: true,
      },
      {
        name: "properties",
        description: "Interface properties with types",
        required: true,
      },
      {
        name: "extends",
        description: "Interface extension",
        required: false,
        defaultValue: "",
      },
    ],
    template: `/**
 * {{interfaceName}} - Interface definition
 */
export interface {{interfaceName}}{{#if extends}} extends {{extends}}{{/if}} {
  {{properties}}
}
`,
  },

  // Hook template
  hook: {
    name: "hook",
    description: "React hook template",
    variables: [
      {
        name: "hookName",
        description: "Name of the hook",
        required: true,
      },
      {
        name: "params",
        description: "Hook parameters with types",
        required: false,
        defaultValue: "",
      },
      {
        name: "returnType",
        description: "Return type of the hook",
        required: true,
      },
      {
        name: "hookBody",
        description: "Hook implementation",
        required: true,
      },
    ],
    template: `import { gsx } from "gensx";

/**
 * {{hookName}} - Custom hook
 */
export function {{hookName}}({{params}}): {{returnType}} {
  {{hookBody}}
}
`,
  },

  // API service template
  apiService: {
    name: "apiService",
    description: "API service module template",
    variables: [
      {
        name: "serviceName",
        description: "Name of the service",
        required: true,
      },
      {
        name: "methods",
        description: "Service methods",
        required: true,
      },
    ],
    template: `/**
 * {{serviceName}} - API service for interacting with external services
 */
export const {{serviceName}} = {
  {{methods}}
};
`,
  },
};

/**
 * Get a template by name
 * @param templateName Name of the template to retrieve
 * @returns The requested template or undefined if not found
 */
export function getTemplate(templateName: string): CodeTemplate | undefined {
  return templates[templateName];
}

/**
 * List all available templates
 * @returns Array of template names and descriptions
 */
export function listTemplates(): { name: string; description: string }[] {
  return Object.values(templates).map(template => ({
    name: template.name,
    description: template.description,
  }));
}

/**
 * Apply a template with the provided variables
 * @param templateName Name of the template to use
 * @param variables Object containing variable values
 * @returns Generated code string
 */
export function applyTemplate(
  templateName: string,
  variables: Record<string, string>
): string {
  const template = templates[templateName];
  
  if (!template) {
    throw new Error(`Template '${templateName}' not found`);
  }
  
  // Check for required variables
  for (const variable of template.variables) {
    if (variable.required && !variables[variable.name]) {
      if (variable.defaultValue !== undefined) {
        variables[variable.name] = variable.defaultValue;
      } else {
        throw new Error(`Required variable '${variable.name}' is missing for template '${templateName}'`);
      }
    }
  }
  
  // Apply default values for missing optional variables
  for (const variable of template.variables) {
    if (!variables[variable.name] && variable.defaultValue !== undefined) {
      variables[variable.name] = variable.defaultValue;
    }
  }
  
  // Replace template variables with values
  let result = template.template;
  
  // Handle simple variable replacements
  result = result.replace(TEMPLATE_VARIABLE_REGEX, (match, variableName) => {
    return variables[variableName] || match;
  });
  
  // Handle #each blocks (simplified implementation)
  const eachRegex = /\{\{#each ([^}]+)\}\}([\s\S]+?)\{\{\/each\}\}/g;
  result = result.replace(eachRegex, (match, arrayName, content) => {
    const arrayValue = variables[arrayName];
    if (!arrayValue) return "";
    
    try {
      const array = JSON.parse(arrayValue);
      if (!Array.isArray(array)) return "";
      
      return array.map(item => {
        // Replace {{this}} with the current item
        return content.replace(/\{\{this\}\}/g, item);
      }).join("\n");
    } catch (e) {
      return "";
    }
  });
  
  // Handle #if blocks (simplified implementation)
  const ifRegex = /\{\{#if ([^}]+)\}\}([\s\S]+?)\{\{\/if\}\}/g;
  result = result.replace(ifRegex, (match, condition, content) => {
    const value = variables[condition];
    return value ? content : "";
  });
  
  return result;
}

/**
 * Add a new template to the collection
 * @param template Template definition
 */
export function addTemplate(template: CodeTemplate): void {
  templates[template.name] = template;
}

/**
 * Get the variables required for a template
 * @param templateName Name of the template
 * @returns Array of template variables
 */
export function getTemplateVariables(templateName: string): TemplateVariable[] {
  const template = templates[templateName];
  if (!template) {
    throw new Error(`Template '${templateName}' not found`);
  }
  return template.variables;
}
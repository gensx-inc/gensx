import { existsSync, readFileSync } from "fs";
import { writeFile } from "fs/promises";
import { resolve } from "path";

import ora from "ora";
import pc from "picocolors";
import {
  CompilerOptions,
  Definition,
  generateSchema as generateSchemaTJS,
  getProgramFromFiles,
  PartialArgs,
} from "typescript-json-schema";

import { bundleWorkflow } from "../utils/bundler.js";
import { ensureFirstTimeSetupComplete } from "../utils/first-time-setup.js";

// Utility function to convert camelCase to train-case
function toTrainCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z])(?=[a-z])/g, "$1-$2")
    .toLowerCase();
}

export interface BuildOptions {
  outDir?: string;
  tsconfig?: string;
}

// Type guard to check if a value is a Definition object
function isDefinition(value: unknown): value is Definition {
  return typeof value === "object" && value !== null;
}

async function generateSchema(
  tsFile: string,
  outFile: string,
  tsConfigFile?: string,
): Promise<void> {
  // Generate schema for all exported types
  const settings: PartialArgs = {
    include: [tsFile],
  };

  const tsconfigJson = JSON.parse(
    readFileSync(
      tsConfigFile ?? resolve(process.cwd(), "tsconfig.json"),
      "utf-8",
    ),
  ) as unknown as { compilerOptions: CompilerOptions };

  const program = getProgramFromFiles([tsFile], tsconfigJson.compilerOptions);

  // Generate schema for all types
  const schema = generateSchemaTJS(program, "*", {
    ...settings,
    ignoreErrors: true,
    ref: true,
    required: true,
    strictNullChecks: true,
    topRef: true,
    noExtraProps: true,
  });

  if (!schema?.definitions) {
    throw new Error("Failed to generate schema");
  }

  // Read the source file to get workflow names
  const sourceContent = readFileSync(tsFile, "utf-8");

  // Find workflow-related types by looking at the component types
  const workflowSchemas: Record<
    string,
    { input: Definition; output: Definition }
  > = {};

  // First find all workflow declarations
  const workflowDeclarations = Array.from(
    sourceContent.matchAll(
      /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*gsx\.Workflow\s*\(\s*["']([^"']+)["']\s*,\s*(\w+)/g,
    ),
  );

  // Then look for their component types
  for (const [
    ,
    _varName,
    workflowName,
    componentName,
  ] of workflowDeclarations) {
    // Convert workflow name to train-case
    const normalizedWorkflowName = toTrainCase(workflowName);

    // Look for the component definition and its type parameters
    const componentMatch = new RegExp(
      `${componentName}\\s*=\\s*gsx\\.Component\\s*<\\s*({[^}]+}|[^,>]+)\\s*,\\s*([^>]+)\\s*>`,
    ).exec(sourceContent);

    if (!componentMatch) {
      continue;
    }

    const [, inputTypeStr, outputTypeStr] = componentMatch;

    // If input type is an inline object type, create a temporary type for it
    let inputType = inputTypeStr;
    if (inputTypeStr.startsWith("{")) {
      const tempTypeName = `${componentName}Input`;
      if (!schema.definitions[tempTypeName]) {
        schema.definitions[tempTypeName] = {
          type: "object",
          properties: {
            userInput: { type: "string" },
          },
          required: ["userInput"],
        };
      }
      inputType = tempTypeName;
    }

    // Handle primitive output type
    let outputType = outputTypeStr.trim();
    if (outputType === "string") {
      const tempTypeName = `${componentName}Output`;
      if (!schema.definitions[tempTypeName]) {
        schema.definitions[tempTypeName] = {
          type: "string",
        };
      }
      outputType = tempTypeName;
    }

    // Get the actual type definitions
    const input = schema.definitions[inputType.trim()];
    const output = schema.definitions[outputType];

    if (isDefinition(input) && isDefinition(output)) {
      workflowSchemas[normalizedWorkflowName] = { input, output };
    }
  }

  // Create the final schema document
  const schemaWithMeta = {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "GenSX Workflow Schemas",
    description: "JSON Schema for workflow inputs and outputs",
    workflows: workflowSchemas,
  };

  await writeFile(outFile, JSON.stringify(schemaWithMeta, null, 2));
}

export async function build(file: string, options: BuildOptions = {}) {
  const spinner = ora();

  try {
    await ensureFirstTimeSetupComplete();

    // 1. Validate file exists and is a TypeScript file
    const absolutePath = resolve(process.cwd(), file);
    if (!existsSync(absolutePath)) {
      throw new Error(`File ${file} does not exist`);
    }

    if (!file.endsWith(".ts") && !file.endsWith(".tsx")) {
      throw new Error("Only TypeScript files (.ts or .tsx) are supported");
    }

    // 2. Bundle the file
    spinner.start("Bundling handler");
    const outDir = options.outDir ?? resolve(process.cwd(), ".gensx", "dist");
    const outFile = resolve(outDir, "handler.js");
    await bundleWorkflow(absolutePath, outFile);
    spinner.succeed();

    // 3. Generate schema
    spinner.start("Generating schema");
    const schemaFile = resolve(outDir, "schema.json");
    await generateSchema(absolutePath, schemaFile);
    spinner.succeed();

    // 4. Generate index.js wrapper
    spinner.start("Generating index wrapper");
    const indexContent = `import defaultWorkflow, * as namedWorkflows from './handler.js';
import Ajv from 'npm:ajv@8.12.0';
import addFormats from 'npm:ajv-formats@2.1.1';

// Initialize Ajv
const ajv = new Ajv({
  allErrors: true,  // Return all errors, not just the first one
  strict: false,    // Be more lenient with schema validation
});
addFormats(ajv);    // Add support for formats like email, date, etc.

// Function to convert camelCase to train-case
function toTrainCase(str) {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z])(?=[a-z])/g, '$1-$2')
    .toLowerCase();
}

// Combine default export and named exports with normalized names
const workflows = {
  ...(defaultWorkflow ? { [toTrainCase(defaultWorkflow.name)]: defaultWorkflow } : {}),
  ...Object.fromEntries(
    Object.values(namedWorkflows)
      .map(workflow => [toTrainCase(workflow.name), workflow])
  ),
};

// Cache for compiled validators
const validators = new Map();

// Function to validate input against JSON schema
function validateInput(input, schema, workflowName) {
  let validate = validators.get(workflowName);
  if (!validate) {
    validate = ajv.compile(schema);
    validators.set(workflowName, validate);
  }

  const valid = validate(input);
  if (!valid) {
    const errors = validate.errors.map(err => {
      let message = err.message;
      if (err.instancePath) {
        message = \`\${err.instancePath} \${message}\`;
      }
      return message;
    });
    throw new Error(\`Validation failed:\\n\${errors.join('\\n')}\`);
  }
}

const handler = async function(req) {
  const url = new URL(req.url);
  const workflowName = url.pathname.slice(1); // Remove leading slash

  // Get the workflow from exports
  const workflow = workflows[workflowName];
  if (!workflow) {
    return new Response(JSON.stringify({
      error: \`Workflow "\${workflowName}" not found. Available workflows: \${Object.keys(workflows).join(", ")}\`
    }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  try {
    const body = await req.json();

    // Get schema for this workflow
    const schema = await import("./schema.json", { with: { type: "json" } });
    const workflowSchema = schema.default.workflows[workflowName];

    if (!workflowSchema) {
      throw new Error(\`Schema not found for workflow "\${workflowName}"\`);
    }

    // Validate input against schema
    validateInput(body, workflowSchema.input, workflowName);

    const result = await workflow.run(body);

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    const isValidationError = error instanceof Error &&
      (error.message.includes("Validation failed") || error.message.includes("Schema"));

    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error occurred"
    }), {
      status: isValidationError ? 400 : 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

// List available workflows at the root
const listWorkflows = () => {
  const availableWorkflows = Object.keys(workflows).map(name => ({
    name,
    url: \`/\${name}\`,
    schema: \`/\${name}/schema\`
  }));

  return new Response(JSON.stringify({
    workflows: availableWorkflows,
    message: "Send a POST request to a workflow URL with your input JSON"
  }), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // List workflows at root
  if (url.pathname === "/") {
    return listWorkflows();
  }

  // Get schema for a specific workflow
  if (url.pathname.endsWith("/schema")) {
    const workflowName = url.pathname.slice(1, -7); // Remove leading slash and "/schema"
    const schema = await import("./schema.json", { with: { type: "json" } });
    const workflowSchema = schema.default.workflows[workflowName];

    if (!workflowSchema) {
      return new Response(JSON.stringify({
        error: \`Schema not found for workflow "\${workflowName}"\`
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    return new Response(JSON.stringify(workflowSchema), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // Handle workflow requests
  if (req.method === "POST") {
    return handler(req);
  }

  return new Response(JSON.stringify({
    error: "Method not allowed. Use POST to invoke workflows, GET / to list available workflows, or GET /{workflowName}/schema for workflow schema"
  }), {
    status: 405,
    headers: {
      'Content-Type': 'application/json'
    }
  });
});`;

    await writeFile(resolve(outDir, "index.js"), indexContent);
    spinner.succeed();

    console.info(`
${pc.green("✔")} Successfully built workflow

${pc.bold("Output files:")}
${pc.cyan("- " + resolve(outDir, "handler.js"))} (bundled handler)
${pc.cyan("- " + resolve(outDir, "index.js"))} (HTTP wrapper)
${pc.cyan("- " + resolve(outDir, "schema.json"))} (JSON Schema)

${pc.bold("Available routes:")}
${pc.cyan("GET /")} - List all available workflows
${pc.cyan("GET /{workflowName}/schema")} - Get JSON Schema for a workflow
${pc.cyan("POST /{workflowName}")} - Execute a specific workflow
`);

    return outFile;
  } catch (error) {
    if (spinner.isSpinning) {
      spinner.fail();
    }
    if (error instanceof Error) {
      console.error(pc.red(`\nError: ${error.message}`));
    } else {
      console.error(pc.red("\nAn unknown error occurred"));
    }
    process.exit(1);
  }
}

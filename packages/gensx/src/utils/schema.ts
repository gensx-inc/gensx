import { readFileSync } from "fs";
import { writeFile } from "fs/promises";
import { resolve } from "path";

import { Definition } from "typescript-json-schema";
import {
  CompilerOptions,
  generateSchema as generateSchemaTJS,
  getProgramFromFiles,
  PartialArgs,
} from "typescript-json-schema";

interface SchemaTypeOptions {
  isStreamComponent?: boolean;
}

/**
 * Parses a TypeScript type string into a JSON Schema definition
 */
export function parseTypeToSchema(
  typeStr: string,
  options: SchemaTypeOptions = {},
): Definition {
  if (typeStr.startsWith("{")) {
    return parseInlineObjectType(typeStr, options);
  }

  // For named types, we need to handle them differently based on component type
  if (options.isStreamComponent) {
    return createStreamComponentSchema(typeStr);
  }

  if (typeStr === "string") {
    return { type: "string" };
  }

  return { $ref: `#/definitions/${typeStr}` };
}

/**
 * Parses an inline object type (e.g. "{ foo: string, bar?: number }") into a JSON Schema
 */
function parseInlineObjectType(
  typeStr: string,
  _options: SchemaTypeOptions,
): Definition {
  // Parse the inline object type into a proper JSON structure
  const inlineProps = typeStr
    .replace(/([a-zA-Z0-9]+)(?=:)/g, '"$1"') // Quote property names
    .replace(/:\s*string(?![a-zA-Z])/g, ': { "type": "string" }') // Convert string type to schema
    .replace(/:\s*number(?![a-zA-Z])/g, ': { "type": "number" }') // Convert number type to schema
    .replace(/:\s*boolean(?![a-zA-Z])/g, ': { "type": "boolean" }') // Convert boolean type to schema
    .replace(/:\s*any(?![a-zA-Z])/g, ": {}") // Convert any type to empty schema
    .replace(
      /:\s*(string|number|boolean)\[\]/g,
      ': { "type": "array", "items": { "type": "$1" } }',
    ) // Handle arrays
    .replace(
      /:\s*Array<([^>]+)>/g,
      ': { "type": "array", "items": { "type": "$1" } }',
    ) // Handle Array<T>
    .replace(
      /:\s*Record<([^,]+),\s*([^>]+)>/g,
      ': { "type": "object", "additionalProperties": { "type": "$2" } }',
    ) // Handle Record
    .replace(/\|\s*null/g, ""); // Remove union with null (handled by required fields)

  // Extract required fields (properties without ? and not union with null)
  const requiredFields = Array.from(typeStr.matchAll(/([a-zA-Z0-9]+)(?=\s*:)/g))
    .map((match) => match[1])
    .filter(
      (prop) =>
        !typeStr.includes(`${prop}?:`) &&
        !typeStr.includes(`${prop}: ${prop} | null`),
    );

  const parsedProps = JSON.parse(inlineProps) as Record<string, Definition>;

  return {
    type: "object",
    properties: parsedProps,
    required: requiredFields,
  };
}

/**
 * Creates a schema for a StreamComponent's input type
 */
function createStreamComponentSchema(baseType: string): Definition {
  return {
    allOf: [
      { $ref: `#/definitions/${baseType}` },
      {
        type: "object",
        properties: {
          stream: { type: "boolean" },
        },
      },
    ],
  };
}

/**
 * Creates a schema for a component's output type
 */
export function createOutputSchema(
  outputType: string,
  isStreamable: boolean,
): Definition {
  // For StreamComponent, allow both string and stream output
  if (isStreamable && outputType !== "Streamable") {
    return {
      oneOf: [
        { type: "string" },
        {
          type: "object",
          properties: {
            type: { const: "stream" },
            value: { type: "string" },
          },
          required: ["type", "value"],
        },
      ],
    };
  }

  // For Streamable output type, only allow stream output
  if (outputType === "Streamable") {
    return {
      type: "object",
      properties: {
        type: { const: "stream" },
        value: { type: "string" },
      },
      required: ["type", "value"],
    };
  }

  // For string output type, only allow string
  if (outputType === "string") {
    return { type: "string" };
  }

  // For other types, reference the type definition
  return { $ref: `#/definitions/${outputType}` };
}

// Utility function to convert camelCase to train-case
function toTrainCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z])(?=[a-z])/g, "$1-$2")
    .toLowerCase();
}

// Type guard to check if a value is a Definition object
function isDefinition(value: unknown): value is Definition {
  return typeof value === "object" && value !== null;
}

/**
 * Generates JSON Schema for all workflows in a TypeScript file
 */
export async function generateSchema(
  tsFile: string,
  outFile: string,
  tsConfigFile?: string,
): Promise<string[]> {
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

  const workflowNames: string[] = [];
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
      `const ${componentName}\\s*=\\s*gsx\\.(StreamComponent|Component)\\s*<\\s*({[^}]+}|[^,>]+)\\s*(?:,\\s*([^>]+))?\\s*>`,
    ).exec(sourceContent);

    if (!componentMatch) {
      continue;
    }

    const [, componentType, inputTypeStr, explicitOutputType] = componentMatch;
    const isStreamComponent = componentType === "StreamComponent";

    // Parse input type
    const inputDef = parseTypeToSchema(inputTypeStr, {
      isStreamComponent: false,
    }); // Never add stream property during initial parsing

    // Determine output type - use explicit type if provided, otherwise use Streamable for StreamComponents
    const outputType = explicitOutputType
      ? explicitOutputType.trim()
      : isStreamComponent
        ? "Streamable"
        : "string";

    // Create output schema based on component and output type
    const outputDef = isStreamComponent
      ? {
          oneOf: [
            { type: "string" },
            {
              type: "object",
              properties: {
                type: { const: "stream" },
                value: { type: "string" },
              },
              required: ["type", "value"],
            },
          ],
        }
      : outputType === "Streamable"
        ? {
            type: "object",
            properties: {
              type: { const: "stream" },
              value: { type: "string" },
            },
            required: ["type", "value"],
          }
        : parseTypeToSchema(outputType, { isStreamComponent: false });

    if (isDefinition(inputDef) && isDefinition(outputDef)) {
      // Add stream property to input ONLY if it's a StreamComponent
      if (
        isStreamComponent &&
        inputDef.type === "object" &&
        inputDef.properties
      ) {
        inputDef.properties.stream = { type: "boolean" };
      }

      workflowSchemas[normalizedWorkflowName] = {
        input: inputDef,
        output: outputDef,
      };

      workflowNames.push(normalizedWorkflowName);
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

  return workflowNames;
}

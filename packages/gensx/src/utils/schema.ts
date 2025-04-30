import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import * as ts from "typescript";
import {
  Definition,
  generateSchema as generateSchemaTJS,
  getProgramFromFiles,
  PartialArgs,
} from "typescript-json-schema";

/**
 * Generates JSON Schema for all workflows in a TypeScript file
 */
export function generateSchema(
  tsFile: string,
  tsConfigFile?: string,
): Record<string, { input: Definition; output: Definition }> {
  // Create program from the source file
  const tsconfigPath = tsConfigFile ?? resolve(process.cwd(), "tsconfig.json");
  const tsconfig = ts.parseJsonConfigFileContent(
    JSON.parse(readFileSync(tsconfigPath, "utf-8")),
    ts.sys,
    process.cwd(),
  );

  // Create TypeScript program with all source files
  const program = ts.createProgram([tsFile], tsconfig.options);
  const sourceFile = program.getSourceFile(tsFile);
  const typeChecker = program.getTypeChecker();

  if (!sourceFile) {
    throw new Error(`Could not find source file: ${tsFile}`);
  }

  // Track processed files to avoid circular dependencies
  const processedFiles = new Set<string>();

  // Function to recursively process files and extract schemas
  function processFile(
    filePath: string,
  ): Record<string, { input: Definition; output: Definition }> {
    if (processedFiles.has(filePath)) {
      return {};
    }
    processedFiles.add(filePath);

    const fileSource = program.getSourceFile(filePath);
    if (!fileSource) {
      return {};
    }

    // Generate schema for all types using typescript-json-schema
    const tjsProgram = getProgramFromFiles([filePath], tsconfig.options);
    const tjsSettings: PartialArgs = {
      include: [filePath],
      ignoreErrors: true,
      ref: false,
      required: true,
      strictNullChecks: true,
      topRef: false,
      noExtraProps: true,
    };

    const baseSchema = generateSchemaTJS(tjsProgram, "*", tjsSettings);
    if (!baseSchema?.definitions) {
      return {};
    }

    // Extract workflow information using TypeScript compiler
    const workflowInfo = extractWorkflowInfo(fileSource, typeChecker);

    // Build schemas for each workflow
    const workflowSchemas: Record<
      string,
      { input: Definition; output: Definition }
    > = {};
    const workflowNames: string[] = [];

    for (const workflow of workflowInfo) {
      const workflowName = encodeURIComponent(workflow.name);
      if (workflowName !== workflow.name) {
        console.warn(
          `\n\nWorkflow name contains invalid characters and will be encoded: ${workflow.name}\n\n`,
        );
      }

      if (!workflowName) {
        console.warn(
          `\n\nWorkflow name is undefined: ${workflow.componentName}\n\n`,
        );
        continue;
      }

      if (workflowNames.includes(workflowName)) {
        console.warn(
          `\n\nWorkflow name is already defined: ${workflowName}\n\n`,
        );
        continue;
      }

      workflowNames.push(workflowName);

      // Create input schema
      const inputSchema = createInputSchema(
        workflow.inputType,
        workflow.isStreamComponent,
      );

      // Create output schema
      const outputSchema = createOutputSchema(
        workflow.outputType,
        workflow.isStreamComponent,
      );

      // If the input schema has a $ref, try to dereference it from baseSchema
      if (inputSchema.$ref) {
        const refType = inputSchema.$ref.split("/").pop();
        if (refType && baseSchema.definitions[refType]) {
          const definition = baseSchema.definitions[refType];
          // Remove the $ref and spread the definition
          delete inputSchema.$ref;
          Object.assign(inputSchema, definition);
        }
      }

      // If the output schema has a $ref, try to dereference it from baseSchema
      if (outputSchema.$ref) {
        const refType = outputSchema.$ref.split("/").pop();
        if (refType && baseSchema.definitions[refType]) {
          const definition = baseSchema.definitions[refType];
          // Remove the $ref and spread the definition
          delete outputSchema.$ref;
          Object.assign(outputSchema, definition);
        }
      }

      workflowSchemas[workflowName] = {
        input: inputSchema,
        output: outputSchema,
      };
    }

    // Process imported files recursively
    const importedFiles = getImportedFiles(fileSource, program);
    for (const importedFile of importedFiles) {
      const importedSchemas = processFile(importedFile);
      Object.assign(workflowSchemas, importedSchemas);
    }

    return workflowSchemas;
  }

  return processFile(tsFile);
}

/**
 * Gets all imported files from a source file
 */
function getImportedFiles(
  sourceFile: ts.SourceFile,
  program: ts.Program,
): string[] {
  const importedFiles = new Set<string>();

  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier;
      if (ts.isStringLiteral(moduleSpecifier)) {
        const importPath = moduleSpecifier.text;
        // Resolve the import path
        const resolvedModule = ts.resolveModuleName(
          importPath,
          sourceFile.fileName,
          program.getCompilerOptions(),
          ts.sys,
        );

        if (resolvedModule.resolvedModule) {
          importedFiles.add(resolvedModule.resolvedModule.resolvedFileName);
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return Array.from(importedFiles);
}

/**
 * Information about a Workflow extracted from the source code
 */
interface WorkflowInfo {
  name: string;
  componentName: string;
  inputType: string;
  outputType: string;
  isStreamComponent: boolean;
}

/**
 * Extracts workflow information from a TypeScript source file using the compiler API
 */
function extractWorkflowInfo(
  sourceFile: ts.SourceFile,
  _typeChecker: ts.TypeChecker,
): WorkflowInfo[] {
  const workflowInfos: WorkflowInfo[] = [];
  const componentDefinitions = new Map<
    string,
    {
      isStreamComponent: boolean;
      inputType: string;
      outputType: string;
    }
  >();
  const exportedSymbols = new Set<string>();

  // Helper to check if a node is exported
  // function isNodeExported(node: ts.Declaration): boolean {
  //   return (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0;
  // }

  // Helper to get type parameters as strings from a call expression
  function getTypeParametersAsStrings(node: ts.CallExpression): {
    inputType: string;
    outputType: string;
  } {
    let inputType = "any";
    let outputType = "";

    if (node.typeArguments && node.typeArguments.length > 0) {
      inputType = node.typeArguments[0].getText(sourceFile);

      if (node.typeArguments.length > 1) {
        outputType = node.typeArguments[1].getText(sourceFile);
      }
    }

    return { inputType, outputType };
  }

  // Helper to extract first argument as string literal from a call expression
  function getFirstStringArgument(node: ts.CallExpression): string | undefined {
    if (node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0])) {
      return node.arguments[0].text;
    }
    return undefined;
  }

  // Helper to extract second argument as identifier from a call expression
  function getSecondIdentifierArgument(
    node: ts.CallExpression,
  ): string | undefined {
    if (node.arguments.length > 1 && ts.isIdentifier(node.arguments[1])) {
      return node.arguments[1].text;
    }
    return undefined;
  }

  // Process export declarations to collect exported symbols
  function processExports(node: ts.Node) {
    // Handle 'export { x, y }' statements
    if (ts.isExportDeclaration(node) && node.exportClause) {
      if (ts.isNamedExports(node.exportClause)) {
        for (const element of node.exportClause.elements) {
          exportedSymbols.add(element.name.text);
        }
      }
    }

    // Handle variable declarations with export modifier
    if (
      ts.isVariableStatement(node) &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          exportedSymbols.add(decl.name.text);
        }
      }
    }
  }

  // Process component definitions
  function processComponentDefinition(
    variableName: string,
    callExpr: ts.CallExpression,
  ) {
    const expression = callExpr.expression;
    let isComponentCall = false;
    let isStreamComponentCall = false;

    // Handle direct calls like Component() or StreamComponent()
    if (ts.isIdentifier(expression)) {
      if (expression.text === "Component") isComponentCall = true;
      if (expression.text === "StreamComponent") isStreamComponentCall = true;
    }

    // Handle qualified calls like gensx.Component() or gensx.StreamComponent()
    if (
      ts.isPropertyAccessExpression(expression) &&
      ts.isIdentifier(expression.name)
    ) {
      if (expression.name.text === "Component") isComponentCall = true;
      if (expression.name.text === "StreamComponent")
        isStreamComponentCall = true;
    }

    if (isComponentCall || isStreamComponentCall) {
      const { inputType, outputType } = getTypeParametersAsStrings(callExpr);

      componentDefinitions.set(variableName, {
        isStreamComponent: isStreamComponentCall,
        inputType,
        outputType:
          outputType || (isStreamComponentCall ? "Streamable" : "string"),
      });
    }
  }

  // Process workflow definitions
  function processWorkflowDefinition(
    variableName: string,
    callExpr: ts.CallExpression,
  ) {
    const expression = callExpr.expression;
    let isWorkflowCall = false;

    // Handle direct calls like Workflow()
    if (ts.isIdentifier(expression) && expression.text === "Workflow") {
      isWorkflowCall = true;
    }

    // Handle qualified calls like gensx.Workflow()
    if (
      ts.isPropertyAccessExpression(expression) &&
      ts.isIdentifier(expression.name) &&
      expression.name.text === "Workflow"
    ) {
      isWorkflowCall = true;
    }

    if (isWorkflowCall) {
      const workflowName = getFirstStringArgument(callExpr);
      const componentName = getSecondIdentifierArgument(callExpr);

      if (workflowName && componentName) {
        // Only include workflows that are exported
        if (exportedSymbols.has(variableName)) {
          const componentInfo = componentDefinitions.get(componentName);

          if (componentInfo) {
            workflowInfos.push({
              name: workflowName,
              componentName,
              inputType: componentInfo.inputType,
              outputType: componentInfo.outputType,
              isStreamComponent: componentInfo.isStreamComponent,
            });
          }
        }
      }
    }
  }

  function extractExportedSymbols(node: ts.Node) {
    processExports(node);
  }

  // Visit each node in the source file
  function visit(node: ts.Node) {
    // Process export declarations

    // Look for component and workflow variable declarations
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (
          ts.isIdentifier(decl.name) &&
          decl.initializer &&
          ts.isCallExpression(decl.initializer)
        ) {
          const variableName = decl.name.text;
          const callExpr = decl.initializer;

          // Check for component definition
          processComponentDefinition(variableName, callExpr);

          // Check for workflow definition
          processWorkflowDefinition(variableName, callExpr);
        }
      }
    }

    // Get exports first
    ts.forEachChild(node, extractExportedSymbols);

    // Continue visiting child nodes
    ts.forEachChild(node, visit);
  }

  // Start the traversal
  visit(sourceFile);

  return workflowInfos;
}

/**
 * Creates a schema for a component's input type
 */
function createInputSchema(
  inputType: string,
  isStreamComponent: boolean,
): Definition {
  // Check if this is an inline object type or a reference
  const isInlineObject = inputType.startsWith("{") && inputType.endsWith("}");

  let inputSchema: Definition;

  if (isInlineObject) {
    // Parse inline object type
    inputSchema = parseInlineObjectType(inputType);
  } else if (
    inputType === "string" ||
    inputType === "number" ||
    inputType === "boolean"
  ) {
    // Handle primitive types
    inputSchema = { type: inputType };
  } else {
    // Reference to a named type
    inputSchema = { $ref: `#/definitions/${inputType}` };
  }

  // Add stream property for StreamComponent inputs
  if (
    isStreamComponent &&
    inputSchema.type === "object" &&
    inputSchema.properties
  ) {
    inputSchema.properties.stream = { type: "boolean" };
  } else if (isStreamComponent) {
    // If input is not an object type, wrap it in an allOf
    inputSchema = {
      allOf: [
        inputSchema,
        {
          type: "object",
          properties: {
            stream: { type: "boolean" },
          },
        },
      ],
    };
  }

  return inputSchema;
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

  // For number output type
  if (outputType === "number") {
    return { type: "number" };
  }

  // For boolean output type
  if (outputType === "boolean") {
    return { type: "boolean" };
  }

  // Check if this is an inline object type
  const isInlineObject = outputType.startsWith("{") && outputType.endsWith("}");
  if (isInlineObject) {
    return parseInlineObjectType(outputType);
  }

  // If we get here, it's an unrecognized type
  console.warn(
    `\n\nUnrecognized output type: ${outputType}\nPlease use one of: string, number, boolean, Streamable, or an inline object type like { property: type }\n\n`,
  );
  return {
    type: "object",
    description: `Unrecognized output type: ${outputType}. Expected one of: string, number, boolean, Streamable, or an inline object type.`,
    additionalProperties: true,
  };
}

/**
 * Parses an inline object type into a JSON Schema Definition
 * This still uses some regex because TypeScript's compiler API doesn't
 * provide direct access to parse arbitrary type strings
 */
function parseInlineObjectType(typeStr: string): Definition {
  // Parse properties
  const properties: Record<string, Definition> = {};
  const requiredFields: string[] = [];

  // Extract properties using regex
  const propRegex = /([a-zA-Z0-9_]+)(\?)?:\s*([^;,}]+)/g;
  let match;

  while ((match = propRegex.exec(typeStr)) !== null) {
    const [, propName, optional, propType] = match;

    // Add to required fields if not optional
    if (!optional) {
      requiredFields.push(propName);
    }

    // Convert TS type to JSON Schema
    properties[propName] = convertTypeToSchema(propType.trim());
  }

  return {
    type: "object",
    properties,
    required: requiredFields.length > 0 ? requiredFields : undefined,
  };
}

/**
 * Converts a TypeScript type string to a JSON Schema Definition
 */
function convertTypeToSchema(typeStr: string): Definition {
  // Handle primitive types
  if (typeStr === "string") {
    return { type: "string" };
  }
  if (typeStr === "number") {
    return { type: "number" };
  }
  if (typeStr === "boolean") {
    return { type: "boolean" };
  }

  // Handle arrays
  if (typeStr.endsWith("[]")) {
    const itemType = typeStr.slice(0, -2);
    return {
      type: "array",
      items: convertTypeToSchema(itemType),
    };
  }

  // Handle Array<T>
  const arrayMatch = /Array<([^>]+)>/.exec(typeStr);
  if (arrayMatch) {
    return {
      type: "array",
      items: convertTypeToSchema(arrayMatch[1]),
    };
  }

  // Handle Record<K, V>
  const recordMatch = /Record<([^,]+),\s*([^>]+)>/.exec(typeStr);
  if (recordMatch) {
    return {
      type: "object",
      additionalProperties: convertTypeToSchema(recordMatch[2]),
    };
  }

  // Handle unions
  if (typeStr.includes("|")) {
    const types = typeStr.split("|").map((t) => t.trim());

    // Handle union with null
    if (types.includes("null")) {
      const nonNullTypes = types.filter((t) => t !== "null");
      if (nonNullTypes.length === 1) {
        const baseSchema = convertTypeToSchema(nonNullTypes[0]);
        // Use oneOf for null union
        return {
          oneOf: [baseSchema, { type: "null" }],
        };
      }
    }

    return {
      oneOf: types.map((t) => convertTypeToSchema(t)),
    };
  }

  // Default: assume it's a reference to a named type
  return { $ref: `#/definitions/${typeStr}` };
}

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import * as ts from "typescript";
import { Definition } from "typescript-json-schema";

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
  const program = ts.createProgram([tsFile], {
    ...tsconfig.options,
    //experimentalDecorators: true,
  });
  const sourceFile = program.getSourceFile(tsFile);
  const typeChecker = program.getTypeChecker();

  if (!sourceFile) {
    throw new Error(`Could not find source file: ${tsFile}`);
  }

  // Extract workflow information using TypeScript compiler
  const workflowInfo = extractWorkflowInfo(sourceFile, typeChecker);

  // Build schemas for each workflow
  const workflowSchemas: Record<
    string,
    { input: Definition; output: Definition }
  > = {};

  for (const workflow of workflowInfo) {
    const workflowName = workflow.name;
    if (!workflowName) {
      console.warn(
        `\n\nWorkflow name is undefined: ${workflow.componentName}\n\n`,
      );
      continue;
    }

    // Use the types directly from the workflow function
    const inputSchema = typeToSchema(
      workflow.inputType,
      typeChecker,
      sourceFile,
    );
    const outputSchema = typeToSchema(
      workflow.outputType,
      typeChecker,
      sourceFile,
    );

    workflowSchemas[workflowName] = {
      input: inputSchema,
      output: outputSchema,
    };
  }

  return workflowSchemas;
}

/**
 * Information about a Workflow extracted from the source code
 */
interface WorkflowInfo {
  name: string;
  componentName: string;
  inputType: ts.Type;
  outputType: ts.Type;
  isStreamComponent: boolean;
}

/**
 * Extracts workflow information from a TypeScript source file using the compiler API
 */
function extractWorkflowInfo(
  sourceFile: ts.SourceFile,
  typeChecker: ts.TypeChecker,
): WorkflowInfo[] {
  const workflowInfos: WorkflowInfo[] = [];
  const exportedNames = new Set<string>();

  // First pass: collect all exported names from export statements and export declarations
  function collectExportedNames(node: ts.Node) {
    // Handle export { ... } statements
    if (ts.isExportDeclaration(node) && node.exportClause) {
      if (ts.isNamedExports(node.exportClause)) {
        for (const element of node.exportClause.elements) {
          exportedNames.add(element.name.text);
        }
      }
    }
    // Handle export const declarations
    if (ts.isVariableStatement(node) && node.modifiers) {
      const hasExport = node.modifiers.some(
        (m) => m.kind === ts.SyntaxKind.ExportKeyword,
      );
      if (hasExport) {
        for (const declaration of node.declarationList.declarations) {
          exportedNames.add(declaration.name.getText(sourceFile));
        }
      }
    }
    ts.forEachChild(node, collectExportedNames);
  }
  collectExportedNames(sourceFile);

  function visit(node: ts.Node) {
    // Look for variable declarations that are initialized with gensx.Workflow()
    if (ts.isVariableDeclaration(node) && node.initializer) {
      const initializer = node.initializer;
      if (
        ts.isCallExpression(initializer) &&
        ts.isPropertyAccessExpression(initializer.expression) &&
        initializer.expression.expression.getText(sourceFile) === "gensx" &&
        initializer.expression.name.text === "Workflow"
      ) {
        // Get the workflow name from the first argument
        const workflowNameArg = initializer.arguments[0];
        if (!workflowNameArg) return;

        const workflowName = workflowNameArg
          .getText(sourceFile)
          .replace(/['"]/g, "");
        if (!workflowName) return;

        // Get the function from the second argument
        const workflowFn = initializer.arguments[1];
        if (!workflowFn) return;

        // Check if it's a function-like node
        if (
          !ts.isArrowFunction(workflowFn) &&
          !ts.isFunctionExpression(workflowFn)
        )
          return;

        // Get input and output types
        let inputType: ts.Type = typeChecker.getAnyType();
        let outputType: ts.Type = typeChecker.getAnyType();

        if (workflowFn.parameters.length > 0) {
          inputType = typeChecker.getTypeAtLocation(workflowFn.parameters[0]);
        }

        // Get the return type of the function
        const signature = typeChecker.getSignatureFromDeclaration(workflowFn);
        if (signature) {
          outputType = typeChecker.getReturnTypeOfSignature(signature);

          // Unwrap Promise<T> for output
          if (outputType.symbol.name === "Promise") {
            const typeArgs = (outputType as ts.TypeReference).typeArguments;
            if (typeArgs && typeArgs.length > 0) {
              outputType = typeArgs[0];
            }
          }
        }

        // Check if this workflow should be included - only exported workflows
        const variableName = node.name.getText(sourceFile);
        const shouldInclude = exportedNames.has(variableName);

        if (shouldInclude) {
          workflowInfos.push({
            name: workflowName,
            componentName: workflowName,
            inputType,
            outputType,
            isStreamComponent: false,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return workflowInfos;
}

/**
 * Converts a TypeScript type to a JSON Schema Definition using the compiler API
 */
function typeToSchema(
  tsType: ts.Type,
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
  isOptionalProp = false,
): Definition {
  if (tsType.isStringLiteral()) {
    return { type: "string", enum: [tsType.value] };
  }
  if (tsType.isNumberLiteral()) {
    return { type: "number", enum: [tsType.value] };
  }
  if (tsType.flags & ts.TypeFlags.String) {
    return { type: "string" };
  }
  if (tsType.flags & ts.TypeFlags.Number) {
    return { type: "number" };
  }
  if (tsType.flags & ts.TypeFlags.Boolean) {
    return { type: "boolean" };
  }
  if (tsType.flags & ts.TypeFlags.Null) {
    return { type: "null" };
  }
  if (tsType.flags & ts.TypeFlags.Any) {
    return { type: "object", additionalProperties: true };
  }
  if (tsType.flags & ts.TypeFlags.Undefined) {
    // If this is an optional property, don't emit a type for undefined
    return isOptionalProp ? {} : { type: "null" };
  }

  // Handle AsyncIterable and Iterable types
  const typeStr = checker.typeToString(tsType);
  if (
    typeStr.includes("AsyncIterable") ||
    typeStr.includes("Iterable") ||
    typeStr.includes("AsyncGenerator") ||
    typeStr.includes("Generator")
  ) {
    // Handle direct AsyncGenerator/Generator types
    if (typeStr.includes("AsyncGenerator") || typeStr.includes("Generator")) {
      const typeRef = tsType as ts.TypeReference;
      const typeArgs = typeRef.typeArguments;
      if (typeArgs && typeArgs.length > 0) {
        const innerType = typeArgs[0];
        const valueSchema = typeToSchema(innerType, checker, sourceFile);

        return {
          type: "object",
          properties: {
            type: { const: "stream" },
            value: valueSchema,
          },
          required: ["type", "value"],
        };
      }
    }

    // Handle object types with Symbol.asyncIterator that return AsyncGenerator
    if (
      typeStr.includes("[Symbol.asyncIterator]") &&
      typeStr.includes("AsyncGenerator")
    ) {
      // Extract the AsyncGenerator type from the string
      const asyncGenMatch = /AsyncGenerator<([^,>]+)/.exec(typeStr);
      if (asyncGenMatch) {
        const innerTypeStr = asyncGenMatch[1];

        // For inline object types like { content: string; role: string; }
        if (innerTypeStr.startsWith("{") && innerTypeStr.includes(":")) {
          const valueSchema = parseInlineObjectType(innerTypeStr);
          return {
            type: "object",
            properties: {
              type: { const: "stream" },
              value: valueSchema,
            },
            required: ["type", "value"],
          };
        }

        // For simple types like string
        const valueSchema = convertTypeToSchema(innerTypeStr);
        return {
          type: "object",
          properties: {
            type: { const: "stream" },
            value: valueSchema,
          },
          required: ["type", "value"],
        };
      }
    }

    // Fallback: default stream schema
    return {
      type: "object",
      properties: {
        type: { const: "stream" },
        value: { type: "string" },
      },
      required: ["type", "value"],
    };
  }

  if (checker.isArrayType(tsType)) {
    const elementType =
      (tsType as ts.TypeReference).typeArguments?.[0] ?? checker.getAnyType();
    return {
      type: "array",
      items: typeToSchema(elementType, checker, sourceFile),
    };
  }
  if (tsType.isUnion()) {
    // Remove undefined from union for optional properties
    const types = tsType.types;
    const nonUndefinedTypes = types.filter(
      (t) => !(t.flags & ts.TypeFlags.Undefined),
    );

    // Special case: if this is a union of only string literals, just return string type
    if (nonUndefinedTypes.every((t) => t.isStringLiteral())) {
      return { type: "string" };
    }

    // If this is an optional property and the only difference is undefined, just use the non-undefined type
    if (isOptionalProp && nonUndefinedTypes.length === 1) {
      return typeToSchema(nonUndefinedTypes[0], checker, sourceFile);
    }
    // Handle union with null (not undefined)
    if (types.some((t) => t.flags & ts.TypeFlags.Null)) {
      const nonNullTypes = types.filter((t) => !(t.flags & ts.TypeFlags.Null));
      if (nonNullTypes.length === 1) {
        return {
          oneOf: [
            typeToSchema(nonNullTypes[0], checker, sourceFile),
            { type: "null" },
          ],
        };
      }
    }
    return {
      oneOf: nonUndefinedTypes.map((t) => typeToSchema(t, checker, sourceFile)),
    };
  }
  if (tsType.isIntersection()) {
    return {
      allOf: tsType.types.map((t) => typeToSchema(t, checker, sourceFile)),
    };
  }
  // Handle object types (interfaces, type literals)
  if (tsType.getProperties().length > 0) {
    const properties: Record<string, Definition> = {};
    const required: string[] = [];
    for (const prop of tsType.getProperties()) {
      const decl = prop.valueDeclaration ?? prop.declarations?.[0];
      if (decl) {
        const propType = checker.getTypeOfSymbolAtLocation(prop, decl);
        const isOptional = !!(prop.getFlags() & ts.SymbolFlags.Optional);
        properties[prop.name] = typeToSchema(
          propType,
          checker,
          sourceFile,
          isOptional,
        );
        if (!isOptional) {
          required.push(prop.name);
        }
      }
    }
    return {
      type: "object",
      properties,
      required: required.length > 0 ? required.sort() : undefined,
    };
  }
  // Fallback for unknown types
  return {
    type: "object",
    description: `Unrecognized or complex type: ${checker.typeToString(tsType)}`,
    additionalProperties: true,
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

  // For primitive types
  if (outputType === "string") {
    return { type: "string" };
  }
  if (outputType === "number") {
    return { type: "number" };
  }
  if (outputType === "boolean") {
    return { type: "boolean" };
  }

  // Check if this is an inline object type
  const isInlineObject = outputType.startsWith("{") && outputType.endsWith("}");
  if (isInlineObject) {
    return parseInlineObjectType(outputType);
  }

  // For named types, try to get the schema from the base schema
  // This will be handled by the caller which has access to the baseSchema
  return { $ref: `#/definitions/${outputType}` };
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
    required: requiredFields.length > 0 ? requiredFields.sort() : undefined,
  };
}

/**
 * Converts a TypeScript type string to a JSON Schema Definition
 */
function convertTypeToSchema(typeStr: string): Definition {
  // Handle string literal unions like "chunk1" | "chunk2" -> convert to string
  if (typeStr.includes("|") && typeStr.includes('"')) {
    const parts = typeStr.split("|").map((s) => s.trim());
    // If all parts are string literals, convert to string type
    if (parts.every((part) => part.startsWith('"') && part.endsWith('"'))) {
      return { type: "string" };
    }
  }

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

  // Handle inline object types
  const objectMatch = /{([^}]*)}/.exec(typeStr);
  if (objectMatch) {
    const properties: Record<string, Definition> = {};
    const required: string[] = [];

    // Parse properties
    const propRegex = /([a-zA-Z0-9_]+)(\?)?:\s*([^;,}]+)/g;
    let propMatch;
    while ((propMatch = propRegex.exec(objectMatch[1])) !== null) {
      const [, propName, optional, propType] = propMatch;
      if (!optional) {
        required.push(propName);
      }
      properties[propName] = convertTypeToSchema(propType.trim());
    }

    return {
      type: "object",
      properties,
      required: required.length > 0 ? required.sort() : undefined,
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

  // We don't know what to do here.
  console.warn(`\n\nUnrecognized type: ${typeStr}\n\n`);
  return {
    type: "object",
    description: `Unrecognized type: ${typeStr}.`,
    additionalProperties: true,
  };
}

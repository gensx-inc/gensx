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
  const program = ts.createProgram([tsFile], {
    ...tsconfig.options,
    experimentalDecorators: true,
  });
  const sourceFile = program.getSourceFile(tsFile);
  const typeChecker = program.getTypeChecker();

  if (!sourceFile) {
    throw new Error(`Could not find source file: ${tsFile}`);
  }

  // Generate schema for all types using typescript-json-schema
  const tjsProgram = getProgramFromFiles([tsFile], tsconfig.options);
  const tjsSettings: PartialArgs = {
    include: [tsFile],
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

    // Get input/output types using the type checker
    let inputType: ts.Type | undefined = undefined;
    let outputType: ts.Type | undefined = undefined;
    // Find the function declaration in the source file
    const fnNode = sourceFile.statements.find(
      (s) =>
        ts.isFunctionDeclaration(s) && s.name && s.name.text === workflowName,
    ) as ts.FunctionDeclaration | undefined;
    if (fnNode) {
      if (fnNode.parameters.length > 0) {
        inputType = typeChecker.getTypeAtLocation(fnNode.parameters[0]);
      }
      if (fnNode.type) {
        outputType = typeChecker.getTypeFromTypeNode(fnNode.type);
      } else {
        outputType = typeChecker.getReturnTypeOfSignature(
          typeChecker.getSignatureFromDeclaration(fnNode)!,
        );
      }
    }
    // Fallback to any
    inputType ??= typeChecker.getAnyType();
    outputType ??= typeChecker.getAnyType();

    // Use typeToSchema for input/output
    let inputSchema = typeToSchema(inputType, typeChecker);
    // Unwrap Promise<T> for output
    let outputSchemaType = outputType;
    const typeArgs = (outputType as ts.TypeReference).typeArguments;
    if (
      outputType.symbol.name === "Promise" &&
      typeArgs?.length &&
      typeArgs[0]
    ) {
      outputSchemaType = typeArgs[0];
    }
    let outputSchema = typeToSchema(outputSchemaType, typeChecker);

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
  inputType: string;
  outputType: string;
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

  // First pass: collect all exported names from export statements
  function collectExportedNames(node: ts.Node) {
    if (ts.isExportDeclaration(node) && node.exportClause) {
      if (ts.isNamedExports(node.exportClause)) {
        for (const element of node.exportClause.elements) {
          exportedNames.add(element.name.text);
        }
      }
    }
    ts.forEachChild(node, collectExportedNames);
  }
  collectExportedNames(sourceFile);

  function getTypeParametersFromFunction(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.FunctionExpression,
  ): { inputType: string; outputType: string } {
    let inputType = "any";
    let outputType = "string";
    if (node.parameters.length > 0) {
      const param = node.parameters[0];
      if (param.type) {
        inputType = param.type.getText(sourceFile);
      } else {
        const paramType = typeChecker.getTypeAtLocation(param);
        inputType = typeChecker.typeToString(paramType);
      }
    }
    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isFunctionExpression(node)) &&
      node.type
    ) {
      outputType = node.type.getText(sourceFile);
    } else {
      const returnType = typeChecker.getTypeAtLocation(node);
      outputType = typeChecker.typeToString(returnType);
    }
    if (outputType.startsWith("Promise<")) {
      outputType = outputType.slice(8, -1);
    }
    return { inputType, outputType };
  }

  function visit(node: ts.Node) {
    // Only process functions that are defined in this file and are either:
    // 1. Directly exported with export keyword
    // 2. Named in an export statement
    if (
      ts.isFunctionDeclaration(node) &&
      node.name &&
      node.getSourceFile() === sourceFile && // Only process functions defined in this file
      (node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ||
        exportedNames.has(node.name.text))
    ) {
      const { inputType, outputType } = getTypeParametersFromFunction(node);
      workflowInfos.push({
        name: node.name.text,
        componentName: node.name.text,
        inputType,
        outputType,
        isStreamComponent: false,
      });
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
  if (checker.isArrayType(tsType)) {
    const elementType =
      (tsType as ts.TypeReference).typeArguments?.[0] ?? checker.getAnyType();
    return {
      type: "array",
      items: typeToSchema(elementType, checker),
    };
  }
  if (tsType.isUnion()) {
    // Remove undefined from union for optional properties
    const types = tsType.types;
    const nonUndefinedTypes = types.filter(
      (t) => !(t.flags & ts.TypeFlags.Undefined),
    );
    // If this is an optional property and the only difference is undefined, just use the non-undefined type
    if (isOptionalProp && nonUndefinedTypes.length === 1) {
      return typeToSchema(nonUndefinedTypes[0], checker);
    }
    // Handle union with null (not undefined)
    if (types.some((t) => t.flags & ts.TypeFlags.Null)) {
      const nonNullTypes = types.filter((t) => !(t.flags & ts.TypeFlags.Null));
      if (nonNullTypes.length === 1) {
        return {
          oneOf: [typeToSchema(nonNullTypes[0], checker), { type: "null" }],
        };
      }
    }
    return {
      oneOf: nonUndefinedTypes.map((t) => typeToSchema(t, checker)),
    };
  }
  if (tsType.isIntersection()) {
    return {
      allOf: tsType.types.map((t) => typeToSchema(t, checker)),
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
        properties[prop.name] = typeToSchema(propType, checker, isOptional);
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

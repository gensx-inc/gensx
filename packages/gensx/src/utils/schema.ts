// eslint-disable @typescript-eslint/no-unnecessary-condition

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import * as ts from "typescript";
import { Definition } from "typescript-json-schema";

/**
 * Information about a Workflow extracted from the source code
 */
interface WorkflowInfo {
  name: string;
  componentName: string;
  inputType: ts.Type;
  outputType: ts.Type;
  isStreamComponent: boolean;
  isPublic: boolean;
}

/**
 * Context for workflow extraction containing collected metadata
 */
interface ExtractionContext {
  exportedNames: Set<string>;
  workflowIdentifiers: Set<string>;
  reExportedWorkflows: Map<string, WorkflowInfo>;
  visitedFiles: Set<string>;
}

/**
 * Centralized logging for schema generation
 */
const SchemaLogger = {
  warnUndefinedWorkflow: (componentName: string) => {
    console.warn(
      `\n\nWorkflow name is undefined for component: ${componentName}\n\n`,
    );
  },
};

/**
 * Generates JSON Schema for all workflows in a TypeScript file
 */
export function generateSchema(
  tsFile: string,
  tsConfigFile?: string,
): Record<string, { input: Definition; output: Definition; config: { requireAuthToTrigger: boolean } }> {
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
    { input: Definition; output: Definition; config: { requireAuthToTrigger: boolean } }
  > = {};

  for (const workflow of workflowInfo) {
    const workflowName = workflow.name;
    if (!workflowName) {
      SchemaLogger.warnUndefinedWorkflow(workflow.componentName);
      continue;
    }

    // Use the types directly from the workflow function
    const inputSchema = createSchemaFromType(
      workflow.inputType,
      typeChecker,
      sourceFile,
    );
    const outputSchema = createSchemaFromType(
      workflow.outputType,
      typeChecker,
      sourceFile,
    );

    workflowSchemas[workflowName] = {
      input: inputSchema,
      output: outputSchema,
      config: {
        requireAuthToTrigger: !workflow.isPublic,
      },
    };
  }

  return workflowSchemas;
}

/**
 * Extracts workflow information from a TypeScript source file
 */
function extractWorkflowInfo(
  sourceFile: ts.SourceFile,
  typeChecker: ts.TypeChecker,
): WorkflowInfo[] {
  const context: ExtractionContext = {
    exportedNames: new Set<string>(),
    workflowIdentifiers: new Set<string>(),
    reExportedWorkflows: new Map<string, WorkflowInfo>(),
    visitedFiles: new Set<string>(),
  };

  // First pass: collect all exports and re-exports
  collectMetadata(sourceFile, typeChecker, context);

  // Second pass: find workflow definitions
  const workflowInfos = findWorkflowDefinitions(
    sourceFile,
    typeChecker,
    context,
  );

  // Add re-exported workflows
  for (const [localName, workflow] of context.reExportedWorkflows) {
    if (context.exportedNames.has(localName)) {
      workflowInfos.push(workflow);
    }
  }

  return workflowInfos;
}

/**
 * Collects imports, exports, and workflow identifiers from the source file
 */
function collectMetadata(
  sourceFile: ts.SourceFile,
  typeChecker: ts.TypeChecker,
  context: ExtractionContext,
): void {
  // First collect all exports
  function collectExports(node: ts.Node) {
    if (ts.isExportDeclaration(node)) {
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const element of node.exportClause.elements) {
          context.exportedNames.add(element.name.text);
        }
      }
    } else if (ts.isVariableStatement(node)) {
      const hasExportModifier = node.modifiers?.some(
        (m) => m.kind === ts.SyntaxKind.ExportKeyword,
      );
      if (hasExportModifier) {
        for (const declaration of node.declarationList.declarations) {
          context.exportedNames.add(declaration.name.getText(sourceFile));
        }
      }
    }
    ts.forEachChild(node, collectExports);
  }

  // Then collect imports and re-exports
  function collectImportsAndReExports(node: ts.Node) {
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier
        .getText(sourceFile)
        .replace(/['"]/g, "");

      if (moduleSpecifier === "@gensx/core") {
        // Collect Workflow identifiers from @gensx/core imports
        const namedBindings = node.importClause?.namedBindings;
        if (namedBindings) {
          if (ts.isNamespaceImport(namedBindings)) {
            const namespaceName = namedBindings.name.text;
            context.workflowIdentifiers.add(`${namespaceName}.Workflow`);
          } else if (ts.isNamedImports(namedBindings)) {
            for (const element of namedBindings.elements) {
              const importedName =
                element.propertyName?.text ?? element.name.text;
              if (importedName === "Workflow") {
                context.workflowIdentifiers.add(element.name.text);
              }
            }
          }
        }
      } else {
        // Handle re-exported workflows from other files
        const namedBindings = node.importClause?.namedBindings;
        if (namedBindings && ts.isNamedImports(namedBindings)) {
          const symbol = typeChecker.getSymbolAtLocation(node.moduleSpecifier);
          const importedSourceFile = symbol?.valueDeclaration?.getSourceFile();

          if (importedSourceFile && importedSourceFile !== sourceFile) {
            const importedWorkflows = findWorkflowsInFile(
              importedSourceFile,
              typeChecker,
              context.visitedFiles,
            );

            for (const element of namedBindings.elements) {
              const importedName =
                element.propertyName?.text ?? element.name.text;
              const localName = element.name.text;

              const workflow = importedWorkflows.find(
                (w) => w.componentName === importedName,
              );
              if (workflow) {
                // Create a new workflow info with the local name
                const reExportedWorkflow = {
                  ...workflow,
                  componentName: localName,
                };
                context.reExportedWorkflows.set(localName, reExportedWorkflow);
              }
            }
          }
        }
      }
    } else if (ts.isExportDeclaration(node)) {
      // Handle export { ... } from "file.ts" statements
      if (
        node.exportClause &&
        ts.isNamedExports(node.exportClause) &&
        node.moduleSpecifier
      ) {
        const symbol = typeChecker.getSymbolAtLocation(node.moduleSpecifier);
        const importedSourceFile = symbol?.valueDeclaration?.getSourceFile();

        if (importedSourceFile && importedSourceFile !== sourceFile) {
          const importedWorkflows = findWorkflowsInFile(
            importedSourceFile,
            typeChecker,
            context.visitedFiles,
          );

          for (const element of node.exportClause.elements) {
            const importedName =
              element.propertyName?.text ?? element.name.text;
            const localName = element.name.text;

            const workflow = importedWorkflows.find(
              (w) => w.componentName === importedName,
            );
            if (workflow) {
              // Create a new workflow info with the local name
              const reExportedWorkflow = {
                ...workflow,
                componentName: localName,
              };
              context.reExportedWorkflows.set(localName, reExportedWorkflow);
            }
          }
        }
      }
    }

    ts.forEachChild(node, collectImportsAndReExports);
  }

  // First collect all exports
  collectExports(sourceFile);
  // Then collect imports and re-exports
  collectImportsAndReExports(sourceFile);
}

/**
 * Finds workflow definitions in the source file
 */
function findWorkflowDefinitions(
  sourceFile: ts.SourceFile,
  typeChecker: ts.TypeChecker,
  context: ExtractionContext,
): WorkflowInfo[] {
  const workflowInfos: WorkflowInfo[] = [];

  function visitNode(node: ts.Node) {
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      ts.isCallExpression(node.initializer)
    ) {
      const callExpression = node.initializer;
      const expression = callExpression.expression;

      // Check if this is a Workflow call
      let isWorkflowCall = false;
      if (ts.isPropertyAccessExpression(expression)) {
        const fullExpression = expression.getText(sourceFile);
        isWorkflowCall = context.workflowIdentifiers.has(fullExpression);
      } else if (ts.isIdentifier(expression)) {
        isWorkflowCall = context.workflowIdentifiers.has(expression.text);
      }

      if (isWorkflowCall) {
        // Extract workflow name (TypeScript guarantees arguments[0] exists)
        const workflowName = callExpression.arguments[0]
          .getText(sourceFile)
          .replace(/['"]/g, "");
        const workflowFunction = callExpression.arguments[1];
        const workflowOpts = callExpression.arguments[2]; // Optional third parameter

        // Validate workflow function
        if (
          workflowName &&
          (ts.isArrowFunction(workflowFunction) ||
            ts.isFunctionExpression(workflowFunction))
        ) {
          const variableName = node.name.getText(sourceFile);
          // Check if this is exported (either directly or through re-export)
          const isExported =
            context.exportedNames.has(variableName) ||
            context.reExportedWorkflows.has(variableName);

          if (isExported) {
            const { inputType, outputType } = extractWorkflowTypes(
              workflowFunction,
              typeChecker,
            );

            // Extract public option from workflowOpts
            const isPublic = extractPublicOption(workflowOpts, sourceFile);

            workflowInfos.push({
              name: workflowName,
              componentName: variableName,
              inputType,
              outputType,
              isStreamComponent: false,
              isPublic,
            });
          }
        }
      }
    }

    ts.forEachChild(node, visitNode);
  }

  visitNode(sourceFile);
  return workflowInfos;
}

/**
 * Extracts input and output types from a workflow function
 */
function extractWorkflowTypes(
  workflowFunction: ts.ArrowFunction | ts.FunctionExpression,
  typeChecker: ts.TypeChecker,
): { inputType: ts.Type; outputType: ts.Type } {
  let inputType: ts.Type = typeChecker.getAnyType();
  let outputType: ts.Type = typeChecker.getAnyType();

  // Extract input type from first parameter
  if (workflowFunction.parameters.length > 0) {
    inputType = typeChecker.getTypeAtLocation(workflowFunction.parameters[0]);
  }

  // Extract output type from function signature
  const signature = typeChecker.getSignatureFromDeclaration(workflowFunction);
  if (signature) {
    outputType = typeChecker.getReturnTypeOfSignature(signature);

    // Unwrap Promise<T> for output
    const symbolName = outputType.symbol.name;
    if (symbolName === "Promise") {
      const typeArgs = (outputType as ts.TypeReference).typeArguments;
      if (typeArgs && typeArgs.length > 0) {
        outputType = typeArgs[0];
      }
    }
  }

  return { inputType, outputType };
}

/**
 * Extracts the public option from workflow options
 */
function extractPublicOption(
  workflowOpts: ts.Expression | undefined,
  sourceFile: ts.SourceFile,
): boolean {
  if (!workflowOpts) {
    return false; // Default to private if no options provided
  }

  // Handle object literal expressions
  if (ts.isObjectLiteralExpression(workflowOpts)) {
    for (const property of workflowOpts.properties) {
      if (
        ts.isPropertyAssignment(property) &&
        ts.isIdentifier(property.name) &&
        property.name.text === "public"
      ) {
        const value = property.initializer;
        
        // Handle boolean literals
        if (value.kind === ts.SyntaxKind.TrueKeyword) {
          return true;
        } else if (value.kind === ts.SyntaxKind.FalseKeyword) {
          return false;
        } else {
          // If it's not a plain boolean literal, throw an error
          const valueText = value.getText(sourceFile);
          throw new Error(
            `The 'public' option must be a boolean literal (true or false), but got: ${valueText}`
          );
        }
      }
    }
  } else {
    // If workflowOpts is not an object literal, it could be a variable reference
    // In this case, we can't statically analyze it, so throw an error
    const optsText = workflowOpts.getText(sourceFile);
    throw new Error(
      `Workflow options must be an object literal to extract the 'public' option, but got: ${optsText}`
    );
  }

  return false; // Default to private if public property not found
}

/**
 * Helper function to find workflows in a file (for re-exports)
 */
function findWorkflowsInFile(
  sourceFile: ts.SourceFile,
  typeChecker: ts.TypeChecker,
  visitedFiles: Set<string> = new Set<string>(),
): WorkflowInfo[] {
  // Check if we've already visited this file
  const filePath = sourceFile.fileName;

  if (visitedFiles.has(filePath)) {
    return [];
  }
  visitedFiles.add(filePath);

  const workflows: WorkflowInfo[] = [];
  const workflowIdentifiers = new Set<string>();

  // First pass: collect workflow identifiers
  function collectIdentifiers(node: ts.Node) {
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier
        .getText(sourceFile)
        .replace(/['"]/g, "");
      if (
        moduleSpecifier === "@gensx/core" &&
        node.importClause?.namedBindings
      ) {
        if (ts.isNamespaceImport(node.importClause.namedBindings)) {
          const namespaceName = node.importClause.namedBindings.name.text;
          workflowIdentifiers.add(`${namespaceName}.Workflow`);
        } else if (ts.isNamedImports(node.importClause.namedBindings)) {
          for (const element of node.importClause.namedBindings.elements) {
            if (
              (element.propertyName?.text ?? element.name.text) === "Workflow"
            ) {
              workflowIdentifiers.add(element.name.text);
            }
          }
        }
      }
    }
    ts.forEachChild(node, collectIdentifiers);
  }

  // Second pass: find workflows
  function findWorkflows(node: ts.Node) {
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      ts.isCallExpression(node.initializer)
    ) {
      const initializer = node.initializer;
      let isWorkflowCall = false;

      if (ts.isPropertyAccessExpression(initializer.expression)) {
        const fullExpression = initializer.expression.getText(sourceFile);
        isWorkflowCall = workflowIdentifiers.has(fullExpression);
      } else if (ts.isIdentifier(initializer.expression)) {
        isWorkflowCall = workflowIdentifiers.has(initializer.expression.text);
      }

      if (isWorkflowCall) {
        const workflowNameArg = initializer.arguments[0];
        const workflowName = workflowNameArg
          .getText(sourceFile)
          .replace(/['"]/g, "");
        const workflowFn = initializer.arguments[1];
        const workflowOpts = initializer.arguments[2]; // Optional third parameter

        if (
          workflowName &&
          (ts.isArrowFunction(workflowFn) ||
            ts.isFunctionExpression(workflowFn))
        ) {
          let inputType: ts.Type = typeChecker.getAnyType();
          let outputType: ts.Type = typeChecker.getAnyType();

          if (workflowFn.parameters.length > 0) {
            inputType = typeChecker.getTypeAtLocation(workflowFn.parameters[0]);
          }

          const signature = typeChecker.getSignatureFromDeclaration(workflowFn);
          if (signature) {
            outputType = typeChecker.getReturnTypeOfSignature(signature);

            // Unwrap Promise<T> for output
            const symbolName = outputType.symbol.name;
            if (symbolName === "Promise") {
              const typeArgs = (outputType as ts.TypeReference).typeArguments;
              if (typeArgs && typeArgs.length > 0) {
                outputType = typeArgs[0];
              }
            }
          }

          // Extract public option from workflowOpts
          const isPublic = extractPublicOption(workflowOpts, sourceFile);

          workflows.push({
            name: workflowName,
            componentName: node.name.getText(sourceFile),
            inputType,
            outputType,
            isStreamComponent: false,
            isPublic,
          });
        }
      }
    }
    ts.forEachChild(node, findWorkflows);
  }

  collectIdentifiers(sourceFile);
  findWorkflows(sourceFile);
  return workflows;
}

/**
 * Creates a JSON Schema from a TypeScript type with special handling for streaming types
 */
function createSchemaFromType(
  tsType: ts.Type,
  typeChecker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
  isOptionalProp = false,
  depth = 0,
  visitedTypes = new Set<number>(),
  typeDefinitions: Record<string, Definition> = {},
  propertyName?: string,
): Definition {
  // Handle empty object type
  if (
    tsType.flags & ts.TypeFlags.Object &&
    Object.keys(tsType.getProperties()).length === 0
  ) {
    return {
      type: "object",
      properties: {},
      required: [],
    };
  }

  // Handle array types
  if (tsType.flags & ts.TypeFlags.Object) {
    const symbol = tsType.getSymbol();
    if (symbol?.name === "Array" || symbol?.name === "ReadonlyArray") {
      const typeArgs = (tsType as ts.TypeReference).typeArguments;
      if (typeArgs && typeArgs.length > 0) {
        return {
          type: "array",
          items: createSchemaFromType(
            typeArgs[0],
            typeChecker,
            sourceFile,
            false,
            depth + 1,
            visitedTypes,
            typeDefinitions,
          ),
        };
      }
    }
  }

  // Get the type name if it's a named type
  // eslint-disable-next-line
  const typeName = tsType.symbol?.escapedName?.toString();
  // TypeScript's internal type ID is a number
  const typeId = (tsType as unknown as { id: number }).id;

  // If we've seen this type before and it's a named type, use $ref
  if (visitedTypes.has(typeId) && typeName) {
    // Create the type definition if it doesn't exist
    typeDefinitions[typeName] ??= createTypeDefinition(
      tsType,
      typeChecker,
      sourceFile,
      depth,
      visitedTypes,
      typeDefinitions,
    );
    return { $ref: `#/definitions/${typeName}` };
  }

  visitedTypes.add(typeId);

  // Prevent excessive depth
  if (depth > 10) {
    return {
      type: "object" as const,
      description: "Complex type exceeded maximum depth",
      additionalProperties: true,
    };
  }

  // Handle streaming types first
  const streamSchema = detectAndHandleStreamingType(
    tsType,
    typeChecker,
    sourceFile,
  );
  if (streamSchema) {
    return streamSchema;
  }

  // Handle basic primitive types
  if (tsType.isStringLiteral()) {
    return { type: "string" as const, enum: [tsType.value] };
  }
  if (tsType.isNumberLiteral()) {
    return { type: "number" as const, enum: [tsType.value] };
  }
  if (tsType.flags & ts.TypeFlags.String) {
    return { type: "string" as const };
  }
  if (tsType.flags & ts.TypeFlags.Number) {
    return { type: "number" as const };
  }
  if (tsType.flags & ts.TypeFlags.Boolean) {
    return { type: "boolean" as const };
  }
  if (tsType.flags & ts.TypeFlags.Null) {
    return { type: "null" as const };
  }
  if (tsType.flags & ts.TypeFlags.Any) {
    // Special case: if the type is 'any' and has no properties, treat as no input (empty schema)
    if (tsType.getProperties().length === 0) {
      console.warn(
        `Warning: Found 'any' or 'unknown' type '${propertyName ?? "unknown"}'.`,
      );
      return {};
    }
    return { type: "object" as const, additionalProperties: true };
  }
  if (tsType.flags & ts.TypeFlags.Undefined) {
    return isOptionalProp ? {} : { type: "null" as const };
  }

  // Handle unions
  if (tsType.isUnion()) {
    const types = tsType.types;
    const nonUndefinedTypes = types.filter(
      (t) => !(t.flags & ts.TypeFlags.Undefined),
    );

    // Special case: if this is a union of only string literals, just return string type
    if (nonUndefinedTypes.every((t) => t.isStringLiteral())) {
      return { type: "string" as const };
    }

    // If this is an optional property and the only difference is undefined, just use the non-undefined type
    if (isOptionalProp && nonUndefinedTypes.length === 1) {
      return createSchemaFromType(
        nonUndefinedTypes[0],
        typeChecker,
        sourceFile,
        false,
        depth + 1,
        visitedTypes,
        typeDefinitions,
        propertyName,
      );
    }

    // Handle union with null (not undefined)
    if (types.some((t) => t.flags & ts.TypeFlags.Null)) {
      const nonNullTypes = types.filter((t) => !(t.flags & ts.TypeFlags.Null));
      if (nonNullTypes.length === 1) {
        return {
          oneOf: [
            createSchemaFromType(
              nonNullTypes[0],
              typeChecker,
              sourceFile,
              false,
              depth + 1,
              visitedTypes,
              typeDefinitions,
              propertyName,
            ),
            { type: "null" as const },
          ],
        };
      }
    }

    return {
      oneOf: nonUndefinedTypes.map((t) =>
        createSchemaFromType(
          t,
          typeChecker,
          sourceFile,
          false,
          depth + 1,
          visitedTypes,
          typeDefinitions,
          propertyName,
        ),
      ),
    };
  }

  // Handle intersections
  if (tsType.isIntersection()) {
    return {
      allOf: tsType.types.map((t) =>
        createSchemaFromType(
          t,
          typeChecker,
          sourceFile,
          false,
          depth + 1,
          visitedTypes,
          typeDefinitions,
          propertyName,
        ),
      ),
    };
  }

  // Handle object types (interfaces, type literals)
  if (tsType.getProperties().length > 0) {
    const properties: Record<string, Definition> = {};
    const required: string[] = [];

    for (const prop of tsType.getProperties()) {
      const decl = prop.valueDeclaration ?? prop.declarations?.[0];
      if (decl) {
        const propType = typeChecker.getTypeOfSymbolAtLocation(prop, decl);
        const isOptional = !!(prop.getFlags() & ts.SymbolFlags.Optional);
        properties[prop.name] = createSchemaFromType(
          propType,
          typeChecker,
          sourceFile,
          isOptional,
          depth + 1,
          visitedTypes,
          typeDefinitions,
          prop.name,
        );
        if (!isOptional) {
          required.push(prop.name);
        }
      }
    }

    const schema: Definition = {
      type: "object" as const,
      properties,
      required: required.length > 0 ? required.sort() : undefined,
    };

    // If this is a named type, store its definition
    if (typeName) {
      typeDefinitions[typeName] = schema;
    }

    return schema;
  }

  // Fallback for unknown types
  return {
    type: "object" as const,
    description: `Unrecognized or complex type: ${typeChecker.typeToString(tsType)}`,
    additionalProperties: true,
  };
}

/**
 * Creates a type definition for a named type
 */
function createTypeDefinition(
  tsType: ts.Type,
  typeChecker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
  depth: number,
  visitedTypes: Set<number>,
  typeDefinitions: Record<string, Definition>,
): Definition {
  // Create a temporary set without the current type to avoid immediate recursion
  const tempVisitedTypes = new Set(visitedTypes);
  tempVisitedTypes.delete((tsType as unknown as { id: number }).id);

  // Create the type definition
  return createSchemaFromType(
    tsType,
    typeChecker,
    sourceFile,
    false,
    depth,
    tempVisitedTypes,
    typeDefinitions,
  );
}

/**
 * Detects and handles streaming types (AsyncIterable, AsyncGenerator, etc.)
 */
function detectAndHandleStreamingType(
  tsType: ts.Type,
  typeChecker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
): Definition | null {
  const typeStr = typeChecker.typeToString(tsType);

  // Check for streaming types
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
        const valueSchema = createSchemaFromType(
          innerType,
          typeChecker,
          sourceFile,
        );
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
        const valueSchema = convertSimpleTypeToSchema(innerTypeStr);
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

  return null; // Not a streaming type
}

/**
 * Converts simple TypeScript type strings to JSON Schema (for streaming type parsing)
 */
function convertSimpleTypeToSchema(typeStr: string): Definition {
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

  // Default to string for unknown types in streaming context
  return { type: "string" };
}

/**
 * Parses an inline object type into a JSON Schema Definition (for streaming type parsing)
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
    properties[propName] = convertSimpleTypeToSchema(propType.trim());
  }

  return {
    type: "object",
    properties,
    required: requiredFields.length > 0 ? requiredFields.sort() : undefined,
  };
}

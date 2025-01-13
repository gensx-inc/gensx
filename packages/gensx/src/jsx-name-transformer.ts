import * as ts from "typescript";

const DEBUG = true;

function log(...args: unknown[]) {
  if (DEBUG) {
    console.log(...args);
  }
}

function getComponentName(node: ts.Expression): string {
  if (ts.isIdentifier(node)) {
    log("[JSX Transformer] Found identifier:", node.text);
    return node.text;
  }
  if (ts.isPropertyAccessExpression(node)) {
    log("[JSX Transformer] Found property access:", node.name.text);
    return node.name.text;
  }
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
    // For Component calls like gsx.Component(...), use the variable name it's assigned to
    const parent = node.parent;
    if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
      log("[JSX Transformer] Found component declaration:", parent.name.text);
      return parent.name.text;
    }
    log("[JSX Transformer] Found call expression:", node.expression.text);
    return node.expression.text;
  }
  log("[JSX Transformer] Unknown node type:", ts.SyntaxKind[node.kind]);
  return "";
}

function processJsxCall(
  node: ts.CallExpression,
  context: ts.TransformationContext,
): ts.Node {
  // Get the component type (first argument)
  const componentArg = node.arguments[0];
  const elementName = getComponentName(componentArg);
  log("[JSX Transformer] Processing component:", {
    elementName,
    kind: ts.SyntaxKind[componentArg.kind],
    text: ts.isIdentifier(componentArg) ? componentArg.text : undefined,
  });

  // Get the props object (second argument)
  const propsArg = node.arguments[1];
  if (!ts.isObjectLiteralExpression(propsArg)) {
    log("[JSX Transformer] Props not an object literal:", {
      kind: ts.SyntaxKind[propsArg.kind],
    });
    return node;
  }

  // Create updated call with element name
  const result = ts.factory.updateCallExpression(
    node,
    node.expression,
    node.typeArguments,
    [...node.arguments, ts.factory.createStringLiteral(elementName)],
  );

  // Process children prop for nested JSX
  const childrenProp = propsArg.properties.find(
    prop =>
      ts.isPropertyAssignment(prop) &&
      ts.isIdentifier(prop.name) &&
      prop.name.text === "children",
  );

  if (childrenProp && ts.isPropertyAssignment(childrenProp)) {
    log("[JSX Transformer] Found children prop:", {
      valueKind: ts.SyntaxKind[childrenProp.initializer.kind],
      text: ts.isArrowFunction(childrenProp.initializer)
        ? "ArrowFunction"
        : undefined,
    });

    // Create a visitor that will process all nested JSX calls
    const visitor: ts.Visitor = (node): ts.Node => {
      log("[JSX Transformer] Visiting node:", {
        kind: ts.SyntaxKind[node.kind],
        isJsx:
          ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) &&
          (node.expression.text === "jsx" || node.expression.text === "jsxs"),
      });

      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        (node.expression.text === "jsx" || node.expression.text === "jsxs")
      ) {
        return processJsxCall(node, context);
      }

      // Make sure we visit the body of arrow functions
      if (ts.isArrowFunction(node)) {
        log("[JSX Transformer] Found arrow function, visiting body");
        const visitedBody = ts.visitNode(node.body, visitor) || node.body;
        if (visitedBody !== node.body && ts.isConciseBody(visitedBody)) {
          return ts.factory.updateArrowFunction(
            node,
            node.modifiers,
            node.typeParameters,
            node.parameters,
            node.type,
            node.equalsGreaterThanToken,
            visitedBody,
          );
        }
      }

      return ts.visitEachChild(node, visitor, context);
    };

    // Visit the children prop's value
    const visited =
      ts.visitNode(childrenProp.initializer, visitor) ||
      childrenProp.initializer;
    if (visited !== childrenProp.initializer && ts.isExpression(visited)) {
      log("[JSX Transformer] Updated children prop");
      // Update the children prop with the processed value
      const updatedProps = ts.factory.updateObjectLiteralExpression(
        propsArg,
        propsArg.properties.map(prop =>
          prop === childrenProp
            ? ts.factory.updatePropertyAssignment(
                childrenProp,
                childrenProp.name,
                visited,
              )
            : prop,
        ),
      );
      return ts.factory.updateCallExpression(
        result,
        result.expression,
        result.typeArguments,
        [result.arguments[0], updatedProps, result.arguments[2]],
      );
    }
  }

  return result;
}

export function createJsxNameTransformer(): ts.TransformerFactory<ts.SourceFile> {
  return context => {
    const visitor: ts.Visitor = (node): ts.Node => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        (node.expression.text === "jsx" || node.expression.text === "jsxs")
      ) {
        return processJsxCall(node, context);
      }
      return ts.visitEachChild(node, visitor, context);
    };

    return sourceFile => {
      log("[JSX Transformer] Processing file:", sourceFile.fileName);
      return ts.visitNode(sourceFile, visitor) as ts.SourceFile;
    };
  };
}

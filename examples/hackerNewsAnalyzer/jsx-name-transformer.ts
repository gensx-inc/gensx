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
  outerVisitor: ts.Visitor,
): ts.Node {
  // Get the component type (first argument)
  const componentArg = node.arguments[0];
  log("[JSX Transformer] Processing JSX call arguments:", {
    numArgs: node.arguments.length,
    arg0Kind: ts.SyntaxKind[componentArg.kind],
    arg1Kind: node.arguments[1]
      ? ts.SyntaxKind[node.arguments[1].kind]
      : "none",
    hasElementName: node.arguments.length > 2,
  });

  // Get the props object (second argument)
  const propsArg = node.arguments[1];
  if (!ts.isObjectLiteralExpression(propsArg)) {
    log("[JSX Transformer] Early return: props not an object literal:", {
      kind: propsArg ? ts.SyntaxKind[propsArg.kind] : "none",
    });
    return node;
  }

  // Process children prop if it exists
  const updatedProps = ts.factory.updateObjectLiteralExpression(
    propsArg,
    propsArg.properties.map((prop) => {
      if (
        ts.isPropertyAssignment(prop) &&
        ts.isIdentifier(prop.name) &&
        prop.name.text === "children"
      ) {
        log("[JSX Transformer] Found children prop:", {
          propKind: ts.SyntaxKind[prop.initializer.kind],
          isArrowFn: ts.isArrowFunction(prop.initializer),
        });

        // If it's an arrow function, we need to process its body
        if (ts.isArrowFunction(prop.initializer)) {
          const visitedBody = ts.visitNode(prop.initializer.body, outerVisitor);
          if (
            visitedBody !== prop.initializer.body &&
            ts.isExpression(visitedBody)
          ) {
            log("[JSX Transformer] Updated children function body:", {
              oldKind: ts.SyntaxKind[prop.initializer.body.kind],
              newKind: ts.SyntaxKind[visitedBody.kind],
            });
            return ts.factory.updatePropertyAssignment(
              prop,
              prop.name,
              ts.factory.updateArrowFunction(
                prop.initializer,
                prop.initializer.modifiers,
                prop.initializer.typeParameters,
                prop.initializer.parameters,
                prop.initializer.type,
                prop.initializer.equalsGreaterThanToken,
                visitedBody,
              ),
            );
          }
        }

        // For non-arrow function children, visit the value directly
        const visitedValue = ts.visitNode(prop.initializer, outerVisitor);
        if (
          visitedValue !== prop.initializer &&
          ts.isExpression(visitedValue)
        ) {
          log("[JSX Transformer] Updated children prop value:", {
            oldKind: ts.SyntaxKind[prop.initializer.kind],
            newKind: ts.SyntaxKind[visitedValue.kind],
          });
          return ts.factory.updatePropertyAssignment(
            prop,
            prop.name,
            visitedValue,
          );
        }
      }
      return prop;
    }),
  );

  // If we already have an element name, just update the props
  if (node.arguments.length > 2) {
    log("[JSX Transformer] Updating props in existing JSX call");
    return ts.factory.updateCallExpression(
      node,
      node.expression,
      node.typeArguments,
      [node.arguments[0], updatedProps, node.arguments[2]],
    );
  }

  // Add element name for new JSX calls
  const elementName = getComponentName(componentArg);
  log("[JSX Transformer] Adding element name to JSX call:", {
    elementName,
    text: ts.isIdentifier(componentArg) ? componentArg.text : undefined,
  });

  return ts.factory.createCallExpression(node.expression, node.typeArguments, [
    componentArg,
    updatedProps,
    ts.factory.createStringLiteral(elementName),
  ]);
}

export function createJsxNameTransformer(): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    const visitor: ts.Visitor = (node): ts.Node => {
      // Handle JSX expressions (the {...} parts)
      if (ts.isJsxExpression(node)) {
        log("[JSX Transformer] Found JSX expression:", {
          hasExpression: !!node.expression,
          expressionKind: node.expression
            ? ts.SyntaxKind[node.expression.kind]
            : "none",
        });
        return node.expression || ts.factory.createIdentifier("undefined");
      }

      // Handle arrow functions to process their bodies
      if (ts.isArrowFunction(node)) {
        log("[JSX Transformer] Found arrow function:", {
          bodyKind: ts.SyntaxKind[node.body.kind],
          parentKind: node.parent ? ts.SyntaxKind[node.parent.kind] : "none",
        });

        // For block bodies, visit each statement
        if (ts.isBlock(node.body)) {
          const visitedBlock = ts.visitEachChild(node.body, visitor, context);
          return ts.factory.updateArrowFunction(
            node,
            node.modifiers,
            node.typeParameters,
            node.parameters,
            node.type,
            node.equalsGreaterThanToken,
            visitedBlock,
          );
        }

        // For expression bodies, visit the expression
        const visitedBody = ts.visitNode(node.body, visitor);
        if (visitedBody !== node.body && ts.isExpression(visitedBody)) {
          log("[JSX Transformer] Updated arrow function body:", {
            oldKind: ts.SyntaxKind[node.body.kind],
            newKind: ts.SyntaxKind[visitedBody.kind],
          });

          // If it's a parenthesized expression, we need to visit its contents
          if (ts.isParenthesizedExpression(visitedBody)) {
            const innerVisited = ts.visitNode(visitedBody.expression, visitor);
            if (
              innerVisited !== visitedBody.expression &&
              ts.isExpression(innerVisited)
            ) {
              return ts.factory.updateArrowFunction(
                node,
                node.modifiers,
                node.typeParameters,
                node.parameters,
                node.type,
                node.equalsGreaterThanToken,
                ts.factory.createParenthesizedExpression(innerVisited),
              );
            }
          }

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
        return node;
      }

      // Handle JSX elements directly
      if (ts.isJsxElement(node)) {
        const tagName = node.openingElement.tagName.getText();
        log("[JSX Transformer] Found JSX element:", { tagName });

        // Process JSX attributes first
        const processedAttributes = node.openingElement.attributes.properties
          .filter(ts.isJsxAttribute)
          .map((attr) => {
            const name = attr.name.getFullText();
            let value: ts.Expression;

            if (attr.initializer) {
              if (ts.isJsxExpression(attr.initializer)) {
                // Process JSX expressions in attributes (including function children)
                if (attr.initializer.expression) {
                  log("[JSX Transformer] Processing JSX attribute:", {
                    name,
                    expressionKind:
                      ts.SyntaxKind[attr.initializer.expression.kind],
                  });
                  const visitedExpr = ts.visitNode(
                    attr.initializer.expression,
                    visitor,
                  );
                  value = ts.isExpression(visitedExpr)
                    ? visitedExpr
                    : ts.factory.createTrue();
                } else {
                  value = ts.factory.createTrue();
                }
              } else {
                value = attr.initializer;
              }
            } else {
              value = ts.factory.createTrue();
            }

            return ts.factory.createPropertyAssignment(
              name,
              ts.isExpression(value) ? value : ts.factory.createTrue(),
            );
          });

        // Transform children between tags
        const transformedChildren = node.children
          .map((child) => {
            if (ts.isJsxExpression(child)) {
              log("[JSX Transformer] Processing JSX child expression:", {
                hasExpression: !!child.expression,
                expressionKind: child.expression
                  ? ts.SyntaxKind[child.expression.kind]
                  : "none",
              });
              // Visit the expression inside JSX expression
              if (child.expression) {
                const visitedExpr = ts.visitNode(child.expression, visitor);
                return ts.isExpression(visitedExpr) ? visitedExpr : undefined;
              }
            }
            return ts.visitNode(child, visitor);
          })
          .filter(
            (child): child is ts.Expression =>
              child !== undefined && ts.isExpression(child),
          );

        const hasChildren = transformedChildren.length > 0;

        // Create props with children
        const props = ts.factory.createObjectLiteralExpression([
          // Processed attributes
          ...processedAttributes,
          // Add children if present
          ...(hasChildren
            ? [
                ts.factory.createPropertyAssignment(
                  "children",
                  transformedChildren.length === 1
                    ? transformedChildren[0]
                    : ts.factory.createArrayLiteralExpression(
                        transformedChildren,
                      ),
                ),
              ]
            : []),
        ]);

        // Create the _jsx/_jsxs call with element name
        const jsxCall = ts.factory.createCallExpression(
          ts.factory.createIdentifier(hasChildren ? "_jsxs" : "_jsx"),
          undefined,
          [
            ts.factory.createIdentifier(tagName),
            props,
            ts.factory.createStringLiteral(tagName),
          ],
        );

        // Visit the created call to handle any nested JSX
        return ts.visitNode(jsxCall, visitor);
      }

      // Handle JSX self-closing elements
      if (ts.isJsxSelfClosingElement(node)) {
        const tagName = node.tagName.getText();
        log("[JSX Transformer] Found JSX self-closing element:", { tagName });

        // Create the _jsx call with element name
        const jsxCall = ts.factory.createCallExpression(
          ts.factory.createIdentifier("_jsx"),
          undefined,
          [
            ts.factory.createIdentifier(tagName),
            ts.factory.createObjectLiteralExpression(
              node.attributes.properties
                .filter(ts.isJsxAttribute)
                .map((attr) => {
                  const name = attr.name.getFullText();
                  const value = attr.initializer
                    ? ts.isJsxExpression(attr.initializer)
                      ? attr.initializer.expression || ts.factory.createTrue()
                      : attr.initializer
                    : ts.factory.createTrue();
                  return ts.factory.createPropertyAssignment(
                    name,
                    ts.isExpression(value) ? value : ts.factory.createTrue(),
                  );
                }),
            ),
            ts.factory.createStringLiteral(tagName),
          ],
        );

        // Visit the created call to handle any nested JSX
        return ts.visitNode(jsxCall, visitor);
      }

      // Handle existing _jsx calls
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        (node.expression.text === "_jsx" || node.expression.text === "_jsxs")
      ) {
        log("[JSX Transformer] Found _jsx/_jsxs call:", {
          fnName: node.expression.text,
          numArgs: node.arguments.length,
          hasElementName: node.arguments.length > 2,
          parentKind: node.parent ? ts.SyntaxKind[node.parent.kind] : "none",
        });

        // Only process if we don't have an element name
        if (node.arguments.length < 3) {
          const result = processJsxCall(node, context, visitor);
          // Visit the result again to handle any nested JSX
          return ts.visitNode(result, visitor);
        }
        return node;
      }

      return ts.visitEachChild(node, visitor, context);
    };

    return (sourceFile) => {
      if (sourceFile.fileName.endsWith(".tsx")) {
        log("[JSX Transformer] Processing TSX file:", sourceFile.fileName);
      }
      return ts.visitNode(sourceFile, visitor) as ts.SourceFile;
    };
  };
}

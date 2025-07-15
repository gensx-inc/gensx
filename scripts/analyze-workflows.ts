#!/usr/bin/env tsx

import { promises as fs } from "fs";
import * as path from "path";
import * as ts from "typescript";

// Types for our analysis
interface ComponentDefinition {
  name: string;
  type: "workflow" | "component";
  filePath: string;
  functionName?: string;
  dependencies: string[];
  sourceLocation: {
    line: number;
    column: number;
  };
}

interface WorkflowGraph {
  workflows: ComponentDefinition[];
  components: ComponentDefinition[];
  dependencies: {
    from: string;
    to: string;
    type: "workflow-to-component" | "component-to-component" | "workflow-to-workflow";
  }[];
}

class WorkflowAnalyzer {
  private sourceFile: ts.SourceFile | null = null;
  private filePath: string = "";
  private workflows: ComponentDefinition[] = [];
  private components: ComponentDefinition[] = [];
  private allIdentifiers: Set<string> = new Set();

  constructor() {}

  async analyzeFile(filePath: string): Promise<WorkflowGraph> {
    this.filePath = filePath;
    const fileContent = await fs.readFile(filePath, "utf-8");
    
    // Create TypeScript AST
    this.sourceFile = ts.createSourceFile(
      filePath,
      fileContent,
      ts.ScriptTarget.Latest,
      true
    );

    // Reset state
    this.workflows = [];
    this.components = [];
    this.allIdentifiers = new Set();

    // First pass: collect all workflow and component definitions
    this.collectDefinitions(this.sourceFile);
    
    // Second pass: analyze dependencies
    const allDefinitions = [...this.workflows, ...this.components];
    for (const definition of allDefinitions) {
      this.analyzeDependencies(definition);
    }

    // Build dependency graph
    const dependencies = this.buildDependencyGraph(allDefinitions);

    return {
      workflows: this.workflows,
      components: this.components,
      dependencies
    };
  }

  private collectDefinitions(node: ts.Node): void {
    // Look for variable declarations and function declarations
    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
          this.analyzeVariableDeclaration(declaration);
        }
      }
    }

    // Recursively visit children
    ts.forEachChild(node, child => this.collectDefinitions(child));
  }

  private analyzeVariableDeclaration(declaration: ts.VariableDeclaration): void {
    if (!declaration.initializer || !ts.isCallExpression(declaration.initializer)) {
      return;
    }

    const callExpression = declaration.initializer;
    const expression = callExpression.expression;

    // Check if it's a gensx.Workflow or gensx.Component call
    if (ts.isPropertyAccessExpression(expression)) {
      const { expression: object, name } = expression;
      
      if (ts.isIdentifier(object) && 
          object.escapedText === "gensx" && 
          ts.isIdentifier(name)) {
        
        const type = name.escapedText === "Workflow" ? "workflow" : 
                     name.escapedText === "Component" ? "component" : null;
        
        if (type && ts.isIdentifier(declaration.name)) {
          const componentName = declaration.name.escapedText as string;
          const args = callExpression.arguments;
          
          // Get the name from the first argument (should be a string literal)
          let definitionName = componentName;
          if (args.length > 0 && ts.isStringLiteral(args[0])) {
            definitionName = args[0].text;
          }

          const sourceLocation = this.getSourceLocation(declaration);
          
          const definition: ComponentDefinition = {
            name: definitionName,
            type,
            filePath: this.filePath,
            functionName: componentName,
            dependencies: [],
            sourceLocation
          };

          if (type === "workflow") {
            this.workflows.push(definition);
          } else {
            this.components.push(definition);
          }

          this.allIdentifiers.add(componentName);
        }
      }
    }
  }

  private analyzeDependencies(definition: ComponentDefinition): void {
    if (!this.sourceFile) return;

    // Find the function body of this definition
    const functionBody = this.findFunctionBody(definition.functionName);
    if (!functionBody) return;

    // Look for function calls within the body
    const dependencies = this.findFunctionCalls(functionBody);
    definition.dependencies = [...new Set(dependencies)]; // Remove duplicates
  }

  private findFunctionBody(functionName?: string): ts.Block | ts.Expression | null {
    if (!this.sourceFile || !functionName) return null;

    let functionBody: ts.Block | ts.Expression | null = null;

    const visit = (node: ts.Node): void => {
      // Look for variable declarations with the function name
      if (ts.isVariableDeclaration(node) && 
          ts.isIdentifier(node.name) && 
          node.name.escapedText === functionName &&
          node.initializer &&
          ts.isCallExpression(node.initializer)) {
        
        const args = node.initializer.arguments;
        // The function body should be the second or third argument
        for (let i = 1; i < args.length; i++) {
          if (ts.isArrowFunction(args[i]) || ts.isFunctionExpression(args[i])) {
            const func = args[i] as ts.ArrowFunction | ts.FunctionExpression;
            functionBody = func.body;
            return;
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(this.sourceFile);
    return functionBody;
  }

  private findFunctionCalls(body: ts.Block | ts.Expression): string[] {
    const calls: string[] = [];

    const visit = (node: ts.Node): void => {
      // Look for call expressions
      if (ts.isCallExpression(node)) {
        const expression = node.expression;
        
        // Direct function calls (e.g., Research(), WriteDraft())
        if (ts.isIdentifier(expression)) {
          const functionName = expression.escapedText as string;
          // Only include calls to functions we know are components/workflows
          if (this.allIdentifiers.has(functionName)) {
            calls.push(functionName);
          }
        }
        
        // Property access calls (e.g., openai.chat.completions.create())
        if (ts.isPropertyAccessExpression(expression)) {
          // For now, we'll skip these as they're typically external API calls
          // Could be enhanced to track wrapped SDK calls
        }
      }

      // Look for await expressions
      if (ts.isAwaitExpression(node) && node.expression) {
        visit(node.expression);
      }

      ts.forEachChild(node, visit);
    };

    visit(body);
    return calls;
  }

  private buildDependencyGraph(definitions: ComponentDefinition[]): WorkflowGraph["dependencies"] {
    const dependencies: WorkflowGraph["dependencies"] = [];
    const nameToDefinition = new Map<string, ComponentDefinition>();

    // Build lookup map
    for (const def of definitions) {
      if (def.functionName) {
        nameToDefinition.set(def.functionName, def);
      }
    }

    // Build dependency edges
    for (const definition of definitions) {
      for (const dependency of definition.dependencies) {
        const targetDefinition = nameToDefinition.get(dependency);
        if (targetDefinition) {
          const type = definition.type === "workflow" && targetDefinition.type === "component" 
            ? "workflow-to-component" as const
            : definition.type === "component" && targetDefinition.type === "component"
            ? "component-to-component" as const
            : "workflow-to-workflow" as const;

          dependencies.push({
            from: definition.name,
            to: targetDefinition.name,
            type
          });
        }
      }
    }

    return dependencies;
  }

  private getSourceLocation(node: ts.Node): { line: number; column: number } {
    if (!this.sourceFile) return { line: 0, column: 0 };
    
    const { line, character } = this.sourceFile.getLineAndCharacterOfPosition(node.getStart());
    return { line: line + 1, column: character + 1 };
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error("Usage: tsx analyze-workflows.ts <path-to-workflows.ts>");
    console.error("Example: tsx analyze-workflows.ts ./examples/blog-writer/src/workflows.ts");
    process.exit(1);
  }

  const filePath = path.resolve(args[0]);

  try {
    await fs.access(filePath);
  } catch (error) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const analyzer = new WorkflowAnalyzer();
  
  try {
    const graph = await analyzer.analyzeFile(filePath);
    
    // Output results
    console.log("🔍 Workflow Analysis Results");
    console.log("=" .repeat(50));
    
    // Show workflows
    if (graph.workflows.length > 0) {
      console.log("\n📋 Workflows:");
      for (const workflow of graph.workflows) {
        console.log(`  • ${workflow.name} (${workflow.functionName})`);
        console.log(`    Location: ${workflow.filePath}:${workflow.sourceLocation.line}:${workflow.sourceLocation.column}`);
        if (workflow.dependencies.length > 0) {
          console.log(`    Dependencies: ${workflow.dependencies.join(", ")}`);
        }
      }
    }

    // Show components
    if (graph.components.length > 0) {
      console.log("\n🔧 Components:");
      for (const component of graph.components) {
        console.log(`  • ${component.name} (${component.functionName})`);
        console.log(`    Location: ${component.filePath}:${component.sourceLocation.line}:${component.sourceLocation.column}`);
        if (component.dependencies.length > 0) {
          console.log(`    Dependencies: ${component.dependencies.join(", ")}`);
        }
      }
    }

    // Show dependency graph
    if (graph.dependencies.length > 0) {
      console.log("\n🔗 Dependency Graph:");
      for (const dep of graph.dependencies) {
        console.log(`  ${dep.from} → ${dep.to} (${dep.type})`);
      }
    }

    // Output JSON for programmatic use
    if (args.includes("--json")) {
      console.log("\n" + JSON.stringify(graph, null, 2));
    }

    // Generate Mermaid diagram
    if (args.includes("--mermaid")) {
      console.log("\n🎨 Mermaid Diagram:");
      console.log(generateMermaidDiagram(graph));
    }

  } catch (error) {
    console.error("Error analyzing file:", error);
    process.exit(1);
  }
}

function generateMermaidDiagram(graph: WorkflowGraph): string {
  const lines = ["graph TD"];
  
  // Add workflow nodes
  for (const workflow of graph.workflows) {
    lines.push(`    ${workflow.functionName}[${workflow.name}]:::workflow`);
  }
  
  // Add component nodes  
  for (const component of graph.components) {
    lines.push(`    ${component.functionName}[${component.name}]:::component`);
  }
  
  // Add dependencies
  for (const dep of graph.dependencies) {
    const fromNode = [...graph.workflows, ...graph.components]
      .find(d => d.name === dep.from)?.functionName;
    const toNode = [...graph.workflows, ...graph.components]
      .find(d => d.name === dep.to)?.functionName;
    
    if (fromNode && toNode) {
      lines.push(`    ${fromNode} --> ${toNode}`);
    }
  }
  
  // Add styling
  lines.push("    classDef workflow fill:#e1f5fe,stroke:#01579b,stroke-width:2px");
  lines.push("    classDef component fill:#f3e5f5,stroke:#4a148c,stroke-width:2px");
  
  return lines.join("\n");
}

// Run the CLI
main().catch(console.error);
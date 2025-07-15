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
  dependencies: DependencyCall[];
  sourceLocation: {
    line: number;
    column: number;
  };
}

interface DependencyCall {
  name: string;
  order: number;
  line?: number;
  awaitUsed: boolean;
}

interface ImportInfo {
  importedName: string;
  localName: string;
  fromFile: string;
}

interface GensxImport {
  localName: string;
  type: "workflow" | "component";
  importType: "namespace" | "named" | "default";
}

interface WorkflowGraph {
  workflows: ComponentDefinition[];
  components: ComponentDefinition[];
  dependencies: {
    from: string;
    to: string;
    type: "workflow-to-component" | "component-to-component" | "workflow-to-workflow";
    fromFile: string;
    toFile: string;
    order: number;
    line?: number;
    awaitUsed: boolean;
  }[];
  files: string[];
}

class WorkflowAnalyzer {
  private analyzedFiles: Set<string> = new Set();
  private allDefinitions: Map<string, ComponentDefinition> = new Map();
  private importMap: Map<string, ImportInfo[]> = new Map();
  private gensxImports: Map<string, GensxImport[]> = new Map();
  private baseDir: string = "";

  constructor() {}

  async analyzeProject(entryFilePath: string): Promise<WorkflowGraph> {
    this.baseDir = path.dirname(entryFilePath);
    this.analyzedFiles.clear();
    this.allDefinitions.clear();
    this.importMap.clear();
    this.gensxImports.clear();

    // Start with the entry file
    await this.analyzeFile(entryFilePath);

    // Build the final graph
    const workflows: ComponentDefinition[] = [];
    const components: ComponentDefinition[] = [];
    
    for (const definition of this.allDefinitions.values()) {
      if (definition.type === "workflow") {
        workflows.push(definition);
      } else {
        components.push(definition);
      }
    }

    const dependencies = await this.buildDependencyGraph();

    return {
      workflows,
      components,
      dependencies,
      files: Array.from(this.analyzedFiles)
    };
  }

  private async analyzeFile(filePath: string): Promise<void> {
    const normalizedPath = path.resolve(filePath);
    
    if (this.analyzedFiles.has(normalizedPath)) {
      return; // Already analyzed
    }

    this.analyzedFiles.add(normalizedPath);

    try {
      const fileContent = await fs.readFile(normalizedPath, "utf-8");
      
      // Create TypeScript AST
      const sourceFile = ts.createSourceFile(
        normalizedPath,
        fileContent,
        ts.ScriptTarget.Latest,
        true
      );

      // Collect imports
      const imports = this.collectImports(sourceFile, normalizedPath);
      this.importMap.set(normalizedPath, imports);

      // Collect gensx-specific imports (Workflow/Component)
      const gensxImports = this.collectGensxImports(sourceFile);
      this.gensxImports.set(normalizedPath, gensxImports);

      // Collect definitions in this file
      const definitions = this.collectDefinitions(sourceFile, normalizedPath);
      
      // Add definitions to global map
      for (const definition of definitions) {
        this.allDefinitions.set(`${definition.functionName}:${normalizedPath}`, definition);
      }

      // Analyze dependencies and follow imports
      for (const definition of definitions) {
        await this.analyzeDependencies(definition, sourceFile);
      }

      // Follow import paths and analyze imported files
      for (const importInfo of imports) {
        const importedFilePath = await this.resolveImportPath(importInfo.fromFile, normalizedPath);
        if (importedFilePath) {
          await this.analyzeFile(importedFilePath);
        }
      }

    } catch (error) {
      console.warn(`Warning: Could not analyze ${filePath}:`, error);
    }
  }

  private collectImports(sourceFile: ts.SourceFile, filePath: string): ImportInfo[] {
    const imports: ImportInfo[] = [];

    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const fromFile = node.moduleSpecifier.text;
        
        if (node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
          for (const element of node.importClause.namedBindings.elements) {
            const importedName = element.propertyName ? element.propertyName.text : element.name.text;
            const localName = element.name.text;
            
            imports.push({
              importedName,
              localName,
              fromFile
            });
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return imports;
  }

  private collectGensxImports(sourceFile: ts.SourceFile): GensxImport[] {
    const gensxImports: GensxImport[] = [];

    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const moduleSpecifier = node.moduleSpecifier.text;
        
        // Check if this is a gensx-related import
        if (this.isGensxModule(moduleSpecifier)) {
          const importClause = node.importClause;
          
          if (importClause) {
            // Handle namespace imports: import * as gensx from "@gensx/core"
            if (importClause.namedBindings && ts.isNamespaceImport(importClause.namedBindings)) {
              const localName = importClause.namedBindings.name.text;
              gensxImports.push(
                { localName: `${localName}.Workflow`, type: "workflow", importType: "namespace" },
                { localName: `${localName}.Component`, type: "component", importType: "namespace" }
              );
            }
            
            // Handle named imports: import { Workflow, Component } from "@gensx/core"
            if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
              for (const element of importClause.namedBindings.elements) {
                const importedName = element.propertyName ? element.propertyName.text : element.name.text;
                const localName = element.name.text;
                
                if (importedName === "Workflow") {
                  gensxImports.push({ localName, type: "workflow", importType: "named" });
                } else if (importedName === "Component") {
                  gensxImports.push({ localName, type: "component", importType: "named" });
                }
              }
            }
            
            // Handle default imports (if applicable)
            if (importClause.name) {
              const localName = importClause.name.text;
              // This would be for cases like: import Workflow from "@gensx/core/workflow"
              if (moduleSpecifier.includes("workflow")) {
                gensxImports.push({ localName, type: "workflow", importType: "default" });
              } else if (moduleSpecifier.includes("component")) {
                gensxImports.push({ localName, type: "component", importType: "default" });
              }
            }
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return gensxImports;
  }

  private isGensxModule(moduleSpecifier: string): boolean {
    return moduleSpecifier === "@gensx/core" || 
           moduleSpecifier.startsWith("@gensx/core/") ||
           moduleSpecifier === "gensx-core" ||
           moduleSpecifier.startsWith("gensx-core/");
  }

  private collectDefinitions(sourceFile: ts.SourceFile, filePath: string): ComponentDefinition[] {
    const definitions: ComponentDefinition[] = [];

    const visit = (node: ts.Node): void => {
      // Look for variable declarations
      if (ts.isVariableStatement(node)) {
        for (const declaration of node.declarationList.declarations) {
          if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
            const definition = this.analyzeVariableDeclaration(declaration, filePath);
            if (definition) {
              definitions.push(definition);
            }
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return definitions;
  }

  private analyzeVariableDeclaration(declaration: ts.VariableDeclaration, filePath: string): ComponentDefinition | null {
    if (!declaration.initializer || !ts.isCallExpression(declaration.initializer)) {
      return null;
    }

    const callExpression = declaration.initializer;
    const expression = callExpression.expression;
    const gensxImports = this.gensxImports.get(filePath) || [];

    let type: "workflow" | "component" | null = null;
    let functionCallName = "";

    // Check for direct function calls: Workflow() or Component()
    if (ts.isIdentifier(expression)) {
      functionCallName = expression.escapedText as string;
      const gensxImport = gensxImports.find(imp => imp.localName === functionCallName);
      if (gensxImport) {
        type = gensxImport.type;
      }
    }
    
    // Check for property access: gensx.Workflow() or gensx.Component()
    else if (ts.isPropertyAccessExpression(expression)) {
      const { expression: object, name } = expression;
      
      if (ts.isIdentifier(object) && ts.isIdentifier(name)) {
        functionCallName = `${object.escapedText}.${name.escapedText}`;
        const gensxImport = gensxImports.find(imp => imp.localName === functionCallName);
        if (gensxImport) {
          type = gensxImport.type;
        }
      }
    }

    if (type && ts.isIdentifier(declaration.name)) {
      const componentName = declaration.name.escapedText as string;
      const args = callExpression.arguments;
      
      // Get the name from the first argument (should be a string literal)
      let definitionName = componentName;
      if (args.length > 0 && ts.isStringLiteral(args[0])) {
        definitionName = args[0].text;
      }

      const sourceLocation = this.getSourceLocation(declaration, filePath);
      
      return {
        name: definitionName,
        type,
        filePath,
        functionName: componentName,
        dependencies: [],
        sourceLocation
      };
    }

    return null;
  }

  private async analyzeDependencies(definition: ComponentDefinition, sourceFile: ts.SourceFile): Promise<void> {
    // Find the function body of this definition
    const functionBody = this.findFunctionBody(definition.functionName, sourceFile);
    if (!functionBody) return;

    // Look for function calls within the body
    const dependencies = this.findFunctionCalls(functionBody, definition.filePath);
    // Remove duplicates by name while preserving the first occurrence (earliest call)
    const uniqueDeps = dependencies.filter((dep, index, arr) => 
      arr.findIndex(d => d.name === dep.name) === index
    );
    definition.dependencies = uniqueDeps;
  }

  private findFunctionBody(functionName?: string, sourceFile?: ts.SourceFile): ts.Block | ts.Expression | null {
    if (!sourceFile || !functionName) return null;

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

    visit(sourceFile);
    return functionBody;
  }

  private findFunctionCalls(body: ts.Block | ts.Expression, currentFilePath: string): DependencyCall[] {
    const calls: DependencyCall[] = [];
    const imports = this.importMap.get(currentFilePath) || [];
    const importLookup = new Map(imports.map(imp => [imp.localName, imp.importedName]));
    let callOrder = 0;

    const visit = (node: ts.Node, isAwait: boolean = false): void => {
      // Look for call expressions
      if (ts.isCallExpression(node)) {
        const expression = node.expression;
        
        // Direct function calls (e.g., Research(), WriteDraft())
        if (ts.isIdentifier(expression)) {
          const functionName = expression.escapedText as string;
          
          // Skip common API calls that aren't gensx components
          const skipFunctions = ['generateText', 'generateObject', 'anthropic', 'tool', 'generateStructuredData'];
          if (skipFunctions.includes(functionName)) {
            return;
          }
          
          let isValidCall = false;
          
          // Check if it's an imported function (likely a gensx component)
          const importedName = importLookup.get(functionName);
          if (importedName) {
            isValidCall = true;
          } else {
            // Check if it's a local definition
            const localDefinition = this.findLocalDefinition(functionName, currentFilePath);
            if (localDefinition) {
              isValidCall = true;
            }
          }
          
          if (isValidCall) {
            const sourceFile = this.getSourceFileForPath(currentFilePath);
            const line = sourceFile ? sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1 : undefined;
            
            calls.push({
              name: functionName,
              order: ++callOrder,
              line,
              awaitUsed: isAwait
            });
          }
        }
      }

      // Look for await expressions
      if (ts.isAwaitExpression(node) && node.expression) {
        visit(node.expression, true);
        return; // Don't visit children again
      }

      ts.forEachChild(node, child => visit(child, isAwait));
    };

    visit(body);
    return calls;
  }

  private getSourceFileForPath(filePath: string): ts.SourceFile | null {
    // This is a simplified implementation - in practice, we'd cache source files
    try {
      const content = require('fs').readFileSync(filePath, 'utf-8');
      return ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
    } catch {
      return null;
    }
  }

  private findLocalDefinition(functionName: string, filePath: string): ComponentDefinition | null {
    return this.allDefinitions.get(`${functionName}:${filePath}`) || null;
  }

  private async resolveImportPath(importPath: string, currentFilePath: string): Promise<string | null> {
    // Handle relative imports
    if (importPath.startsWith(".")) {
      const currentDir = path.dirname(currentFilePath);
      let resolvedPath = path.resolve(currentDir, importPath);
      
      // If the import already has an extension, try replacing .js with .ts (common TS pattern)
      if (importPath.endsWith(".js")) {
        const tsPath = resolvedPath.replace(/\.js$/, ".ts");
        try {
          await fs.access(tsPath);
          return tsPath;
        } catch {
          // Continue to other attempts
        }
      }
      
      // If no extension, try adding different extensions
      if (!path.extname(resolvedPath)) {
        const extensions = [".ts", ".js", ".tsx", ".jsx"];
        
        for (const ext of extensions) {
          const withExt = resolvedPath + ext;
          try {
            await fs.access(withExt);
            return withExt;
          } catch {
            // Continue to next extension
          }
        }
        
        // Try with index files
        for (const ext of extensions) {
          const indexPath = path.join(resolvedPath, `index${ext}`);
          try {
            await fs.access(indexPath);
            return indexPath;
          } catch {
            // Continue to next extension
          }
        }
      }
      
      // Try the exact path as given
      try {
        await fs.access(resolvedPath);
        return resolvedPath;
      } catch {
        // File not found
      }
    }
    
    return null; // Skip node_modules imports for now
  }

  private async buildDependencyGraph(): Promise<WorkflowGraph["dependencies"]> {
    const dependencies: WorkflowGraph["dependencies"] = [];

    for (const definition of this.allDefinitions.values()) {
      for (const dependencyCall of definition.dependencies) {
        // Find the target definition
        let targetDefinition: ComponentDefinition | null = null;
        
        // First check local definitions in the same file
        targetDefinition = this.findLocalDefinition(dependencyCall.name, definition.filePath);
        
        // If not found locally, check imports
        if (!targetDefinition) {
          const imports = this.importMap.get(definition.filePath) || [];
          const importInfo = imports.find(imp => imp.localName === dependencyCall.name);
          
          if (importInfo) {
            const importedFilePath = await this.resolveImportPath(importInfo.fromFile, definition.filePath);
            if (importedFilePath) {
              targetDefinition = this.findLocalDefinition(importInfo.importedName, importedFilePath);
            }
          }
        }

        if (targetDefinition) {
          const type = definition.type === "workflow" && targetDefinition.type === "component" 
            ? "workflow-to-component" as const
            : definition.type === "component" && targetDefinition.type === "component"
            ? "component-to-component" as const
            : "workflow-to-workflow" as const;

          dependencies.push({
            from: definition.name,
            to: targetDefinition.name,
            type,
            fromFile: definition.filePath,
            toFile: targetDefinition.filePath,
            order: dependencyCall.order,
            line: dependencyCall.line,
            awaitUsed: dependencyCall.awaitUsed
          });
        }
      }
    }

    return dependencies;
  }

  private getSourceLocation(node: ts.Node, filePath: string): { line: number; column: number } {
    const sourceFile = this.getSourceFileForPath(filePath);
    if (sourceFile) {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      return { line: line + 1, column: character + 1 };
    }
    return { line: 0, column: 0 };
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error("Usage: tsx analyze-workflows.ts <path-to-workflows.ts> [options]");
    console.error("Example: tsx analyze-workflows.ts ./examples/blog-writer/src/workflows.ts");
    console.error("");
    console.error("Options:");
    console.error("  --json     Output JSON format");
    console.error("  --mermaid  Generate Mermaid diagram");
    console.error("  --verbose  Show detailed analysis");
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
    const graph = await analyzer.analyzeProject(filePath);
    
    // Output results
    console.log("🔍 Workflow Analysis Results");
    console.log("=" .repeat(50));
    
    console.log(`\n📁 Analyzed Files: ${graph.files.length}`);
    if (args.includes("--verbose")) {
      for (const file of graph.files) {
        console.log(`  • ${path.relative(process.cwd(), file)}`);
      }
    }
    
    // Show workflows
    if (graph.workflows.length > 0) {
      console.log("\n📋 Workflows:");
      for (const workflow of graph.workflows) {
        console.log(`  • ${workflow.name} (${workflow.functionName})`);
        console.log(`    File: ${path.relative(process.cwd(), workflow.filePath)}`);
        if (workflow.dependencies.length > 0) {
          const depsList = workflow.dependencies
            .sort((a, b) => a.order - b.order)
            .map(dep => `${dep.name}${dep.awaitUsed ? ' (await)' : ''}`)
            .join(" → ");
          console.log(`    Flow: ${depsList}`);
          if (args.includes("--verbose")) {
            workflow.dependencies.forEach(dep => {
              console.log(`      ${dep.order}. ${dep.name}${dep.line ? ` (line ${dep.line})` : ''}${dep.awaitUsed ? ' [awaited]' : ''}`);
            });
          }
        }
      }
    }

    // Show components
    if (graph.components.length > 0) {
      console.log("\n🔧 Components:");
      for (const component of graph.components) {
        console.log(`  • ${component.name} (${component.functionName})`);
        console.log(`    File: ${path.relative(process.cwd(), component.filePath)}`);
        if (component.dependencies.length > 0) {
          const depsList = component.dependencies
            .sort((a, b) => a.order - b.order)
            .map(dep => `${dep.name}${dep.awaitUsed ? ' (await)' : ''}`)
            .join(" → ");
          console.log(`    Flow: ${depsList}`);
          if (args.includes("--verbose")) {
            component.dependencies.forEach(dep => {
              console.log(`      ${dep.order}. ${dep.name}${dep.line ? ` (line ${dep.line})` : ''}${dep.awaitUsed ? ' [awaited]' : ''}`);
            });
          }
        }
      }
    }

    // Show dependency graph
    if (graph.dependencies.length > 0) {
      console.log("\n🔗 Dependency Graph:");
      
      // Group dependencies by source and sort by order
      const dependenciesBySource = graph.dependencies.reduce((acc, dep) => {
        if (!acc[dep.from]) acc[dep.from] = [];
        acc[dep.from].push(dep);
        return acc;
      }, {} as Record<string, typeof graph.dependencies>);

      for (const [source, deps] of Object.entries(dependenciesBySource)) {
        const sortedDeps = deps.sort((a, b) => a.order - b.order);
        console.log(`  📍 ${source}:`);
        
        sortedDeps.forEach(dep => {
          const awaitIndicator = dep.awaitUsed ? ' (await)' : '';
          const lineInfo = dep.line ? ` [line ${dep.line}]` : '';
          console.log(`    ${dep.order}. → ${dep.to}${awaitIndicator}${lineInfo}`);
          
          if (args.includes("--verbose")) {
            const fromFile = path.relative(process.cwd(), dep.fromFile);
            const toFile = path.relative(process.cwd(), dep.toFile);
            if (fromFile !== toFile) {
              console.log(`       ${fromFile} → ${toFile}`);
            }
          }
        });
      }
    }

    // Summary
    console.log("\n📊 Summary:");
    console.log(`  Workflows: ${graph.workflows.length}`);
    console.log(`  Components: ${graph.components.length}`);
    console.log(`  Dependencies: ${graph.dependencies.length}`);
    console.log(`  Files: ${graph.files.length}`);

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
    console.error("Error analyzing project:", error);
    process.exit(1);
  }
}

function generateMermaidDiagram(graph: WorkflowGraph): string {
  const lines = ["sequenceDiagram"];
  
  // Add participants (workflows and components)
  const allDefinitions = [...graph.workflows, ...graph.components];
  for (const definition of allDefinitions) {
    const participantId = definition.functionName || definition.name.replace(/[^a-zA-Z0-9]/g, "_");
    const participantLabel = definition.name;
    const typeIndicator = definition.type === "workflow" ? "🔄" : "⚙️";
    lines.push(`    participant ${participantId} as ${typeIndicator} ${participantLabel}`);
  }
  
  // Group dependencies by source and sort by order
  const dependenciesBySource = graph.dependencies.reduce((acc, dep) => {
    if (!acc[dep.from]) acc[dep.from] = [];
    acc[dep.from].push(dep);
    return acc;
  }, {} as Record<string, typeof graph.dependencies>);

  // Generate sequence flows
  for (const [source, deps] of Object.entries(dependenciesBySource)) {
    const sortedDeps = deps.sort((a, b) => a.order - b.order);
    const sourceDefinition = allDefinitions.find(d => d.name === source);
    const sourceId = sourceDefinition?.functionName || source.replace(/[^a-zA-Z0-9]/g, "_");
    
    if (sortedDeps.length > 0) {
      lines.push(`    Note over ${sourceId}: Execution Flow`);
    }
    
    for (const dep of sortedDeps) {
      const targetDefinition = allDefinitions.find(d => d.name === dep.to);
      const targetId = targetDefinition?.functionName || dep.to.replace(/[^a-zA-Z0-9]/g, "_");
      
      if (sourceId && targetId) {
        // Choose arrow type based on await usage
        const arrow = dep.awaitUsed ? "->>" : "->>"; // sync vs async call
        const awaitLabel = dep.awaitUsed ? " (await)" : "";
        const message = `${dep.order}. Call${awaitLabel}`;
        
        lines.push(`    ${sourceId}${arrow}+${targetId}: ${message}`);
        
        if (dep.awaitUsed) {
          // Show return for awaited calls
          lines.push(`    ${targetId}-->>-${sourceId}: Result`);
        } else {
          // Just deactivate for non-awaited calls
          lines.push(`    deactivate ${targetId}`);
        }
      }
    }
    
    // Add some spacing between different sources
    if (Object.keys(dependenciesBySource).length > 1) {
      lines.push("");
    }
  }
  
  return lines.join("\n");
}

// Run the CLI
main().catch(console.error);
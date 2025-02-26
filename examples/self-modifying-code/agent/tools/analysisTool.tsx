import { GSXTool } from "@gensx/anthropic";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";
import { readFile, findFiles } from "../utils/fileOperations.js";

// Schema for the analysis tool
const analysisToolSchema = z.object({
  command: z
    .enum(["analyze-file", "find-symbols", "validate-types", "find-usages", "analyze-structure"])
    .describe("The analysis command to execute"),
  filePath: z
    .string()
    .describe("Path to the file to analyze"),
  symbol: z
    .string()
    .optional()
    .describe("Symbol name to find (for find-symbols and find-usages commands)"),
  query: z
    .string()
    .optional()
    .describe("Search query or pattern (for structure analysis)"),
});

type AnalysisToolParams = z.infer<typeof analysisToolSchema>;

// Type definitions for analysis results
interface FileSymbol {
  name: string;
  kind: "function" | "class" | "interface" | "type" | "variable" | "enum" | "unknown";
  location: {
    line: number;
    column: number;
  };
  documentation?: string;
}

interface FileAnalysisResult {
  imports: {
    source: string;
    symbols: string[];
  }[];
  exports: string[];
  symbols: FileSymbol[];
  dependencies: string[];
}

interface TypeValidationResult {
  valid: boolean;
  errors: {
    message: string;
    line?: number;
    column?: number;
  }[];
}

/**
 * Simple TypeScript parser to extract basic information
 * Note: This is a simplified version - for production use,
 * consider using the TypeScript compiler API for more accurate results
 */
async function parseTypeScriptFile(filePath: string): Promise<FileAnalysisResult> {
  const result = await readFile(filePath);
  
  if (!result.success || !result.content) {
    throw new Error(`Failed to read file: ${filePath}`);
  }
  
  const content = result.content;
  const lines = content.split("\n");
  
  // Simple regex-based parsing (this is a simplified approach)
  const importRegex = /import\s+(?:{([^}]+)})?\s*(?:from\s+)?['"]([^'"]+)['"]/g;
  const exportRegex = /export\s+(?:const|function|class|interface|type|enum)\s+(\w+)/g;
  const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g;
  const classRegex = /(?:export\s+)?class\s+(\w+)/g;
  const interfaceRegex = /(?:export\s+)?interface\s+(\w+)/g;
  const typeRegex = /(?:export\s+)?type\s+(\w+)/g;
  const variableRegex = /(?:export\s+)?(?:const|let|var)\s+(\w+)/g;
  
  const imports: { source: string; symbols: string[] }[] = [];
  const exports: string[] = [];
  const symbols: FileSymbol[] = [];
  const dependencies: string[] = [];
  
  // Extract imports
  let importMatch;
  while ((importMatch = importRegex.exec(content)) !== null) {
    const importedSymbols = importMatch[1] 
      ? importMatch[1].split(",").map(s => s.trim().replace(/\s+as\s+\w+/, ""))
      : [];
    const source = importMatch[2];
    
    imports.push({
      source,
      symbols: importedSymbols
    });
    
    if (!source.startsWith(".")) {
      dependencies.push(source);
    }
  }
  
  // Extract exports
  let exportMatch;
  while ((exportMatch = exportRegex.exec(content)) !== null) {
    exports.push(exportMatch[1]);
  }
  
  // Extract functions
  let functionMatch;
  while ((functionMatch = functionRegex.exec(content)) !== null) {
    const lineIndex = content.substring(0, functionMatch.index).split("\n").length - 1;
    
    symbols.push({
      name: functionMatch[1],
      kind: "function",
      location: {
        line: lineIndex,
        column: lines[lineIndex].indexOf(functionMatch[1])
      }
    });
  }
  
  // Extract classes
  let classMatch;
  while ((classMatch = classRegex.exec(content)) !== null) {
    const lineIndex = content.substring(0, classMatch.index).split("\n").length - 1;
    
    symbols.push({
      name: classMatch[1],
      kind: "class",
      location: {
        line: lineIndex,
        column: lines[lineIndex].indexOf(classMatch[1])
      }
    });
  }
  
  // Extract interfaces
  let interfaceMatch;
  while ((interfaceMatch = interfaceRegex.exec(content)) !== null) {
    const lineIndex = content.substring(0, interfaceMatch.index).split("\n").length - 1;
    
    symbols.push({
      name: interfaceMatch[1],
      kind: "interface",
      location: {
        line: lineIndex,
        column: lines[lineIndex].indexOf(interfaceMatch[1])
      }
    });
  }
  
  // Extract types
  let typeMatch;
  while ((typeMatch = typeRegex.exec(content)) !== null) {
    const lineIndex = content.substring(0, typeMatch.index).split("\n").length - 1;
    
    symbols.push({
      name: typeMatch[1],
      kind: "type",
      location: {
        line: lineIndex,
        column: lines[lineIndex].indexOf(typeMatch[1])
      }
    });
  }
  
  // Extract variables
  let varMatch;
  while ((varMatch = variableRegex.exec(content)) !== null) {
    const lineIndex = content.substring(0, varMatch.index).split("\n").length - 1;
    
    symbols.push({
      name: varMatch[1],
      kind: "variable",
      location: {
        line: lineIndex,
        column: lines[lineIndex].indexOf(varMatch[1])
      }
    });
  }
  
  return {
    imports,
    exports,
    symbols,
    dependencies
  };
}

/**
 * Validate TypeScript types in a file using the TypeScript compiler
 */
async function validateTypes(filePath: string): Promise<TypeValidationResult> {
  try {
    // Run tsc with --noEmit to check types without generating output
    const projectRoot = path.resolve(filePath, "../..");
    const output = execSync(`npx tsc --noEmit --pretty false ${filePath}`, {
      cwd: projectRoot,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    
    return {
      valid: true,
      errors: []
    };
  } catch (error) {
    // Parse error output to extract type errors
    const errorOutput = error instanceof Error ? error.message : String(error);
    const errorLines = errorOutput.split("\n");
    
    const errors = errorLines
      .filter(line => line.includes(filePath))
      .map(line => {
        // Extract line and column information from error messages
        // Format is typically: file(line,col): error TS2345: ...
        const match = line.match(/\((\d+),(\d+)\):\s+error\s+TS\d+:\s+(.*)/);
        if (match) {
          return {
            message: match[3],
            line: parseInt(match[1], 10),
            column: parseInt(match[2], 10)
          };
        }
        return { message: line };
      });
    
    return {
      valid: false,
      errors
    };
  }
}

/**
 * Find usages of a symbol in the codebase
 */
async function findSymbolUsages(
  baseDir: string,
  symbol: string
): Promise<{ file: string; lines: { number: number; content: string }[] }[]> {
  const results: { file: string; lines: { number: number; content: string }[] }[] = [];
  
  // Find TypeScript and JavaScript files
  const files = await findFiles(baseDir, {
    pattern: "**/*.{ts,tsx,js,jsx}",
    ignorePatterns: ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**"]
  });
  
  for (const file of files) {
    const result = await readFile(file);
    if (!result.success || !result.content) continue;
    
    const content = result.content;
    const lines = content.split("\n");
    
    // Create a regex to find the symbol
    // This is a simple approach - a proper implementation would use AST parsing
    const regex = new RegExp(`\\b${symbol}\\b`, "g");
    
    const matchingLines: { number: number; content: string }[] = [];
    
    lines.forEach((line, index) => {
      if (regex.test(line)) {
        matchingLines.push({
          number: index + 1,
          content: line.trim()
        });
      }
      // Reset regex state
      regex.lastIndex = 0;
    });
    
    if (matchingLines.length > 0) {
      results.push({
        file,
        lines: matchingLines
      });
    }
  }
  
  return results;
}

/**
 * Analyze project structure
 */
async function analyzeProjectStructure(
  baseDir: string,
  query?: string
): Promise<{ structure: Record<string, any>; insights: string[] }> {
  // Get all TypeScript/JavaScript files
  const files = await findFiles(baseDir, {
    pattern: "**/*.{ts,tsx,js,jsx}",
    ignorePatterns: ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**"]
  });
  
  // Group files by directory
  const structure: Record<string, any> = {};
  const insights: string[] = [];
  
  // Build directory structure
  for (const file of files) {
    const relativePath = path.relative(baseDir, file);
    const parts = relativePath.split(path.sep);
    
    let current = structure;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
    
    const fileName = parts[parts.length - 1];
    current[fileName] = "file";
  }
  
  // Generate insights about the project structure
  const directories = Object.keys(structure);
  
  if (directories.includes("components")) {
    insights.push("Project uses a component-based architecture");
  }
  
  if (directories.includes("utils") || directories.includes("helpers")) {
    insights.push("Project has utility/helper functions separated");
  }
  
  if (directories.includes("hooks")) {
    insights.push("Project uses React hooks");
  }
  
  if (directories.includes("api") || directories.includes("services")) {
    insights.push("Project has API/service layer");
  }
  
  if (directories.includes("tests") || directories.includes("__tests__")) {
    insights.push("Project has a testing structure");
  }
  
  // If a query is provided, filter results
  if (query) {
    const filteredInsights = insights.filter(insight => 
      insight.toLowerCase().includes(query.toLowerCase())
    );
    
    return {
      structure,
      insights: filteredInsights
    };
  }
  
  return {
    structure,
    insights
  };
}

// Create and export the analysis tool
export const analysisTool = new GSXTool<typeof analysisToolSchema>({
  name: "analysisTool",
  description: "Tool for analyzing code structure, finding symbols, and validating types in TypeScript/JavaScript files",
  schema: analysisToolSchema,
  run: async (params: AnalysisToolParams) => {
    try {
      switch (params.command) {
        case "analyze-file": {
          const analysis = await parseTypeScriptFile(params.filePath);
          return JSON.stringify(analysis, null, 2);
        }
        
        case "find-symbols": {
          const analysis = await parseTypeScriptFile(params.filePath);
          if (params.symbol) {
            const matchingSymbols = analysis.symbols.filter(
              s => s.name.includes(params.symbol || "")
            );
            return JSON.stringify(matchingSymbols, null, 2);
          }
          return JSON.stringify(analysis.symbols, null, 2);
        }
        
        case "validate-types": {
          const validation = await validateTypes(params.filePath);
          return JSON.stringify(validation, null, 2);
        }
        
        case "find-usages": {
          if (!params.symbol) {
            throw new Error("Symbol parameter is required for find-usages command");
          }
          const baseDir = path.dirname(params.filePath);
          const usages = await findSymbolUsages(baseDir, params.symbol);
          return JSON.stringify(usages, null, 2);
        }
        
        case "analyze-structure": {
          const baseDir = path.dirname(params.filePath);
          const analysis = await analyzeProjectStructure(baseDir, params.query);
          return JSON.stringify(analysis, null, 2);
        }
        
        default:
          throw new Error(`Unknown command: ${params.command}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return JSON.stringify({ error: errorMessage }, null, 2);
    }
  }
});
import fs from "fs/promises";
import path from "path";

import { GSXTool } from "@gensx/anthropic";
import { serializeError } from "serialize-error";
import { z } from "zod";

import { fileCache } from "./cacheManager.js";

// Define the schema for the code analyzer tool
const codeAnalyzerSchema = z.object({
  action: z
    .enum(["analyze", "findRelated", "findPatterns", "suggestUpdates"])
    .describe(
      "The action to perform. Options: analyze (understand code structure), findRelated (find related files), findPatterns (identify code patterns), suggestUpdates (suggest files to update)",
    ),
  path: z
    .string()
    .describe("Path to the file or directory to analyze"),
  query: z
    .string()
    .optional()
    .describe("Optional search query or pattern to look for"),
  depth: z
    .number()
    .optional()
    .describe("Depth of analysis for related files (default: 1)"),
});

type CodeAnalyzerParams = z.infer<typeof codeAnalyzerSchema>;

// Basic TypeScript code structure analysis
async function analyzeTypeScriptFile(filePath: string): Promise<any> {
  let content: string;
  
  // Try to get from cache first
  if (fileCache.has(filePath)) {
    content = fileCache.get(filePath)!;
  } else {
    content = await fs.readFile(filePath, "utf-8");
    fileCache.set(filePath, content);
  }

  // Simple analysis of imports and exports
  const imports: string[] = [];
  const exports: string[] = [];
  const components: string[] = [];
  const functions: string[] = [];
  
  // Extract imports
  const importRegex = /import\s+(?:{([^}]+)}|\*\s+as\s+([a-zA-Z0-9_]+)|([a-zA-Z0-9_]+))\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    if (match[1]) {
      // Named imports
      const namedImports = match[1].split(",").map(i => i.trim());
      imports.push(...namedImports);
    } else if (match[2]) {
      // Namespace import
      imports.push(match[2]);
    } else if (match[3]) {
      // Default import
      imports.push(match[3]);
    }
    
    // Also track the module path
    imports.push(match[4]);
  }
  
  // Extract exports
  const exportRegex = /export\s+(?:const|function|class|interface|type|enum)\s+([a-zA-Z0-9_]+)/g;
  while ((match = exportRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }
  
  // Extract React components (simple heuristic)
  const componentRegex = /(?:export\s+)?const\s+([A-Z][a-zA-Z0-9_]*)\s*=\s*(?:React\.)?(?:memo\()?(?:forwardRef\()?(?:gsx\.Component|gsx\.FC)/g;
  while ((match = componentRegex.exec(content)) !== null) {
    components.push(match[1]);
  }
  
  // Extract functions
  const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_]+)/g;
  while ((match = functionRegex.exec(content)) !== null) {
    functions.push(match[1]);
  }
  
  return {
    path: filePath,
    imports,
    exports,
    components,
    functions,
    size: content.length,
    lines: content.split("\n").length,
  };
}

// Find files related to the given file
async function findRelatedFiles(filePath: string, depth: number = 1): Promise<string[]> {
  const related = new Set<string>();
  const directoryPath = path.dirname(filePath);
  const fileBaseName = path.basename(filePath, path.extname(filePath));
  
  // Add files with the same base name but different extensions
  const dirContents = await fs.readdir(directoryPath);
  for (const file of dirContents) {
    const fileBase = path.basename(file, path.extname(file));
    if (fileBase === fileBaseName && file !== path.basename(filePath)) {
      related.add(path.join(directoryPath, file));
    }
  }
  
  // If it's a TypeScript file, analyze imports and try to find related files
  if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) {
    try {
      const analysis = await analyzeTypeScriptFile(filePath);
      
      for (const importPath of analysis.imports) {
        if (importPath.startsWith(".")) {
          // It's a relative import
          let resolvedPath = path.resolve(directoryPath, importPath);
          
          // Try to resolve with extensions if needed
          if (!resolvedPath.endsWith(".ts") && !resolvedPath.endsWith(".tsx") && !resolvedPath.endsWith(".js")) {
            for (const ext of [".ts", ".tsx", ".js"]) {
              const withExt = `${resolvedPath}${ext}`;
              try {
                await fs.access(withExt);
                resolvedPath = withExt;
                break;
              } catch {
                // File doesn't exist with this extension
              }
            }
          }
          
          related.add(resolvedPath);
          
          // Recursively find related files up to the specified depth
          if (depth > 1) {
            const deeperRelated = await findRelatedFiles(resolvedPath, depth - 1);
            for (const file of deeperRelated) {
              related.add(file);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error analyzing file ${filePath}:`, error);
    }
  }
  
  return Array.from(related);
}

// Find common patterns in the codebase
async function findPatterns(directoryPath: string, query?: string): Promise<any> {
  const patterns: Record<string, number> = {};
  
  async function scanDirectory(dir: string) {
    const files = await fs.readdir(dir, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      
      if (file.isDirectory()) {
        await scanDirectory(fullPath);
      } else if (file.name.endsWith(".ts") || file.name.endsWith(".tsx")) {
        try {
          let content: string;
          if (fileCache.has(fullPath)) {
            content = fileCache.get(fullPath)!;
          } else {
            content = await fs.readFile(fullPath, "utf-8");
            fileCache.set(fullPath, content);
          }
          
          // Look for specific patterns if query is provided
          if (query) {
            const regex = new RegExp(query, "g");
            let match;
            while ((match = regex.exec(content)) !== null) {
              const pattern = match[0];
              patterns[pattern] = (patterns[pattern] || 0) + 1;
            }
          } else {
            // Default patterns to look for
            const patternRegexes = [
              // Component definition patterns
              /const\s+[A-Z][a-zA-Z0-9_]*\s*=\s*gsx\.Component/g,
              // Hook usage patterns
              /use[A-Z][a-zA-Z0-9_]*\(/g,
              // Common error handling patterns
              /try\s*{[\s\S]*?}\s*catch\s*\([^)]*\)\s*{/g,
            ];
            
            for (const regex of patternRegexes) {
              let match;
              while ((match = regex.exec(content)) !== null) {
                const pattern = match[0].substring(0, 50) + (match[0].length > 50 ? "..." : "");
                patterns[pattern] = (patterns[pattern] || 0) + 1;
              }
            }
          }
        } catch (error) {
          console.error(`Error processing file ${fullPath}:`, error);
        }
      }
    }
  }
  
  await scanDirectory(directoryPath);
  
  // Sort patterns by frequency
  const sortedPatterns = Object.entries(patterns)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10) // Return top 10 patterns
    .map(([pattern, count]) => ({ pattern, count }));
  
  return {
    totalPatterns: Object.keys(patterns).length,
    topPatterns: sortedPatterns,
  };
}

// Suggest files that might need updates based on a changed file
async function suggestUpdates(filePath: string): Promise<string[]> {
  const suggestions = new Set<string>();
  
  // First get directly related files
  const related = await findRelatedFiles(filePath, 2);
  for (const file of related) {
    suggestions.add(file);
  }
  
  // Then check for files that import this file
  const fileName = path.basename(filePath);
  const baseDir = path.dirname(filePath);
  
  async function findImporters(dir: string) {
    const files = await fs.readdir(dir, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      
      if (file.isDirectory()) {
        await findImporters(fullPath);
      } else if (file.name.endsWith(".ts") || file.name.endsWith(".tsx")) {
        try {
          let content: string;
          if (fileCache.has(fullPath)) {
            content = fileCache.get(fullPath)!;
          } else {
            content = await fs.readFile(fullPath, "utf-8");
            fileCache.set(fullPath, content);
          }
          
          // Look for imports of the changed file
          const relativePath = path.relative(path.dirname(fullPath), filePath)
            .replace(/\\/g, "/") // Normalize path separators
            .replace(/\.(ts|tsx|js|jsx)$/, ""); // Remove extension
          
          const importRegex = new RegExp(`from\\s+['"](\\./|\\.\\./|/)?${relativePath}(\\.js)?['"]`, "g");
          if (importRegex.test(content)) {
            suggestions.add(fullPath);
          }
        } catch (error) {
          console.error(`Error checking file ${fullPath}:`, error);
        }
      }
    }
  }
  
  // Start from the parent directory to catch more potential importers
  await findImporters(path.resolve(baseDir, ".."));
  
  return Array.from(suggestions);
}

export const codeAnalyzer = new GSXTool<typeof codeAnalyzerSchema>({
  name: "codeAnalyzer",
  description: `Tool for analyzing code structure and relationships.
  
Actions:
* analyze: Understand the structure of a TypeScript/JavaScript file
  - Returns imports, exports, components, functions, and basic metrics
* findRelated: Find files related to the specified file
  - Identifies imports, exports, and files with similar names
* findPatterns: Identify common code patterns in a directory
  - Detects recurring patterns for component definitions, hooks, error handling, etc.
* suggestUpdates: Suggest files that might need updating when a file is modified
  - Identifies files that import or are imported by the specified file`,
  schema: codeAnalyzerSchema,
  run: async (params: CodeAnalyzerParams) => {
    console.log("🔍 Calling the CodeAnalyzer:", params);
    
    try {
      switch (params.action) {
        case "analyze": {
          const analysis = await analyzeTypeScriptFile(params.path);
          return analysis;
        }
        
        case "findRelated": {
          const depth = params.depth || 1;
          const related = await findRelatedFiles(params.path, depth);
          return {
            sourceFile: params.path,
            relatedFiles: related,
            count: related.length,
          };
        }
        
        case "findPatterns": {
          const patterns = await findPatterns(params.path, params.query);
          return patterns;
        }
        
        case "suggestUpdates": {
          const suggestions = await suggestUpdates(params.path);
          return {
            modifiedFile: params.path,
            suggestedUpdates: suggestions,
            count: suggestions.length,
          };
        }
        
        default:
          throw new Error(`Unknown action: ${String(params.action)}`);
      }
    } catch (error) {
      return {
        success: false,
        output: serializeError(error),
      };
    }
  },
});
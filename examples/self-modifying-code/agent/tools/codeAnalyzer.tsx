/**
 * Code Analyzer Tool
 * 
 * This tool provides functionality to analyze code structure, identify dependencies,
 * locate definitions, and suggest safe insertion points for code modifications.
 */

import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";

import { GSXTool } from "@gensx/anthropic";
import { serializeError } from "serialize-error";
import { z } from "zod";

import { fileCache } from "./cacheManager.js";

// Define types for code analysis results
interface ImportInfo {
  source: string;
  specifiers: string[];
  isDefault: boolean;
  isNamespace: boolean;
  lineNumber: number;
}

interface FunctionInfo {
  name: string;
  params: string[];
  returnType?: string;
  startLine: number;
  endLine: number;
  isExported: boolean;
  isAsync: boolean;
}

interface ClassInfo {
  name: string;
  methods: FunctionInfo[];
  properties: string[];
  startLine: number;
  endLine: number;
  isExported: boolean;
  extends?: string;
  implements?: string[];
}

interface FileAnalysis {
  imports: ImportInfo[];
  functions: FunctionInfo[];
  classes: ClassInfo[];
  interfaces: {
    name: string;
    properties: string[];
    startLine: number;
    endLine: number;
    isExported: boolean;
  }[];
  exports: {
    name: string;
    kind: "function" | "class" | "variable" | "interface" | "type" | "enum";
    lineNumber: number;
  }[];
}

// Define the schema for the code analyzer tool
const codeAnalyzerSchema = z.object({
  command: z
    .enum(["analyze", "findDefinition", "findDependencies", "suggestInsertionPoints"])
    .describe(
      "The command to run. Options: analyze, findDefinition, findDependencies, suggestInsertionPoints.",
    ),
  path: z
    .string()
    .describe(
      "Absolute path to the file to analyze.",
    ),
  symbol: z
    .string()
    .optional()
    .describe(
      "The symbol (function, class, variable) to find when using findDefinition command.",
    ),
});

type CodeAnalyzerParams = z.infer<typeof codeAnalyzerSchema>;

/**
 * Basic code parsing to identify imports, functions, classes and exports
 * This is a simplified parser and won't handle all edge cases
 */
async function analyzeFile(filePath: string): Promise<FileAnalysis> {
  // Get file content from cache or read from disk
  let content = fileCache.get(filePath);
  if (content === null) {
    const fileContent = await fs.readFile(filePath, "utf-8");
    content = fileContent;
    fileCache.set(filePath, fileContent);
  }

  const lines = content.split("\n");
  const analysis: FileAnalysis = {
    imports: [],
    functions: [],
    classes: [],
    interfaces: [],
    exports: [],
  };

  // Simplified regex patterns for identifying code structures
  const importRegex = /import\s+(?:(\*\s+as\s+\w+)|(\{[^}]+\})|(\w+))?\s+from\s+['"]([^'"]+)['"]/g;
  const functionRegex = /(export\s+)?(async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?\s*\{/;
  const arrowFunctionRegex = /(export\s+)?const\s+(\w+)\s*=\s*(async\s*)?\([^)]*\)(?:\s*:\s*([^=]+))?\s*=>/;
  const classRegex = /(export\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?\s*\{/;
  const interfaceRegex = /(export\s+)?interface\s+(\w+)(?:\s+extends\s+([^{]+))?\s*\{/;
  const exportRegex = /export\s+(?:(default)\s+)?(?:(\w+)|(\{[^}]+\}))/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Analyze imports
    if (line.includes("import ") && line.includes(" from ")) {
      let match;
      while ((match = importRegex.exec(line)) !== null) {
        const namespaceImport = match[1];
        const namedImports = match[2];
        const defaultImport = match[3];
        const source = match[4];
        
        const importInfo: ImportInfo = {
          source,
          specifiers: [],
          isDefault: Boolean(defaultImport),
          isNamespace: Boolean(namespaceImport),
          lineNumber: i + 1,
        };
        
        if (defaultImport) {
          importInfo.specifiers.push(defaultImport);
        }
        
        if (namedImports) {
          const specifiers = namedImports.replace(/[{}]/g, "").split(",")
            .map(s => s.trim())
            .filter(Boolean);
          importInfo.specifiers.push(...specifiers);
        }
        
        if (namespaceImport) {
          importInfo.specifiers.push(namespaceImport);
        }
        
        analysis.imports.push(importInfo);
      }
    }
    
    // Analyze functions
    const functionMatch = line.match(functionRegex);
    if (functionMatch) {
      const isExported = Boolean(functionMatch[1]);
      const isAsync = Boolean(functionMatch[2]);
      const name = functionMatch[3];
      const params = functionMatch[4].split(",").map(p => p.trim()).filter(Boolean);
      const returnType = functionMatch[5]?.trim();
      
      // Find the end of the function (simplified - just looks for closing brace)
      let braceCount = 1;
      let endLine = i + 1;
      for (let j = i + 1; j < lines.length; j++) {
        for (const char of lines[j]) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
          if (braceCount === 0) {
            endLine = j + 1;
            break;
          }
        }
        if (braceCount === 0) break;
      }
      
      analysis.functions.push({
        name,
        params,
        returnType,
        startLine: i + 1,
        endLine,
        isExported,
        isAsync,
      });
    }
    
    // Analyze arrow functions
    const arrowMatch = line.match(arrowFunctionRegex);
    if (arrowMatch) {
      const isExported = Boolean(arrowMatch[1]);
      const name = arrowMatch[2];
      const isAsync = Boolean(arrowMatch[3]);
      const returnType = arrowMatch[4]?.trim();
      
      // Find the end of the arrow function (simplified)
      let braceCount = 0;
      let endLine = i + 1;
      
      // Check if the function body starts with a brace
      if (line.includes("=> {")) {
        braceCount = 1;
        for (let j = i + 1; j < lines.length; j++) {
          for (const char of lines[j]) {
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
            if (braceCount === 0) {
              endLine = j + 1;
              break;
            }
          }
          if (braceCount === 0) break;
        }
      }
      
      analysis.functions.push({
        name,
        params: [], // Simplified - we're not parsing params for arrow functions
        returnType,
        startLine: i + 1,
        endLine,
        isExported,
        isAsync,
      });
    }
    
    // Analyze classes
    const classMatch = line.match(classRegex);
    if (classMatch) {
      const isExported = Boolean(classMatch[1]);
      const name = classMatch[2];
      const extendsClass = classMatch[3];
      const implementsInterfaces = classMatch[4]?.split(",").map(i => i.trim());
      
      // Find the end of the class
      let braceCount = 1;
      let endLine = i + 1;
      for (let j = i + 1; j < lines.length; j++) {
        for (const char of lines[j]) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
          if (braceCount === 0) {
            endLine = j + 1;
            break;
          }
        }
        if (braceCount === 0) break;
      }
      
      analysis.classes.push({
        name,
        methods: [], // Simplified - not parsing methods
        properties: [], // Simplified - not parsing properties
        startLine: i + 1,
        endLine,
        isExported,
        extends: extendsClass,
        implements: implementsInterfaces,
      });
    }
    
    // Analyze interfaces
    const interfaceMatch = line.match(interfaceRegex);
    if (interfaceMatch) {
      const isExported = Boolean(interfaceMatch[1]);
      const name = interfaceMatch[2];
      const extendsInterfaces = interfaceMatch[3]?.split(",").map(i => i.trim());
      
      // Find the end of the interface
      let braceCount = 1;
      let endLine = i + 1;
      for (let j = i + 1; j < lines.length; j++) {
        for (const char of lines[j]) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
          if (braceCount === 0) {
            endLine = j + 1;
            break;
          }
        }
        if (braceCount === 0) break;
      }
      
      analysis.interfaces.push({
        name,
        properties: [], // Simplified - not parsing properties
        startLine: i + 1,
        endLine,
        isExported,
      });
    }
    
    // Analyze exports
    const exportMatch = line.match(exportRegex);
    if (exportMatch && !line.match(/(function|class|interface)/)) {
      const isDefault = Boolean(exportMatch[1]);
      const singleExport = exportMatch[2];
      const multipleExports = exportMatch[3];
      
      if (singleExport) {
        analysis.exports.push({
          name: singleExport,
          kind: "variable", // Simplified - assuming variables
          lineNumber: i + 1,
        });
      }
      
      if (multipleExports) {
        const exports = multipleExports.replace(/[{}]/g, "").split(",")
          .map(e => e.trim())
          .filter(Boolean);
        
        exports.forEach(e => {
          analysis.exports.push({
            name: e,
            kind: "variable", // Simplified - assuming variables
            lineNumber: i + 1,
          });
        });
      }
    }
  }
  
  return analysis;
}

/**
 * Find the definition of a symbol in the codebase
 */
async function findDefinition(filePath: string, symbol: string): Promise<{
  file: string;
  line: number;
  kind: string;
  found: boolean;
}> {
  try {
    // First check if the symbol is defined in the current file
    const analysis = await analyzeFile(filePath);
    
    // Check functions
    const func = analysis.functions.find(f => f.name === symbol);
    if (func) {
      return {
        file: filePath,
        line: func.startLine,
        kind: "function",
        found: true,
      };
    }
    
    // Check classes
    const cls = analysis.classes.find(c => c.name === symbol);
    if (cls) {
      return {
        file: filePath,
        line: cls.startLine,
        kind: "class",
        found: true,
      };
    }
    
    // Check interfaces
    const intf = analysis.interfaces.find(i => i.name === symbol);
    if (intf) {
      return {
        file: filePath,
        line: intf.startLine,
        kind: "interface",
        found: true,
      };
    }
    
    // Check exports
    const exp = analysis.exports.find(e => e.name === symbol);
    if (exp) {
      return {
        file: filePath,
        line: exp.lineNumber,
        kind: exp.kind,
        found: true,
      };
    }
    
    // If not found in the current file, check imports and search in those files
    const importedFrom = analysis.imports.find(imp => 
      imp.specifiers.includes(symbol) || 
      (imp.isDefault && imp.specifiers[0] === symbol)
    );
    
    if (importedFrom) {
      // Resolve the import path relative to the current file
      const importPath = importedFrom.source;
      const dirname = path.dirname(filePath);
      
      let resolvedPath: string;
      if (importPath.startsWith(".")) {
        // Relative import
        resolvedPath = path.resolve(dirname, importPath);
      } else {
        // Package import or absolute import
        // This is simplified and may not work for all cases
        resolvedPath = importPath;
      }
      
      // Add extension if needed
      if (!path.extname(resolvedPath)) {
        for (const ext of [".tsx", ".ts", ".jsx", ".js"]) {
          try {
            const withExt = `${resolvedPath}${ext}`;
            await fs.access(withExt);
            resolvedPath = withExt;
            break;
          } catch {
            // File doesn't exist with this extension, try next
          }
        }
      }
      
      // Recursively search in the imported file
      return findDefinition(resolvedPath, symbol);
    }
    
    // Symbol not found
    return {
      file: "",
      line: 0,
      kind: "",
      found: false,
    };
  } catch (error) {
    console.error(`Error finding definition for ${symbol}:`, serializeError(error));
    return {
      file: "",
      line: 0,
      kind: "",
      found: false,
    };
  }
}

/**
 * Find dependencies of a file
 */
async function findDependencies(filePath: string): Promise<{
  imports: ImportInfo[];
  dependencies: string[];
  dependents: string[];
}> {
  try {
    // Get file analysis to find imports
    const analysis = await analyzeFile(filePath);
    
    // Resolve import paths to absolute paths
    const dependencies = analysis.imports.map(imp => {
      const importPath = imp.source;
      const dirname = path.dirname(filePath);
      
      let resolvedPath: string;
      if (importPath.startsWith(".")) {
        // Relative import
        resolvedPath = path.resolve(dirname, importPath);
        
        // Add extension if needed
        if (!path.extname(resolvedPath)) {
          // This is a simplification - in a real implementation we would check if the file exists
          resolvedPath += ".tsx";
        }
        
        return resolvedPath;
      } else {
        // Package import or absolute import
        return importPath;
      }
    });
    
    // Find files that depend on this file (simplified approach using grep)
    const filename = path.basename(filePath, path.extname(filePath));
    const directory = path.dirname(filePath);
    
    // Find files that import this file
    let dependents: string[] = [];
    try {
      // Use grep to find files that import this module
      // This is a simplified approach and may not work in all cases
      const grepResult = execSync(
        `grep -r "from ['\\\"].*${filename}['\\\"]" ${directory} --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js"`,
        { encoding: "utf-8" }
      );
      
      // Parse grep results to get file paths
      dependents = grepResult.split("\n")
        .filter(Boolean)
        .map(line => line.split(":")[0])
        .filter(file => file !== filePath); // Exclude self-references
    } catch (error) {
      // grep returns non-zero exit code if no matches found
      // This is expected in some cases, so we ignore it
    }
    
    return {
      imports: analysis.imports,
      dependencies,
      dependents,
    };
  } catch (error) {
    console.error(`Error finding dependencies for ${filePath}:`, serializeError(error));
    return {
      imports: [],
      dependencies: [],
      dependents: [],
    };
  }
}

/**
 * Suggest safe insertion points for new code
 */
async function suggestInsertionPoints(filePath: string): Promise<{
  imports: { line: number, description: string };
  functions: { line: number, description: string }[];
  classes: { line: number, description: string }[];
  exports: { line: number, description: string };
}> {
  try {
    const analysis = await analyzeFile(filePath);
    const result = {
      imports: { line: 0, description: "Add new imports at the top of the file" },
      functions: [] as { line: number, description: string }[],
      classes: [] as { line: number, description: string }[],
      exports: { line: 0, description: "Add new exports at the end of the file" },
    };
    
    // Find the last import statement to suggest where to add new imports
    if (analysis.imports.length > 0) {
      const lastImport = analysis.imports[analysis.imports.length - 1];
      result.imports = {
        line: lastImport.lineNumber + 1,
        description: "Add new imports after the last import statement",
      };
    } else {
      result.imports = {
        line: 1,
        description: "Add new imports at the top of the file",
      };
    }
    
    // Find safe insertion points after each function
    analysis.functions.forEach(func => {
      result.functions.push({
        line: func.endLine + 1,
        description: `Add new code after the ${func.name} function`,
      });
    });
    
    // Find safe insertion points after each class
    analysis.classes.forEach(cls => {
      result.classes.push({
        line: cls.endLine + 1,
        description: `Add new code after the ${cls.name} class`,
      });
    });
    
    // Find where to add new exports
    const lastExport = analysis.exports[analysis.exports.length - 1];
    if (lastExport) {
      result.exports = {
        line: lastExport.lineNumber + 1,
        description: "Add new exports after the last export statement",
      };
    } else {
      // If no exports, suggest adding at the end of the file
      result.exports = {
        line: -1, // Special value meaning "end of file"
        description: "Add new exports at the end of the file",
      };
    }
    
    return result;
  } catch (error) {
    console.error(`Error suggesting insertion points for ${filePath}:`, serializeError(error));
    return {
      imports: { line: 1, description: "Add new imports at the top of the file" },
      functions: [],
      classes: [],
      exports: { line: -1, description: "Add new exports at the end of the file" },
    };
  }
}

export const codeAnalyzerTool = new GSXTool<typeof codeAnalyzerSchema>({
  name: "codeAnalyzer",
  description: `Tool for analyzing code structure and relationships.

Commands:
* analyze: Analyze a file to identify functions, classes, imports, and exports
* findDefinition: Find where a symbol is defined in the codebase
* findDependencies: Identify dependencies between files
* suggestInsertionPoints: Find safe places to insert new code in a file`,
  schema: codeAnalyzerSchema,
  run: async (params: CodeAnalyzerParams) => {
    console.log("🔍 Calling the CodeAnalyzerTool:", params);

    try {
      switch (params.command) {
        case "analyze": {
          const analysis = await analyzeFile(params.path);
          return JSON.stringify(analysis, null, 2);
        }

        case "findDefinition": {
          if (!params.symbol) {
            throw new Error("symbol parameter is required for findDefinition command");
          }
          const definition = await findDefinition(params.path, params.symbol);
          return JSON.stringify(definition, null, 2);
        }

        case "findDependencies": {
          const dependencies = await findDependencies(params.path);
          return JSON.stringify(dependencies, null, 2);
        }

        case "suggestInsertionPoints": {
          const insertionPoints = await suggestInsertionPoints(params.path);
          return JSON.stringify(insertionPoints, null, 2);
        }

        default:
          throw new Error(`Unknown command: ${String(params.command)}`);
      }
    } catch (error) {
      return {
        success: false,
        output: serializeError(error),
      };
    }
  },
});
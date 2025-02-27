import fs from "fs/promises";
import path from "path";

import { GSXTool } from "@gensx/anthropic";
import { serializeError } from "serialize-error";
import { z } from "zod";

import { fileCache } from "./cacheManager.js";

// Define the schema for the error analyzer tool
const errorAnalyzerSchema = z.object({
  action: z
    .enum(["analyze", "suggest", "fix", "retry"])
    .describe(
      "The action to perform. Options: analyze (understand error), suggest (suggest fixes), fix (attempt to fix), retry (retry with different strategy)",
    ),
  error: z
    .string()
    .describe("The error message or output to analyze"),
  context: z
    .object({
      file: z.string().optional(),
      line: z.number().optional(),
      column: z.number().optional(),
      code: z.string().optional(),
      operation: z.string().optional(),
    })
    .optional()
    .describe("Optional context about where the error occurred"),
  strategy: z
    .string()
    .optional()
    .describe("Strategy to use for retry (only needed for retry action)"),
});

type ErrorAnalyzerParams = z.infer<typeof errorAnalyzerSchema>;

// Common error patterns and potential fixes
const errorPatterns = [
  {
    pattern: /Cannot find module '([^']+)'/,
    analysis: "Module not found error",
    suggestion: "The module may not be installed or there might be a typo in the import path.",
    fix: async (match: RegExpMatchArray, filePath?: string) => {
      const moduleName = match[1];
      
      // If it's a relative import and we have the file path
      if (moduleName.startsWith(".") && filePath) {
        const dirPath = path.dirname(filePath);
        const possiblePaths = [
          path.resolve(dirPath, `${moduleName}.ts`),
          path.resolve(dirPath, `${moduleName}.tsx`),
          path.resolve(dirPath, `${moduleName}.js`),
          path.resolve(dirPath, `${moduleName}.jsx`),
          path.resolve(dirPath, `${moduleName}/index.ts`),
          path.resolve(dirPath, `${moduleName}/index.tsx`),
          path.resolve(dirPath, `${moduleName}/index.js`),
          path.resolve(dirPath, `${moduleName}/index.jsx`),
        ];
        
        for (const possiblePath of possiblePaths) {
          try {
            await fs.access(possiblePath);
            // Found the file, suggest the correct import
            return {
              suggestion: `Update import to use the correct file extension or path: '${moduleName}${path.extname(possiblePath)}'`,
              fixCode: (code: string) => {
                return code.replace(
                  new RegExp(`from ['"]${moduleName}['"]`, "g"),
                  `from '${moduleName}${path.extname(possiblePath)}'`
                );
              }
            };
          } catch {
            // File doesn't exist, continue checking
          }
        }
      }
      
      return {
        suggestion: `Install the missing module: 'pnpm add ${moduleName}'`,
        fixCode: null
      };
    }
  },
  {
    pattern: /TS2304: Cannot find name '([^']+)'/,
    analysis: "TypeScript cannot find a variable, type, or function",
    suggestion: "The identifier may not be defined, imported, or there might be a typo.",
    fix: async (match: RegExpMatchArray, filePath?: string) => {
      const identifier = match[1];
      
      if (!filePath) {
        return {
          suggestion: `Ensure '${identifier}' is properly defined or imported.`,
          fixCode: null
        };
      }
      
      // Read the file
      let content: string;
      if (fileCache.has(filePath)) {
        content = fileCache.get(filePath)!;
      } else {
        content = await fs.readFile(filePath, "utf-8");
        fileCache.set(filePath, content);
      }
      
      // Check if it's a React component but React isn't imported
      if (identifier === "React" && !content.includes("import React")) {
        return {
          suggestion: "Add import for React",
          fixCode: (code: string) => {
            return "import React from 'react';\n" + code;
          }
        };
      }
      
      return {
        suggestion: `Check if '${identifier}' needs to be imported or defined.`,
        fixCode: null
      };
    }
  },
  {
    pattern: /TS2322: Type '([^']+)' is not assignable to type '([^']+)'/,
    analysis: "Type mismatch error",
    suggestion: "The types are incompatible. Check the expected type and the actual value.",
    fix: async (match: RegExpMatchArray) => {
      const actualType = match[1];
      const expectedType = match[2];
      
      return {
        suggestion: `Ensure the value is of type '${expectedType}' instead of '${actualType}'.`,
        fixCode: null
      };
    }
  },
  {
    pattern: /TS2531: Object is possibly 'null'/,
    analysis: "Null check error",
    suggestion: "TypeScript detected a possible null value that's being accessed without checking.",
    fix: async () => {
      return {
        suggestion: "Add a null check before accessing the property or use optional chaining operator (?.).",
        fixCode: null
      };
    }
  },
  {
    pattern: /TS2532: Object is possibly 'undefined'/,
    analysis: "Undefined check error",
    suggestion: "TypeScript detected a possible undefined value that's being accessed without checking.",
    fix: async () => {
      return {
        suggestion: "Add an undefined check or use optional chaining operator (?).",
        fixCode: null
      };
    }
  },
  {
    pattern: /Cannot read property '([^']+)' of (undefined|null)/,
    analysis: "Null/undefined property access error",
    suggestion: "Attempting to access a property on null or undefined.",
    fix: async (match: RegExpMatchArray) => {
      const property = match[1];
      const objectState = match[2];
      
      return {
        suggestion: `Add a check to ensure the object is not ${objectState} before accessing ${property}.`,
        fixCode: null
      };
    }
  },
  {
    pattern: /SyntaxError: ([^(]+)\((\d+):(\d+)\)/,
    analysis: "Syntax error",
    suggestion: "There's a syntax error in the code.",
    fix: async (match: RegExpMatchArray, filePath?: string) => {
      if (!filePath) {
        return {
          suggestion: "Check for syntax errors like missing brackets, semicolons, or quotes.",
          fixCode: null
        };
      }
      
      // Read the file
      let content: string;
      if (fileCache.has(filePath)) {
        content = fileCache.get(filePath)!;
      } else {
        content = await fs.readFile(filePath, "utf-8");
        fileCache.set(filePath, content);
      }
      
      const lines = content.split("\n");
      const lineNumber = parseInt(match[2]) - 1;
      
      if (lineNumber >= 0 && lineNumber < lines.length) {
        const errorLine = lines[lineNumber];
        return {
          suggestion: `Check syntax on line ${lineNumber + 1}: "${errorLine}"`,
          fixCode: null
        };
      }
      
      return {
        suggestion: "Check for syntax errors like missing brackets, semicolons, or quotes.",
        fixCode: null
      };
    }
  },
  {
    pattern: /Module not found: Error: Can't resolve '([^']+)'/,
    analysis: "Webpack module resolution error",
    suggestion: "Webpack cannot resolve a module import.",
    fix: async (match: RegExpMatchArray) => {
      const moduleName = match[1];
      
      if (moduleName.startsWith(".")) {
        return {
          suggestion: "Check if the relative path is correct and the file exists.",
          fixCode: null
        };
      }
      
      return {
        suggestion: `Install the missing dependency: 'pnpm add ${moduleName}'`,
        fixCode: null
      };
    }
  }
];

// Analyze an error message to understand the issue
async function analyzeError(
  errorMessage: string, 
  context?: ErrorAnalyzerParams["context"]
): Promise<any> {
  // Extract file path and line info from error if not provided in context
  const filePathMatch = errorMessage.match(/([a-zA-Z0-9_\-/.]+\.(ts|tsx|js|jsx))(?::(\d+)(?::(\d+))?)?/);
  let filePath = context?.file;
  let line = context?.line;
  let column = context?.column;
  
  if (!filePath && filePathMatch) {
    filePath = filePathMatch[1];
    line = line || (filePathMatch[3] ? parseInt(filePathMatch[3]) : undefined);
    column = column || (filePathMatch[4] ? parseInt(filePathMatch[4]) : undefined);
  }
  
  // Try to match against known error patterns
  for (const pattern of errorPatterns) {
    const match = errorMessage.match(pattern.pattern);
    if (match) {
      return {
        type: pattern.analysis,
        message: errorMessage,
        suggestion: pattern.suggestion,
        file: filePath,
        line,
        column,
        matched: true,
        matchedPattern: pattern.pattern.toString(),
      };
    }
  }
  
  // If no pattern matched, do a more general analysis
  if (errorMessage.includes("TypeError")) {
    return {
      type: "Type Error",
      message: errorMessage,
      suggestion: "Check for type mismatches or undefined values being accessed.",
      file: filePath,
      line,
      column,
      matched: false,
    };
  } else if (errorMessage.includes("SyntaxError")) {
    return {
      type: "Syntax Error",
      message: errorMessage,
      suggestion: "Check for syntax errors like missing brackets, semicolons, or quotes.",
      file: filePath,
      line,
      column,
      matched: false,
    };
  } else if (errorMessage.includes("ReferenceError")) {
    return {
      type: "Reference Error",
      message: errorMessage,
      suggestion: "Check for variables or functions that are used but not defined.",
      file: filePath,
      line,
      column,
      matched: false,
    };
  }
  
  // Default analysis
  return {
    type: "Unknown Error",
    message: errorMessage,
    suggestion: "Review the error message carefully and check the related code.",
    file: filePath,
    line,
    column,
    matched: false,
  };
}

// Suggest fixes for an error
async function suggestFixes(
  errorMessage: string, 
  context?: ErrorAnalyzerParams["context"]
): Promise<any> {
  const analysis = await analyzeError(errorMessage, context);
  
  // If we matched a known pattern, get specific fix suggestions
  if (analysis.matched) {
    for (const pattern of errorPatterns) {
      const match = errorMessage.match(pattern.pattern);
      if (match) {
        const fixInfo = await pattern.fix(match, context?.file);
        return {
          ...analysis,
          fixSuggestion: fixInfo.suggestion,
          canAutoFix: fixInfo.fixCode !== null,
        };
      }
    }
  }
  
  // General suggestions based on error type
  let suggestions: string[] = [];
  
  if (errorMessage.includes("TS")) {
    suggestions = [
      "Check type definitions and make sure they match expected values.",
      "Add proper type annotations where missing.",
      "Use type assertions (as Type) if you're confident about the type.",
      "Add null/undefined checks where appropriate.",
    ];
  } else if (errorMessage.includes("SyntaxError")) {
    suggestions = [
      "Check for missing closing brackets, parentheses, or braces.",
      "Ensure all string literals are properly closed.",
      "Look for missing semicolons or commas where required.",
      "Check for typos in keywords or identifiers.",
    ];
  } else if (errorMessage.includes("Cannot find module")) {
    suggestions = [
      "Check if the module is installed (run 'pnpm install').",
      "Verify the import path is correct (case-sensitive).",
      "Make sure the file extension is included if required.",
      "Check for typos in the module name.",
    ];
  } else {
    suggestions = [
      "Review the code around the error location.",
      "Add console.log statements to debug variable values.",
      "Check the documentation for the functions or APIs being used.",
      "Consider simplifying the code to isolate the issue.",
    ];
  }
  
  return {
    ...analysis,
    suggestions,
    canAutoFix: false,
  };
}

// Attempt to fix an error automatically
async function fixError(
  errorMessage: string, 
  context?: ErrorAnalyzerParams["context"]
): Promise<any> {
  // First analyze the error
  const analysis = await analyzeError(errorMessage, context);
  
  // We need a file path to fix the error
  if (!context?.file && !analysis.file) {
    return {
      success: false,
      message: "Cannot fix error: No file path provided.",
      analysis,
    };
  }
  
  const filePath = context?.file || analysis.file;
  
  // Read the file
  let content: string;
  try {
    if (fileCache.has(filePath)) {
      content = fileCache.get(filePath)!;
    } else {
      content = await fs.readFile(filePath, "utf-8");
      fileCache.set(filePath, content);
    }
  } catch (error) {
    return {
      success: false,
      message: `Cannot read file: ${filePath}`,
      error: serializeError(error),
      analysis,
    };
  }
  
  // If we matched a known pattern, try to apply the fix
  if (analysis.matched) {
    for (const pattern of errorPatterns) {
      const match = errorMessage.match(pattern.pattern);
      if (match) {
        const fixInfo = await pattern.fix(match, filePath);
        
        if (fixInfo.fixCode) {
          // Apply the fix
          const updatedContent = fixInfo.fixCode(content);
          
          // Write the updated content back to the file
          await fs.writeFile(filePath, updatedContent, "utf-8");
          
          // Invalidate cache
          fileCache.set(filePath, updatedContent);
          
          return {
            success: true,
            message: `Applied fix: ${fixInfo.suggestion}`,
            changes: {
              file: filePath,
              before: content,
              after: updatedContent,
            },
            analysis,
          };
        }
      }
    }
  }
  
  // If we couldn't auto-fix, return suggestions
  const suggestions = await suggestFixes(errorMessage, context);
  
  return {
    success: false,
    message: "Cannot automatically fix this error.",
    suggestions,
    analysis,
  };
}

// Retry an operation with a different strategy
async function retryWithStrategy(
  errorMessage: string, 
  strategy: string, 
  context?: ErrorAnalyzerParams["context"]
): Promise<any> {
  // First analyze the error
  const analysis = await analyzeError(errorMessage, context);
  
  // Different retry strategies
  switch (strategy) {
    case "addNullChecks": {
      // Add null checks to prevent null/undefined errors
      if (!context?.file) {
        return {
          success: false,
          message: "Cannot apply strategy: No file path provided.",
          analysis,
        };
      }
      
      let content: string;
      try {
        if (fileCache.has(context.file)) {
          content = fileCache.get(context.file)!;
        } else {
          content = await fs.readFile(context.file, "utf-8");
          fileCache.set(context.file, content);
        }
      } catch (error) {
        return {
          success: false,
          message: `Cannot read file: ${context.file}`,
          error: serializeError(error),
          analysis,
        };
      }
      
      // Extract the property being accessed from the error
      const propertyMatch = errorMessage.match(/Cannot read property '([^']+)' of (undefined|null)/);
      if (propertyMatch) {
        const property = propertyMatch[1];
        const objectState = propertyMatch[2];
        
        // Simple regex to find the pattern obj.property and add a null check
        const regex = new RegExp(`(\\w+)\\.${property}`, "g");
        const updatedContent = content.replace(regex, `$1 && $1.${property}`);
        
        // Write the updated content back to the file
        await fs.writeFile(context.file, updatedContent, "utf-8");
        
        // Invalidate cache
        fileCache.set(context.file, updatedContent);
        
        return {
          success: true,
          message: `Added null checks for '${property}' to prevent ${objectState} errors.`,
          changes: {
            file: context.file,
            before: content,
            after: updatedContent,
          },
          analysis,
        };
      }
      
      return {
        success: false,
        message: "Could not identify property to add null checks for.",
        analysis,
      };
    }
    
    case "optionalChaining": {
      // Use optional chaining operator to prevent null/undefined errors
      if (!context?.file) {
        return {
          success: false,
          message: "Cannot apply strategy: No file path provided.",
          analysis,
        };
      }
      
      let content: string;
      try {
        if (fileCache.has(context.file)) {
          content = fileCache.get(context.file)!;
        } else {
          content = await fs.readFile(context.file, "utf-8");
          fileCache.set(context.file, content);
        }
      } catch (error) {
        return {
          success: false,
          message: `Cannot read file: ${context.file}`,
          error: serializeError(error),
          analysis,
        };
      }
      
      // Extract the property being accessed from the error
      const propertyMatch = errorMessage.match(/Cannot read property '([^']+)' of (undefined|null)/);
      if (propertyMatch) {
        const property = propertyMatch[1];
        
        // Simple regex to find the pattern obj.property and add optional chaining
        const regex = new RegExp(`(\\w+)\\.${property}`, "g");
        const updatedContent = content.replace(regex, `$1?.${property}`);
        
        // Write the updated content back to the file
        await fs.writeFile(context.file, updatedContent, "utf-8");
        
        // Invalidate cache
        fileCache.set(context.file, updatedContent);
        
        return {
          success: true,
          message: `Added optional chaining for '${property}' to prevent null/undefined errors.`,
          changes: {
            file: context.file,
            before: content,
            after: updatedContent,
          },
          analysis,
        };
      }
      
      return {
        success: false,
        message: "Could not identify property to add optional chaining for.",
        analysis,
      };
    }
    
    case "typeAssertion": {
      // Add type assertions to fix type errors
      if (!context?.file) {
        return {
          success: false,
          message: "Cannot apply strategy: No file path provided.",
          analysis,
        };
      }
      
      let content: string;
      try {
        if (fileCache.has(context.file)) {
          content = fileCache.get(context.file)!;
        } else {
          content = await fs.readFile(context.file, "utf-8");
          fileCache.set(context.file, content);
        }
      } catch (error) {
        return {
          success: false,
          message: `Cannot read file: ${context.file}`,
          error: serializeError(error),
          analysis,
        };
      }
      
      // Extract the types from the error
      const typeMatch = errorMessage.match(/Type '([^']+)' is not assignable to type '([^']+)'/);
      if (typeMatch) {
        const actualType = typeMatch[1];
        const expectedType = typeMatch[2];
        
        // If we have line and column information, try to add a type assertion
        if (context.line !== undefined && context.code) {
          const lines = content.split("\n");
          const lineIndex = context.line - 1;
          
          if (lineIndex >= 0 && lineIndex < lines.length) {
            lines[lineIndex] = lines[lineIndex].replace(
              /(\w+)\s*=\s*([^;]+)/,
              `$1 = $2 as ${expectedType}`
            );
            
            const updatedContent = lines.join("\n");
            
            // Write the updated content back to the file
            await fs.writeFile(context.file, updatedContent, "utf-8");
            
            // Invalidate cache
            fileCache.set(context.file, updatedContent);
            
            return {
              success: true,
              message: `Added type assertion to '${expectedType}'.`,
              changes: {
                file: context.file,
                before: content,
                after: updatedContent,
              },
              analysis,
            };
          }
        }
      }
      
      return {
        success: false,
        message: "Could not apply type assertion strategy without specific line information.",
        analysis,
      };
    }
    
    case "installDependency": {
      // Try to install a missing dependency
      const moduleMatch = errorMessage.match(/Cannot find module '([^']+)'/);
      if (moduleMatch) {
        const moduleName = moduleMatch[1];
        
        // Don't try to install relative imports
        if (moduleName.startsWith(".")) {
          return {
            success: false,
            message: `Cannot install relative import: ${moduleName}`,
            analysis,
          };
        }
        
        try {
          // Find the project root
          const projectRoot = context?.file 
            ? path.dirname(context.file)
            : process.cwd();
          
          // Run npm/pnpm install
          const { execSync } = require("child_process");
          execSync(`pnpm add ${moduleName}`, {
            cwd: projectRoot,
            stdio: "pipe",
          });
          
          return {
            success: true,
            message: `Installed missing dependency: ${moduleName}`,
            analysis,
          };
        } catch (error) {
          return {
            success: false,
            message: `Failed to install dependency: ${moduleName}`,
            error: serializeError(error),
            analysis,
          };
        }
      }
      
      return {
        success: false,
        message: "Could not identify module to install.",
        analysis,
      };
    }
    
    default:
      return {
        success: false,
        message: `Unknown retry strategy: ${strategy}`,
        availableStrategies: [
          "addNullChecks",
          "optionalChaining",
          "typeAssertion",
          "installDependency",
        ],
        analysis,
      };
  }
}

export const errorAnalyzer = new GSXTool<typeof errorAnalyzerSchema>({
  name: "errorAnalyzer",
  description: `Tool for analyzing and fixing errors in code.
  
Actions:
* analyze: Understand the error and its context
  - Identifies the type of error and provides basic information
* suggest: Suggest possible fixes for the error
  - Provides detailed suggestions for resolving the error
* fix: Attempt to automatically fix the error
  - Tries to apply a fix based on common error patterns
* retry: Retry the operation with a different strategy
  - Applies a specific strategy to resolve the error`,
  schema: errorAnalyzerSchema,
  run: async (params: ErrorAnalyzerParams) => {
    console.log("🔍 Calling the ErrorAnalyzer:", params);
    
    try {
      switch (params.action) {
        case "analyze": {
          const analysis = await analyzeError(params.error, params.context);
          return analysis;
        }
        
        case "suggest": {
          const suggestions = await suggestFixes(params.error, params.context);
          return suggestions;
        }
        
        case "fix": {
          const result = await fixError(params.error, params.context);
          return result;
        }
        
        case "retry": {
          if (!params.strategy) {
            throw new Error("Strategy is required for retry action");
          }
          
          const result = await retryWithStrategy(
            params.error,
            params.strategy,
            params.context
          );
          return result;
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
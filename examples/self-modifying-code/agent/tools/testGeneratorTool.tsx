/**
 * Test Generator Tool
 * 
 * This tool analyzes modified files and generates corresponding test files.
 */

import fs from 'fs/promises';
import path from 'path';

import { GSXTool } from "@gensx/anthropic";
import { serializeError } from "serialize-error";
import { z } from "zod";

import { fileCache } from "./cacheManager.js";
import { 
  analyzeFileForTesting, 
  getTestFilePath, 
  ensureTestDirectory,
  CodeConstructType
} from "../testing/codeAnalyzer.js";
import { 
  functionTestTemplate, 
  classTestTemplate, 
  componentTestTemplate, 
  hookTestTemplate, 
  utilityTestTemplate 
} from "../testing/testTemplates.js";

// Define the schema for the test generator tool
const testGeneratorSchema = z.object({
  command: z
    .enum(["generate", "analyze", "list", "run"])
    .describe(
      "The command to run. Options: generate (create tests), analyze (analyze file), list (list testable items), run (execute tests).",
    ),
  path: z
    .string()
    .describe(
      "Absolute path to the file to analyze or generate tests for.",
    ),
  force: z
    .boolean()
    .optional()
    .describe(
      "Force overwrite of existing test files.",
    ),
});

type TestGeneratorParams = z.infer<typeof testGeneratorSchema>;

/**
 * Modified files tracking
 */
const modifiedFiles = new Set<string>();

/**
 * Track a file as modified
 */
export function trackModifiedFile(filePath: string): void {
  modifiedFiles.add(filePath);
}

/**
 * Get the list of modified files
 */
export function getModifiedFiles(): string[] {
  return Array.from(modifiedFiles);
}

/**
 * Clear the list of modified files
 */
export function clearModifiedFiles(): void {
  modifiedFiles.clear();
}

/**
 * Check if a file has a corresponding test file
 */
async function hasTestFile(filePath: string): Promise<boolean> {
  const testPath = getTestFilePath(filePath);
  
  try {
    await fs.access(testPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a test file for a source file
 */
async function generateTestFile(filePath: string, force: boolean = false): Promise<string> {
  // Check if test file already exists
  const testPath = getTestFilePath(filePath);
  const hasExistingTest = await hasTestFile(filePath);
  
  if (hasExistingTest && !force) {
    return `Test file already exists at ${testPath}. Use 'force: true' to overwrite.`;
  }
  
  // Analyze the file
  const analysis = await analyzeFileForTesting(filePath);
  
  // Create test directory if needed
  await ensureTestDirectory(testPath);
  
  // Generate appropriate test content based on file analysis
  let testContent = '';
  
  if (analysis.isReactComponent) {
    // Find component constructs
    const componentConstruct = analysis.constructs.find(c => 
      c.type === CodeConstructType.Component || 
      (c.type === CodeConstructType.Function && analysis.isReactComponent)
    );
    
    if (componentConstruct) {
      // Extract props from the component function parameters
      const props = componentConstruct.type === CodeConstructType.Function
        ? (componentConstruct.signature as any).params.map((p: any) => ({ name: p.name, type: p.type || 'any' }))
        : []; // For class components, we'd need to extract props from propTypes or TypeScript interfaces
      
      // Generate import path relative to test file
      const importPath = path.relative(path.dirname(testPath), filePath)
        .replace(/\\/g, '/') // Convert Windows paths
        .replace(/\.tsx?$/, ''); // Remove extension
      
      testContent = componentTestTemplate(
        componentConstruct.name,
        props,
        importPath.startsWith('.') ? importPath : `./${importPath}`
      );
    }
  } else if (analysis.isReactHook) {
    // Find hook constructs
    const hookConstruct = analysis.constructs.find(c => 
      c.type === CodeConstructType.Hook || 
      (c.type === CodeConstructType.Function && c.name.startsWith('use'))
    );
    
    if (hookConstruct) {
      const params = (hookConstruct.signature as any).params.map((p: any) => p.name);
      
      // Generate import path relative to test file
      const importPath = path.relative(path.dirname(testPath), filePath)
        .replace(/\\/g, '/') // Convert Windows paths
        .replace(/\.tsx?$/, ''); // Remove extension
      
      testContent = hookTestTemplate(
        hookConstruct.name,
        params,
        importPath.startsWith('.') ? importPath : `./${importPath}`
      );
    }
  } else {
    // Check if the file exports functions
    const exportedFunctions = analysis.constructs.filter(c => 
      c.type === CodeConstructType.Function && c.isExported
    );
    
    // Check if the file exports classes
    const exportedClasses = analysis.constructs.filter(c => 
      c.type === CodeConstructType.Class && c.isExported
    );
    
    if (exportedFunctions.length > 0 && exportedClasses.length === 0) {
      // Generate tests for exported functions
      
      // Generate import path relative to test file
      const importPath = path.relative(path.dirname(testPath), filePath)
        .replace(/\\/g, '/') // Convert Windows paths
        .replace(/\.tsx?$/, ''); // Remove extension
      
      const mainFunction = exportedFunctions[0];
      const params = (mainFunction.signature as any).params.map((p: any) => p.name);
      const hasReturnValue = (mainFunction.signature as any).returnType !== 'void';
      
      testContent = functionTestTemplate(
        mainFunction.name,
        params,
        importPath.startsWith('.') ? importPath : `./${importPath}`,
        hasReturnValue
      );
    } else if (exportedClasses.length > 0) {
      // Generate tests for exported classes
      
      // Generate import path relative to test file
      const importPath = path.relative(path.dirname(testPath), filePath)
        .replace(/\\/g, '/') // Convert Windows paths
        .replace(/\.tsx?$/, ''); // Remove extension
      
      const mainClass = exportedClasses[0];
      const methods = (mainClass.signature as any).methods.map((m: any) => ({
        name: m.name,
        params: m.params.map((p: any) => p.name)
      }));
      
      testContent = classTestTemplate(
        mainClass.name,
        methods,
        importPath.startsWith('.') ? importPath : `./${importPath}`
      );
    } else if (analysis.constructs.length > 0) {
      // Generate utility tests for files with multiple exports
      
      // Generate import path relative to test file
      const importPath = path.relative(path.dirname(testPath), filePath)
        .replace(/\\/g, '/') // Convert Windows paths
        .replace(/\.tsx?$/, ''); // Remove extension
      
      // Use the filename as the utility name
      const utilityName = path.basename(filePath, path.extname(filePath));
      
      // Extract functions from constructs
      const functions = analysis.constructs
        .filter(c => c.type === CodeConstructType.Function)
        .map(c => ({
          name: c.name,
          params: (c.signature as any).params.map((p: any) => p.name)
        }));
      
      testContent = utilityTestTemplate(
        utilityName,
        functions,
        importPath.startsWith('.') ? importPath : `./${importPath}`
      );
    } else {
      return `Unable to generate tests for ${filePath} - no testable constructs found.`;
    }
  }
  
  // Write the test file
  await fs.writeFile(testPath, testContent, 'utf-8');
  
  return `Generated test file at ${testPath}`;
}

/**
 * List testable items in a file
 */
async function listTestableItems(filePath: string): Promise<string> {
  // Analyze the file
  const analysis = await analyzeFileForTesting(filePath);
  
  let output = `Testable items in ${filePath}:\n\n`;
  
  if (analysis.isReactComponent) {
    output += 'React Component:\n';
  } else if (analysis.isReactHook) {
    output += 'React Hook:\n';
  } else {
    output += 'Code Constructs:\n';
  }
  
  // List all constructs
  for (const construct of analysis.constructs) {
    output += `- ${construct.type}: ${construct.name}\n`;
    
    if (construct.type === CodeConstructType.Class || construct.type === CodeConstructType.Component) {
      const methods = (construct.signature as any).methods;
      if (methods && methods.length > 0) {
        output += '  Methods:\n';
        for (const method of methods) {
          output += `  - ${method.name}(${method.params.map((p: any) => p.name).join(', ')})\n`;
        }
      }
    } else if (construct.type === CodeConstructType.Function || construct.type === CodeConstructType.Hook) {
      const params = (construct.signature as any).params;
      output += `  Parameters: ${params.map((p: any) => p.name).join(', ')}\n`;
      output += `  Return Type: ${(construct.signature as any).returnType || 'unknown'}\n`;
    }
    
    output += '\n';
  }
  
  // Check if a test file already exists
  const hasTest = await hasTestFile(filePath);
  output += `Test file ${hasTest ? 'exists' : 'does not exist'} for this file.\n`;
  
  return output;
}

/**
 * Test generator tool
 */
export const testGeneratorTool = new GSXTool<typeof testGeneratorSchema>({
  name: "testGenerator",
  description: `Tool for generating and managing tests.

Commands:
* generate: Create test files for the specified source file
* analyze: Analyze a file to identify testable elements
* list: List testable items in a file
* run: Run tests for a specific file`,
  schema: testGeneratorSchema,
  run: async (params: TestGeneratorParams) => {
    console.log("🧪 Calling the TestGeneratorTool:", params);

    try {
      switch (params.command) {
        case "generate": {
          const result = await generateTestFile(params.path, params.force);
          return result;
        }

        case "analyze": {
          const analysis = await analyzeFileForTesting(params.path);
          return JSON.stringify(analysis, null, 2);
        }

        case "list": {
          const result = await listTestableItems(params.path);
          return result;
        }

        case "run": {
          // This would call the test runner
          return "Test runner not implemented in this version.";
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
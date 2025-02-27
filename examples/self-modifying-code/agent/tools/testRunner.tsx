import { execSync } from "child_process";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";

import { GSXTool } from "@gensx/anthropic";
import { serializeError } from "serialize-error";
import { z } from "zod";

import { fileCache } from "./cacheManager.js";
import { codeAnalyzer } from "./codeAnalyzer.js";

// Define the schema for the test runner tool
const testRunnerSchema = z.object({
  action: z
    .enum(["run", "identify", "validate"])
    .describe(
      "The action to perform. Options: run (execute tests), identify (find relevant tests), validate (verify changes)",
    ),
  path: z
    .string()
    .describe("Path to the file or directory to test"),
  testCommand: z
    .string()
    .optional()
    .describe("Custom test command to run (default: 'pnpm test')"),
  testPattern: z
    .string()
    .optional()
    .describe("Pattern to match test files (default: '*.test.{ts,tsx,js,jsx}')"),
});

type TestRunnerParams = z.infer<typeof testRunnerSchema>;

// Find test files related to a given source file
async function identifyRelevantTests(
  filePath: string, 
  testPattern: string = "*.test.{ts,tsx,js,jsx}"
): Promise<string[]> {
  const relevantTests = new Set<string>();
  
  // First strategy: Look for a test file with the same name
  const dirPath = path.dirname(filePath);
  const fileName = path.basename(filePath, path.extname(filePath));
  
  // Common test file naming patterns
  const testFilePatterns = [
    `${fileName}.test${path.extname(filePath)}`,
    `${fileName}.spec${path.extname(filePath)}`,
    `${fileName}-test${path.extname(filePath)}`,
    `${fileName}-spec${path.extname(filePath)}`,
    `test-${fileName}${path.extname(filePath)}`,
    `spec-${fileName}${path.extname(filePath)}`,
  ];
  
  // Check for test files in the same directory
  try {
    const files = await fsPromises.readdir(dirPath);
    for (const file of files) {
      if (testFilePatterns.includes(file)) {
        relevantTests.add(path.join(dirPath, file));
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
  }
  
  // Check for tests in a __tests__ directory
  const testDirPath = path.join(dirPath, "__tests__");
  try {
    const testDirExists = await fsPromises.stat(testDirPath).catch(() => null);
    if (testDirExists && testDirExists.isDirectory()) {
      const files = await fsPromises.readdir(testDirPath);
      for (const file of files) {
        if (file.includes(fileName) && 
            (file.endsWith(".test.ts") || 
             file.endsWith(".test.tsx") || 
             file.endsWith(".test.js") || 
             file.endsWith(".test.jsx") ||
             file.endsWith(".spec.ts") || 
             file.endsWith(".spec.tsx") || 
             file.endsWith(".spec.js") || 
             file.endsWith(".spec.jsx"))) {
          relevantTests.add(path.join(testDirPath, file));
        }
      }
    }
  } catch (error) {
    console.error(`Error reading test directory ${testDirPath}:`, error);
  }
  
  // Second strategy: Look for test files that import the source file
  // This is more complex and requires analyzing the imports of test files
  
  // Find potential test directories
  const projectRoot = findProjectRoot(filePath);
  if (projectRoot) {
    const allTestFiles = await findAllTestFiles(projectRoot, testPattern);
    
    // Check each test file to see if it imports the source file
    for (const testFile of allTestFiles) {
      try {
        let content: string;
        if (fileCache.has(testFile)) {
          content = fileCache.get(testFile)!;
        } else {
          content = await fsPromises.readFile(testFile, "utf-8");
          fileCache.set(testFile, content);
        }
        
        // Check if the test imports the source file
        const relativePath = path.relative(path.dirname(testFile), filePath)
          .replace(/\\/g, "/") // Normalize path separators
          .replace(/\.(ts|tsx|js|jsx)$/, ""); // Remove extension
        
        // Look for various import patterns
        const importPatterns = [
          new RegExp(`from\\s+['"](\\./|\\.\\./|/)?${relativePath}(\\.js)?['"]`),
          new RegExp(`import\\s+['"](\\./|\\.\\./|/)?${relativePath}(\\.js)?['"]`),
          new RegExp(`require\\(['"](\\./|\\.\\./|/)?${relativePath}(\\.js)?['"]\\)`),
        ];
        
        for (const pattern of importPatterns) {
          if (pattern.test(content)) {
            relevantTests.add(testFile);
            break;
          }
        }
        
        // Also check if the test file mentions the source file's components or functions
        try {
          const analysisResult = await codeAnalyzer.run({
            action: "analyze",
            path: filePath,
          });
          
          // Check if the analysis result has exports property and it's an array
          if (analysisResult && 
              typeof analysisResult === 'object' && 
              'exports' in analysisResult && 
              Array.isArray(analysisResult.exports)) {
            
            const exports = analysisResult.exports as string[];
            for (const exportName of exports) {
              if (content.includes(exportName)) {
                relevantTests.add(testFile);
                break;
              }
            }
          }
        } catch (error) {
          console.error(`Error analyzing file ${filePath}:`, error);
        }
      } catch (error) {
        console.error(`Error reading test file ${testFile}:`, error);
      }
    }
  }
  
  return Array.from(relevantTests);
}

// Find the project root directory (containing package.json)
function findProjectRoot(startPath: string): string | null {
  let currentDir = startPath;
  if (!path.isAbsolute(currentDir)) {
    currentDir = path.resolve(currentDir);
  }
  
  // If currentDir is a file, start from its directory
  try {
    const stats = fs.statSync(currentDir);
    if (stats.isFile()) {
      currentDir = path.dirname(currentDir);
    }
  } catch (error) {
    return null;
  }
  
  // Look for package.json up the directory tree
  while (currentDir !== path.parse(currentDir).root) {
    try {
      const packageJsonPath = path.join(currentDir, "package.json");
      fs.accessSync(packageJsonPath);
      return currentDir;
    } catch (error) {
      currentDir = path.dirname(currentDir);
    }
  }
  
  return null;
}

// Find all test files in a directory
async function findAllTestFiles(
  directory: string, 
  pattern: string = "*.test.{ts,tsx,js,jsx}"
): Promise<string[]> {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\./g, "\\.")
    .replace(/\*/g, ".*")
    .replace(/\{([^}]+)\}/g, (_, group) => `(${group.split(",").join("|")})`);
  
  const regex = new RegExp(regexPattern);
  const testFiles: string[] = [];
  
  async function scanDirectory(dir: string) {
    const entries = await fsPromises.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith("node_modules") && !entry.name.startsWith(".")) {
        await scanDirectory(fullPath);
      } else if (entry.isFile() && regex.test(entry.name)) {
        testFiles.push(fullPath);
      }
    }
  }
  
  await scanDirectory(directory);
  return testFiles;
}

// Run tests for a file or directory
async function runTests(
  filePath: string, 
  testCommand: string = "pnpm test"
): Promise<{ success: boolean; output: string }> {
  try {
    // Determine the directory to run tests from
    let testDir = filePath;
    const stats = await fsPromises.stat(filePath);
    if (stats.isFile()) {
      testDir = path.dirname(filePath);
    }
    
    // Find the project root
    const projectRoot = findProjectRoot(testDir);
    if (!projectRoot) {
      return {
        success: false,
        output: `Could not find project root (containing package.json) for ${filePath}`,
      };
    }
    
    // Run the test command
    const output = execSync(testCommand, {
      cwd: projectRoot,
      encoding: "utf-8",
      stdio: "pipe",
    });
    
    return {
      success: true,
      output,
    };
  } catch (error) {
    if (error && typeof error === "object" && "stdout" in error) {
      return {
        success: false,
        output: (error as { stdout: Buffer }).stdout.toString(),
      };
    }
    
    return {
      success: false,
      output: error instanceof Error ? error.message : String(error),
    };
  }
}

// Validate changes by running relevant tests
async function validateChanges(
  filePath: string, 
  testPattern?: string
): Promise<{ success: boolean; output: string }> {
  try {
    // First identify relevant tests
    const relevantTests = await identifyRelevantTests(filePath, testPattern);
    
    if (relevantTests.length === 0) {
      return {
        success: true,
        output: `No tests found for ${filePath}. Validation skipped.`,
      };
    }
    
    // Run each test file
    const results: { file: string; success: boolean; output: string }[] = [];
    
    for (const testFile of relevantTests) {
      try {
        const projectRoot = findProjectRoot(testFile);
        if (!projectRoot) {
          results.push({
            file: testFile,
            success: false,
            output: `Could not find project root for ${testFile}`,
          });
          continue;
        }
        
        // Run test for this specific file
        const testCommand = `pnpm test -- ${path.relative(projectRoot, testFile)}`;
        const result = await runTests(projectRoot, testCommand);
        
        results.push({
          file: testFile,
          success: result.success,
          output: result.output,
        });
      } catch (error) {
        results.push({
          file: testFile,
          success: false,
          output: error instanceof Error ? error.message : String(error),
        });
      }
    }
    
    // Check if all tests passed
    const allPassed = results.every((result) => result.success);
    
    // Compile the output
    const output = results
      .map((result) => `Test: ${result.file}\nResult: ${result.success ? "PASSED" : "FAILED"}\n${result.output}\n`)
      .join("\n---\n");
    
    return {
      success: allPassed,
      output: `Validation ${allPassed ? "PASSED" : "FAILED"} for ${filePath}\n\n${output}`,
    };
  } catch (error) {
    return {
      success: false,
      output: error instanceof Error ? error.message : String(error),
    };
  }
}

export const testRunner = new GSXTool<typeof testRunnerSchema>({
  name: "testRunner",
  description: `Tool for running tests and validating code changes.
  
Actions:
* run: Execute tests for a file or directory
  - Runs tests and returns the results
* identify: Find test files relevant to a source file
  - Identifies tests that might be affected by changes to the source file
* validate: Verify changes by running relevant tests
  - Runs tests for files that might be affected by changes`,
  schema: testRunnerSchema,
  run: async (params: TestRunnerParams) => {
    console.log("🧪 Calling the TestRunner:", params);
    
    try {
      switch (params.action) {
        case "run": {
          const result = await runTests(params.path, params.testCommand);
          return result;
        }
        
        case "identify": {
          const tests = await identifyRelevantTests(params.path, params.testPattern);
          return {
            sourceFile: params.path,
            relevantTests: tests,
            count: tests.length,
          };
        }
        
        case "validate": {
          const result = await validateChanges(params.path, params.testPattern);
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
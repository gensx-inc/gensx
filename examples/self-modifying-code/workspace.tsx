import { spawn } from "child_process";
import fs from "fs";
import fsPromises from "fs/promises";
import os from "os";
import path from "path";

import * as gensx from "@gensx/core";

const context = gensx.createContext<Workspace | undefined>(undefined);

export const WorkspaceProvider = gensx.Component<
  { workspace: Workspace },
  never
>("WorkspaceProvider", ({ workspace }) => {
  return <context.Provider value={workspace} />;
});

export const useWorkspace = () => {
  const workspace = gensx.useContext(context);
  if (!workspace) {
    throw new Error("Workspace not found");
  }
  return workspace;
};

export const useWorkspaceContext = () => {
  const workspace = gensx.useContext(context);
  if (!workspace) {
    throw new Error("Workspace not found");
  }
  return readContext(workspace);
};

export const updateWorkspaceContext = (update: Partial<AgentContext>) => {
  const workspace = gensx.useContext(context);
  if (!workspace) {
    throw new Error("Workspace not found");
  }
  return updateContext(workspace, update);
};

export interface WorkspaceConfig {
  repoUrl: string;
  branch: string;
}

export interface AgentContext {
  goalState: string;
  history: {
    timestamp: Date;
    action: string;
    result: "success" | "failure" | "in_progress";
    details: string;
  }[];
}

export interface TestResult {
  success: boolean;
  output: string;
  total: number;
  passed: number;
  failed: number;
}

export interface CodeAnalysisResult {
  summary: string;
  issues: Array<{
    description: string;
    severity: "error" | "warning" | "info";
    location: string;
  }>;
  suggestions: string[];
}

export interface ErrorAnalysisResult {
  rootCause: string;
  suggestedFixes: string[];
  affectedFiles: string[];
}

export interface Workspace {
  rootDir: string;
  sourceDir: string;
  contextFile: string; // Path to agent_context.json in the repo
  config: WorkspaceConfig;
  
  // New methods for enhanced agent capabilities
  runTests?: (command: string) => Promise<TestResult>;
  analyzeCode?: (path: string, analysisType: string) => Promise<CodeAnalysisResult>;
  analyzeError?: (errorText: string, errorType: string) => Promise<ErrorAnalysisResult>;
  validateBuild: (workspace: Workspace) => Promise<BuildValidationResult>;
  
  // Build caching
  buildCache?: Map<string, string>;
  getLastModifiedTime?: (filePath: string) => Promise<number>;
}

export interface BuildValidationResult {
  success: boolean;
  output: string;
  errorDetails?: {
    type: string;
    location?: string;
    affectedFiles?: string[];
  };
}

function serializeContext(context: AgentContext): string {
  return JSON.stringify(
    context,
    (_key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    },
    2,
  );
}

function deserializeContext(json: string): AgentContext {
  return JSON.parse(json, (key, value) => {
    if (key === "timestamp" && typeof value === "string") {
      return new Date(value);
    }
    return value;
  });
}

export async function runCommand(
  cmd: string,
  args: string[],
  cwd: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd, stdio: "inherit" });
    proc.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed: ${cmd} ${args.join(" ")}`));
      }
    });
  });
}

export async function captureCommand(
  cmd: string,
  args: string[],
  cwd: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    // Collect stdout
    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    // Collect stderr
    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    // Wait for process to complete
    proc.on("exit", (exitCode) => {
      resolve({
        exitCode: exitCode || 0,
        stdout,
        stderr,
      });
    });
  });
}

export async function setupWorkspace(
  config: WorkspaceConfig,
): Promise<Workspace> {
  // Create temp directory
  const rootDir = await fsPromises.mkdtemp(
    path.join(os.tmpdir(), "self-modifying-code-"),
  );
  const sourceDir = path.join(rootDir, "repo");

  try {
    // Clone repository
    await runCommand("git", ["clone", config.repoUrl, sourceDir], rootDir);

    // Setup git config
    await runCommand("git", ["checkout", config.branch], sourceDir);

    // Install dependencies
    await runCommand("pnpm", ["install"], sourceDir);

    // Build the workspace
    await runCommand("pnpm", ["build"], sourceDir);

    // Create the workspace with enhanced capabilities
    const workspace: Workspace = {
      rootDir,
      sourceDir,
      contextFile: path.join(
        sourceDir,
        "examples",
        "self-modifying-code",
        "agent_context.json",
      ),
      config,
      validateBuild,
      buildCache: new Map(),
    };

    // Add enhanced capabilities
    workspace.runTests = createTestRunner(workspace);
    workspace.analyzeCode = createCodeAnalyzer(workspace);
    workspace.analyzeError = createErrorAnalyzer(workspace);
    workspace.getLastModifiedTime = getLastModifiedTime;

    return workspace;
  } catch (error) {
    // Cleanup on failure
    await fsPromises.rm(rootDir, { recursive: true, force: true });
    throw error;
  }
}

export async function cleanupWorkspace(workspace: Workspace): Promise<void> {
  console.log("Cleaning up workspace", workspace.rootDir);
  await fsPromises.rm(workspace.rootDir, { recursive: true, force: true });
}

function readContext(workspace: Workspace): AgentContext {
  try {
    const content = fs.readFileSync(workspace.contextFile, "utf-8");
    return deserializeContext(content);
  } catch (e) {
    if ((e as { code?: string }).code === "ENOENT") {
      // Create default context if file doesn't exist
      const defaultContext: AgentContext = {
        goalState: "Improve code quality and efficiency",
        history: [],
      };
      // Write synchronously
      fs.writeFileSync(workspace.contextFile, serializeContext(defaultContext));
      return defaultContext;
    }
    throw e;
  }
}

async function writeContext(
  workspace: Workspace,
  context: AgentContext,
): Promise<void> {
  await fsPromises.writeFile(workspace.contextFile, serializeContext(context));
}

async function updateContext(
  workspace: Workspace,
  update: Partial<AgentContext>,
): Promise<AgentContext> {
  const current = readContext(workspace);

  const updated: AgentContext = {
    ...current,
    ...update,
    history: update.history
      ? [...current.history, ...update.history]
      : current.history,
  };

  await writeContext(workspace, updated);
  return updated;
}

export async function commitAndPush(
  workspace: Workspace,
  message: string,
): Promise<void> {
  const { sourceDir } = workspace;

  await runCommand("git", ["add", "."], sourceDir);
  await runCommand("git", ["commit", "-m", message], sourceDir);
  await runCommand(
    "git",
    ["push", "origin", workspace.config.branch],
    sourceDir,
  );
}

// Function to get the last modified time of a file
async function getLastModifiedTime(filePath: string): Promise<number> {
  try {
    const stats = await fsPromises.stat(filePath);
    return stats.mtimeMs;
  } catch (e) {
    return 0; // Return 0 if file doesn't exist
  }
}

// Implementation of the test runner
function createTestRunner(workspace: Workspace) {
  return async (command: string): Promise<TestResult> => {
    const scopedPath = path.join(
      workspace.sourceDir,
      "examples",
      "self-modifying-code",
    );

    try {
      // Determine the test command based on the input
      const testCmd = command === "run-all" 
        ? ["test"] 
        : ["test", command];

      // Run the tests
      const { exitCode, stdout, stderr } = await captureCommand(
        "pnpm",
        testCmd,
        scopedPath,
      );

      // Parse test results
      const output = stdout + (stderr ? `\n${stderr}` : "");
      
      // Simple regex-based parsing for test results
      // This is a basic implementation - would need to be adapted to actual test output format
      const totalMatch = output.match(/Total tests: (\d+)/i);
      const passedMatch = output.match(/Passed: (\d+)/i);
      const failedMatch = output.match(/Failed: (\d+)/i);
      
      const total = totalMatch ? parseInt(totalMatch[1], 10) : 0;
      const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
      const failed = failedMatch ? parseInt(failedMatch[1], 10) : 0;

      return {
        success: exitCode === 0,
        output,
        total: total || (passed + failed),
        passed,
        failed,
      };
    } catch (error) {
      return {
        success: false,
        output: String(error),
        total: 0,
        passed: 0,
        failed: 1,
      };
    }
  };
}

// Implementation of the code analyzer
function createCodeAnalyzer(workspace: Workspace) {
  return async (filePath: string, analysisType: string): Promise<CodeAnalysisResult> => {
    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(workspace.sourceDir, "examples", "self-modifying-code", filePath);
    
    try {
      // Default result structure
      const result: CodeAnalysisResult = {
        summary: `Analysis completed for ${filePath}`,
        issues: [],
        suggestions: [],
      };

      // Different analysis types
      switch (analysisType) {
        case "code-quality":
          // Run ESLint if available
          const { exitCode, stdout, stderr } = await captureCommand(
            "npx",
            ["eslint", "--format", "json", fullPath],
            workspace.sourceDir,
          );
          
          if (exitCode === 0) {
            result.summary = `No linting issues found in ${filePath}`;
          } else {
            try {
              // Parse ESLint JSON output
              const lintResults = JSON.parse(stdout || "[]");
              
              // Extract issues from ESLint results
              lintResults.forEach((fileResult: any) => {
                fileResult.messages.forEach((msg: any) => {
                  result.issues.push({
                    description: msg.message,
                    severity: msg.severity === 2 ? "error" : "warning",
                    location: `${fileResult.filePath}:${msg.line}:${msg.column}`,
                  });
                });
              });
              
              result.summary = `Found ${result.issues.length} issues in ${filePath}`;
            } catch (e) {
              // If parsing fails, use raw output
              result.summary = `Analysis completed with warnings: ${stderr || stdout}`;
            }
          }
          break;
          
        case "patterns":
          // Simple pattern detection based on file extension
          const ext = path.extname(filePath);
          if (ext === ".tsx" || ext === ".ts") {
            // Look for React patterns in TSX files
            const fileContent = await fsPromises.readFile(fullPath, "utf-8");
            
            // Check for common patterns
            if (fileContent.includes("useState") && !fileContent.includes("useEffect")) {
              result.suggestions.push("Consider using useEffect for side effects related to state changes");
            }
            
            if (fileContent.includes("console.log")) {
              result.issues.push({
                description: "Console statements should be removed in production code",
                severity: "warning",
                location: filePath,
              });
            }
          }
          break;
          
        case "suggestions":
          // Generate improvement suggestions
          result.suggestions = [
            "Consider adding more comprehensive error handling",
            "Add detailed comments for complex logic",
            "Extract repeated code into reusable functions",
          ];
          break;
          
        case "dependencies":
          // Analyze imports and dependencies
          const fileContent = await fsPromises.readFile(fullPath, "utf-8");
          const importMatches = fileContent.match(/import .* from ["'](.*)["']/g) || [];
          
          result.summary = `Found ${importMatches.length} imports in ${filePath}`;
          
          if (importMatches.length > 10) {
            result.issues.push({
              description: "File has too many dependencies, consider refactoring",
              severity: "warning",
              location: filePath,
            });
            
            result.suggestions.push("Split this file into smaller modules with focused responsibilities");
          }
          break;
      }

      return result;
    } catch (error) {
      return {
        summary: `Error analyzing ${filePath}: ${error}`,
        issues: [{
          description: String(error),
          severity: "error",
          location: filePath,
        }],
        suggestions: ["Fix the error before proceeding with further analysis"],
      };
    }
  };
}

// Implementation of the error analyzer
function createErrorAnalyzer(workspace: Workspace) {
  return async (errorText: string, errorType: string): Promise<ErrorAnalysisResult> => {
    // Default result structure
    const result: ErrorAnalysisResult = {
      rootCause: "Unknown error",
      suggestedFixes: [],
      affectedFiles: [],
    };

    try {
      switch (errorType) {
        case "build":
          // Parse TypeScript errors
          const tsErrors = errorText.match(/TS\d+:.*?(?=\n\n|\n[^:]*:|\n$|$)/gs) || [];
          
          if (tsErrors.length > 0) {
            // Extract file paths from error messages
            const fileRegex = /([^\s(]+\.[jt]sx?)/g;
            const files = new Set<string>();
            let match;
            
            while ((match = fileRegex.exec(errorText)) !== null) {
              files.add(match[1]);
            }
            
            result.rootCause = "TypeScript compilation errors";
            result.affectedFiles = Array.from(files);
            
            // Analyze common error types
            if (errorText.includes("TS2322")) {
              result.suggestedFixes.push("Type mismatch - check variable types and ensure they match expected types");
            }
            
            if (errorText.includes("TS2307")) {
              result.suggestedFixes.push("Module not found - check import paths and ensure dependencies are installed");
            }
            
            if (errorText.includes("TS1005")) {
              result.suggestedFixes.push("Syntax error - check for missing brackets, semicolons, or other syntax issues");
            }
            
            // Add more specific error types
            if (errorText.includes("TS2339")) {
              result.suggestedFixes.push("Property does not exist - check object properties and interfaces");
            }
            
            if (errorText.includes("TS2345")) {
              result.suggestedFixes.push("Argument type mismatch - check function parameter types");
            }
            
            if (errorText.includes("TS2554")) {
              result.suggestedFixes.push("Expected more arguments - check function call parameters");
            }
            
            if (errorText.includes("TS2741")) {
              result.suggestedFixes.push("Incompatible property types - check interface implementations");
            }
          } else if (errorText.includes("SyntaxError")) {
            result.rootCause = "JavaScript syntax error";
            result.suggestedFixes.push("Check for syntax errors like missing brackets, quotes, or semicolons");
            
            // Try to extract file information from syntax error
            const syntaxErrorMatch = errorText.match(/SyntaxError.*?([^\s(]+\.[jt]sx?)/);
            if (syntaxErrorMatch && syntaxErrorMatch[1]) {
              result.affectedFiles.push(syntaxErrorMatch[1]);
            }
          } else if (errorText.includes("Cannot find module")) {
            result.rootCause = "Missing module dependency";
            result.suggestedFixes.push("Check import paths and ensure dependencies are installed");
            result.suggestedFixes.push("Run 'pnpm install' to install missing dependencies");
            
            // Extract the missing module name
            const moduleMatch = errorText.match(/Cannot find module ['"]([^'"]+)['"]/);
            if (moduleMatch && moduleMatch[1]) {
              result.suggestedFixes.push(`Install the missing module: pnpm add ${moduleMatch[1]}`);
            }
          } else {
            result.rootCause = "Build process error";
            result.suggestedFixes.push("Check build configuration and dependencies");
            result.suggestedFixes.push("Verify TypeScript configuration in tsconfig.json");
          }
          break;
          
        case "test":
          result.rootCause = "Test failures";
          
          if (errorText.includes("Expected")) {
            result.suggestedFixes.push("Check test assertions - expected values don't match actual values");
          }
          
          if (errorText.includes("TypeError")) {
            result.suggestedFixes.push("Check for undefined values or incorrect property access in tests");
          }
          
          // Extract file paths from test output
          const testFileRegex = /([^\s(]+\.test\.[jt]sx?)/g;
          const testFiles = new Set<string>();
          let testMatch;
          
          while ((testMatch = testFileRegex.exec(errorText)) !== null) {
            testFiles.add(testMatch[1]);
          }
          
          result.affectedFiles = Array.from(testFiles);
          
          // Add more specific test error analysis
          if (errorText.includes("timeout")) {
            result.suggestedFixes.push("Test timed out - check for asynchronous operations that aren't properly resolved");
          }
          
          if (errorText.includes("snapshot")) {
            result.suggestedFixes.push("Snapshot test failed - update snapshots if changes are expected");
            result.suggestedFixes.push("Run tests with 'pnpm test -- -u' to update snapshots");
          }
          break;
          
        case "runtime":
          result.rootCause = "Runtime error";
          
          if (errorText.includes("undefined is not a function")) {
            result.suggestedFixes.push("Check for null or undefined values before calling methods");
            result.suggestedFixes.push("Use optional chaining (?.) for method calls that might be undefined");
          }
          
          if (errorText.includes("Cannot read property")) {
            result.suggestedFixes.push("Use optional chaining (?.) or nullish coalescing (??) operators");
            result.suggestedFixes.push("Add null checks before accessing properties");
          }
          
          if (errorText.includes("Maximum call stack size exceeded")) {
            result.suggestedFixes.push("Check for infinite recursion or circular references");
            result.suggestedFixes.push("Ensure recursive functions have proper termination conditions");
          }
          
          // Add more specific runtime error analysis
          if (errorText.includes("Uncaught Promise")) {
            result.suggestedFixes.push("Handle promise rejections with try/catch or .catch()");
            result.suggestedFixes.push("Ensure all async functions properly handle errors");
          }
          
          if (errorText.includes("memory")) {
            result.suggestedFixes.push("Check for memory leaks or large data structures");
            result.suggestedFixes.push("Optimize memory usage by cleaning up unused resources");
          }
          break;
          
        case "lint":
          result.rootCause = "Code style or quality issues";
          result.suggestedFixes.push("Run 'eslint --fix' to automatically fix some issues");
          result.suggestedFixes.push("Review coding standards and ensure consistent style");
          
          // Extract file information from lint output
          const lintFileRegex = /([^\s:]+\.[jt]sx?):/g;
          const lintFiles = new Set<string>();
          let lintMatch;
          
          while ((lintMatch = lintFileRegex.exec(errorText)) !== null) {
            lintFiles.add(lintMatch[1]);
          }
          
          result.affectedFiles = Array.from(lintFiles);
          break;
      }

      // If no specific fixes were added, add a generic one
      if (result.suggestedFixes.length === 0) {
        result.suggestedFixes.push("Review the error message carefully and address the specific issues mentioned");
      }

      return result;
    } catch (error) {
      return {
        rootCause: `Error analyzing error: ${error}`,
        suggestedFixes: ["Fix the meta-error before proceeding"],
        affectedFiles: [],
      };
    }
  };
}

export async function buildWorkspace(workspace: Workspace): Promise<string> {
  try {
    // Run pnpm build and capture output
    const proc = spawn("pnpm", ["build"], {
      cwd: workspace.sourceDir,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    let error = "";

    // Collect stdout
    proc.stdout.on("data", (data: Buffer) => {
      output += data.toString();
    });

    // Collect stderr
    proc.stderr.on("data", (data: Buffer) => {
      error += data.toString();
    });

    // Wait for process to complete
    const exitCode = await new Promise<number>((resolve) => {
      proc.on("exit", resolve);
    });

    if (exitCode === 0) {
      return output;
    } else {
      return error || "Build failed with no error output";
    }
  } catch (e) {
    return String(e);
  }
}

// Extract error type from build output
function extractErrorType(output: string): string {
  if (output.includes("TS")) return "typescript";
  if (output.includes("SyntaxError")) return "syntax";
  if (output.includes("Cannot find module")) return "module";
  if (output.includes("Error: ")) return "runtime";
  return "unknown";
}

// Extract affected file locations from error output
function extractAffectedFiles(output: string): string[] {
  const files = new Set<string>();
  
  // Match file paths in error messages
  const fileRegex = /([^\s:()]+\.[jt]sx?)[:\(]/g;
  let match;
  
  while ((match = fileRegex.exec(output)) !== null) {
    files.add(match[1]);
  }
  
  return Array.from(files);
}

export async function validateBuild(
  workspace: Workspace,
): Promise<BuildValidationResult> {
  try {
    // Scope to examples/self-modifying-code
    const scopedPath = path.join(
      workspace.sourceDir,
      "examples",
      "self-modifying-code",
    );

    // Check if we can use cached build results
    if (workspace.buildCache) {
      const cachedOutput = await checkBuildCache(workspace, scopedPath);
      if (cachedOutput) {
        console.log("Using cached build result");
        return {
          success: true,
          output: cachedOutput,
        };
      }
    }

    // Run pnpm build and capture output
    const proc = spawn("pnpm", ["build"], {
      cwd: scopedPath,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let procOutput = "";
    let error = "";

    // Collect stdout
    proc.stdout.on("data", (data: Buffer) => {
      procOutput += data.toString();
    });

    // Collect stderr
    proc.stderr.on("data", (data: Buffer) => {
      error += data.toString();
    });

    // Wait for process to complete and get exit code
    const exitCode = await new Promise<number>((resolve) => {
      proc.on("exit", resolve);
    });

    console.info("Build exit code", exitCode);
    console.info("Build output", procOutput);
    console.info("Build error", error);

    let output = procOutput.trim();
    if (exitCode !== 0) {
      output += `\n${error.trim()}`;
    }
    if (!output) {
      output = "Build failed with no error output";
    }

    // Cache successful build results
    if (exitCode === 0 && workspace.buildCache) {
      const cacheKey = await generateBuildCacheKey(scopedPath);
      workspace.buildCache.set(cacheKey, output);
    }

    // For failed builds, extract more detailed error information
    if (exitCode !== 0) {
      const errorType = extractErrorType(output);
      const affectedFiles = extractAffectedFiles(output);
      
      // Find the specific error location if possible
      let location = undefined;
      const locationMatch = output.match(/(\S+\.tsx?)\((\d+),(\d+)\)/);
      if (locationMatch) {
        location = `${locationMatch[1]} (line ${locationMatch[2]}, column ${locationMatch[3]})`;
      }
      
      return {
        success: false,
        output,
        errorDetails: {
          type: errorType,
          location,
          affectedFiles,
        }
      };
    }

    return {
      success: exitCode === 0,
      output,
    };
  } catch (e) {
    return {
      success: false,
      output: String(e),
      errorDetails: {
        type: "exception",
        affectedFiles: [],
      }
    };
  }
}

// Helper function to generate a cache key based on file timestamps
async function generateBuildCacheKey(directory: string): Promise<string> {
  try {
    // Get all TypeScript files in the directory
    const { stdout } = await captureCommand(
      "find",
      [directory, "-type", "f", "-name", "*.ts", "-o", "-name", "*.tsx"],
      directory,
    );

    const files = stdout.trim().split("\n").filter(Boolean);
    
    // Get modification times for all files
    const modTimes = await Promise.all(
      files.map(async (file) => {
        const stats = await fsPromises.stat(file);
        return `${file}:${stats.mtimeMs}`;
      })
    );
    
    // Create a hash from all file mod times
    return modTimes.sort().join("|");
  } catch (error) {
    console.error("Error generating build cache key:", error);
    // Return current timestamp as fallback
    return Date.now().toString();
  }
}

// Helper function to check if we can use cached build results
async function checkBuildCache(
  workspace: Workspace,
  directory: string,
): Promise<string | null> {
  if (!workspace.buildCache) return null;
  
  try {
    const currentKey = await generateBuildCacheKey(directory);
    const cachedOutput = workspace.buildCache.get(currentKey);
    return cachedOutput || null;
  } catch (error) {
    console.error("Error checking build cache:", error);
    return null;
  }
}
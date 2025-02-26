import { GSXTool } from "@gensx/anthropic";
import { z } from "zod";
import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";

import { validateBuild, type Workspace } from "../../workspace.js";

// Enhanced schema for build tool with more options
const buildToolSchema = z.object({
  mode: z.enum(["full", "typecheck", "test", "incremental"])
    .optional()
    .describe("Build mode: 'full' (default), 'typecheck' (types only), 'test' (run tests), 'incremental' (faster partial build)"),
  files: z.array(z.string())
    .optional()
    .describe("List of files to check/build (for typecheck and incremental modes)"),
  verbose: z.boolean()
    .optional()
    .describe("Whether to show detailed output"),
});

type BuildToolParams = z.infer<typeof buildToolSchema>;

interface BuildResult {
  success: boolean;
  output: string;
  errors?: {
    file?: string;
    line?: number;
    column?: number;
    message: string;
  }[];
  warnings?: {
    file?: string;
    line?: number;
    column?: number;
    message: string;
  }[];
}

/**
 * Run TypeScript type checking on specific files or the entire project
 */
async function runTypeCheck(
  workspace: Workspace, 
  files?: string[],
  verbose = false
): Promise<BuildResult> {
  const scopedPath = path.join(
    workspace.sourceDir,
    "examples",
    "self-modifying-code"
  );
  
  let command = "npx";
  let args = ["tsc", "--noEmit"];
  
  if (verbose) {
    args.push("--pretty");
  } else {
    args.push("--pretty", "false");
  }
  
  // If specific files are provided, add them to the command
  if (files && files.length > 0) {
    args = [...args, ...files];
  }
  
  try {
    const proc = spawn(command, args, {
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
    
    // Wait for process to complete
    const exitCode = await new Promise<number>((resolve) => {
      proc.on("exit", resolve);
    });
    
    const output = procOutput.trim() + (error.trim() ? `\n${error.trim()}` : "");
    
    // Parse errors from TypeScript output
    const errors = parseTypeScriptErrors(output);
    
    return {
      success: exitCode === 0,
      output,
      errors: exitCode !== 0 ? errors : undefined,
    };
  } catch (e) {
    return {
      success: false,
      output: String(e),
      errors: [{
        message: String(e),
      }],
    };
  }
}

/**
 * Run tests for the project or specific files
 */
async function runTests(
  workspace: Workspace,
  files?: string[]
): Promise<BuildResult> {
  const scopedPath = path.join(
    workspace.sourceDir,
    "examples",
    "self-modifying-code"
  );
  
  // Check if tests exist
  try {
    const testDirExists = await fs.stat(path.join(scopedPath, "tests"))
      .then(() => true)
      .catch(() => false);
    
    if (!testDirExists) {
      return {
        success: true,
        output: "No tests directory found. Skipping tests.",
      };
    }
    
    // Construct test command - this is a placeholder
    // In a real project, you would use the actual test runner (Jest, Vitest, etc.)
    let command = "npx";
    let args = ["jest"];
    
    if (files && files.length > 0) {
      // Filter for test files or add corresponding test files
      const testFiles = files.map(file => {
        const basename = path.basename(file, path.extname(file));
        return `tests/${basename}.test.ts`;
      });
      args = [...args, ...testFiles];
    }
    
    const proc = spawn(command, args, {
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
    
    // Wait for process to complete
    const exitCode = await new Promise<number>((resolve) => {
      proc.on("exit", resolve);
    });
    
    const output = procOutput.trim() + (error.trim() ? `\n${error.trim()}` : "");
    
    return {
      success: exitCode === 0,
      output,
      errors: exitCode !== 0 ? [{ message: "Test failures occurred" }] : undefined,
    };
  } catch (e) {
    return {
      success: false,
      output: String(e),
      errors: [{
        message: String(e),
      }],
    };
  }
}

/**
 * Run incremental build for faster feedback
 */
async function runIncrementalBuild(
  workspace: Workspace,
  files?: string[]
): Promise<BuildResult> {
  const scopedPath = path.join(
    workspace.sourceDir,
    "examples",
    "self-modifying-code"
  );
  
  try {
    // First run type checking
    const typeCheckResult = await runTypeCheck(workspace, files);
    
    if (!typeCheckResult.success) {
      return typeCheckResult;
    }
    
    // If type checking passed, run a partial build
    const command = "npx";
    const args = ["tsc", "--incremental"];
    
    if (files && files.length > 0) {
      // In a real implementation, you might use a different approach for incremental builds
      // This is a simplified version
    }
    
    const proc = spawn(command, args, {
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
    
    // Wait for process to complete
    const exitCode = await new Promise<number>((resolve) => {
      proc.on("exit", resolve);
    });
    
    const output = procOutput.trim() + (error.trim() ? `\n${error.trim()}` : "");
    
    return {
      success: exitCode === 0,
      output: output || "Incremental build completed successfully",
      errors: exitCode !== 0 ? parseTypeScriptErrors(output) : undefined,
    };
  } catch (e) {
    return {
      success: false,
      output: String(e),
      errors: [{
        message: String(e),
      }],
    };
  }
}

/**
 * Parse TypeScript error messages into structured format
 */
function parseTypeScriptErrors(output: string): { file?: string; line?: number; column?: number; message: string }[] {
  const errors: { file?: string; line?: number; column?: number; message: string }[] = [];
  
  // TypeScript error format: file(line,col): error TS2345: ...
  const errorRegex = /([^(]+)\((\d+),(\d+)\):\s+error\s+TS\d+:\s+(.*)/g;
  
  let match;
  while ((match = errorRegex.exec(output)) !== null) {
    errors.push({
      file: match[1].trim(),
      line: parseInt(match[2], 10),
      column: parseInt(match[3], 10),
      message: match[4].trim(),
    });
  }
  
  // If no structured errors were found but there is output, add it as a generic error
  if (errors.length === 0 && output.trim()) {
    errors.push({
      message: output.trim(),
    });
  }
  
  return errors;
}

export function getBuildTool(workspace: Workspace) {
  return new GSXTool<typeof buildToolSchema>({
    name: "build",
    description:
      "Build the project using pnpm build. Returns build output or error messages. Can also run type checking, tests, or incremental builds.",
    schema: buildToolSchema,
    run: async (params: BuildToolParams) => {
      const mode = params.mode || "full";
      const files = params.files;
      const verbose = params.verbose || false;
      
      let result: BuildResult;
      
      switch (mode) {
        case "typecheck":
          result = await runTypeCheck(workspace, files, verbose);
          break;
          
        case "test":
          result = await runTests(workspace, files);
          break;
          
        case "incremental":
          result = await runIncrementalBuild(workspace, files);
          break;
          
        case "full":
        default:
          const buildOutput = await validateBuild(workspace);
          result = {
            success: buildOutput.success,
            output: buildOutput.output,
            errors: !buildOutput.success ? [{ message: buildOutput.output }] : undefined,
          };
          break;
      }
      
      // Format the result for better readability
      if (verbose) {
        return JSON.stringify(result, null, 2);
      }
      
      if (result.errors && result.errors.length > 0) {
        const errorDetails = result.errors.map(err => {
          const location = err.file ? 
            `${err.file}${err.line ? `:${err.line}` : ""}${err.column ? `:${err.column}` : ""}` : 
            "";
          return location ? `${location}: ${err.message}` : err.message;
        }).join("\n");
        
        return `Build failed:\n${errorDetails}`;
      }
      
      return result.output || "Build completed successfully";
    },
  });
}
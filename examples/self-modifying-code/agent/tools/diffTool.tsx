import { execSync } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";

import { GSXTool } from "@gensx/anthropic";
import { serializeError } from "serialize-error";
import { z } from "zod";

// Define the schema for diff operations
const diffToolSchema = z.object({
  command: z
    .enum(["diff", "summary", "analyze"])
    .describe(
      "The commands to run. Options: `diff` (detailed diff), `summary` (concise summary), `analyze` (impact analysis).",
    ),
  pathA: z
    .string()
    .describe("Path to the first file or version to compare."),
  pathB: z
    .string()
    .describe("Path to the second file or version to compare."),
  format: z
    .enum(["unified", "side-by-side", "context", "html"])
    .optional()
    .describe("Format for the diff output. Default is 'unified'."),
  contextLines: z
    .number()
    .optional()
    .describe("Number of context lines to show around changes. Default is 3."),
});

type DiffToolParams = z.infer<typeof diffToolSchema>;

// Create a temporary file for diff operations
async function createTempFile(content: string): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "diff-"));
  const tempFile = path.join(tempDir, "temp.txt");
  await fs.writeFile(tempFile, content, "utf-8");
  return tempFile;
}

// Generate a diff between two files
async function generateDiff(fileA: string, fileB: string, format: string, contextLines: number): Promise<string> {
  try {
    let diffCmd = "";
    
    switch (format) {
      case "unified":
        diffCmd = `diff -U${contextLines} "${fileA}" "${fileB}"`;
        break;
      case "side-by-side":
        diffCmd = `diff -y --width=120 "${fileA}" "${fileB}"`;
        break;
      case "context":
        diffCmd = `diff -C${contextLines} "${fileA}" "${fileB}"`;
        break;
      case "html":
        // First create a unified diff
        const unifiedDiff = execSync(`diff -U${contextLines} "${fileA}" "${fileB}"`, { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }).toString();
        
        // Then convert to HTML (this is a simplified version)
        let html = "<html><head><style>\n";
        html += ".diff {font-family: monospace; white-space: pre;}\n";
        html += ".added {background-color: #cfc; color: #060;}\n";
        html += ".removed {background-color: #fcc; color: #600;}\n";
        html += ".header {color: #33a;}\n";
        html += "</style></head><body><div class='diff'>\n";
        
        unifiedDiff.split("\n").forEach(line => {
          if (line.startsWith("+")) {
            html += `<div class='added'>${line}</div>\n`;
          } else if (line.startsWith("-")) {
            html += `<div class='removed'>${line}</div>\n`;
          } else if (line.startsWith("@@")) {
            html += `<div class='header'>${line}</div>\n`;
          } else {
            html += `<div>${line}</div>\n`;
          }
        });
        
        html += "</div></body></html>";
        
        // Save HTML to temp file
        const tempHtmlFile = await createTempFile(html);
        return html;
      default:
        diffCmd = `diff -U${contextLines} "${fileA}" "${fileB}"`;
    }
    
    try {
      return execSync(diffCmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }).toString();
    } catch (error: any) {
      // diff returns non-zero exit code when files differ
      return error.stdout || "";
    }
  } catch (error) {
    throw new Error(`Failed to generate diff: ${error}`);
  }
}

// Generate a summary of changes
function generateSummary(diff: string): { added: number; removed: number; changed: number; summary: string } {
  const lines = diff.split("\n");
  let added = 0;
  let removed = 0;
  let changed = 0;
  
  lines.forEach(line => {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      added++;
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      removed++;
    }
  });
  
  // Estimate changed lines (this is a rough approximation)
  changed = Math.min(added, removed);
  added -= changed;
  removed -= changed;
  
  const summary = `Summary of changes:
- Lines added: ${added}
- Lines removed: ${removed}
- Lines changed: ${changed}
- Total modifications: ${added + removed + changed}`;
  
  return { added, removed, changed, summary };
}

// Analyze the impact of changes
function analyzeImpact(diff: string): { 
  impactLevel: "high" | "medium" | "low"; 
  analysis: string;
  criticalAreas: string[];
} {
  const lines = diff.split("\n");
  let functionsChanged = new Set<string>();
  let importsChanged = false;
  let exportsChanged = false;
  let interfacesChanged = false;
  let criticalAreas: string[] = [];
  
  // Look for patterns in the diff that indicate the type of changes
  lines.forEach(line => {
    if ((line.startsWith("+") || line.startsWith("-")) && !line.startsWith("+++") && !line.startsWith("---")) {
      // Check for function definitions
      const functionMatch = line.match(/function\s+(\w+)/);
      if (functionMatch) {
        functionsChanged.add(functionMatch[1]);
      }
      
      // Check for method definitions
      const methodMatch = line.match(/(\w+)\s*\([^)]*\)\s*{/);
      if (methodMatch) {
        functionsChanged.add(methodMatch[1]);
      }
      
      // Check for imports
      if (line.includes("import ")) {
        importsChanged = true;
        criticalAreas.push("Dependencies (imports)");
      }
      
      // Check for exports
      if (line.includes("export ")) {
        exportsChanged = true;
        criticalAreas.push("Public API (exports)");
      }
      
      // Check for interfaces
      if (line.includes("interface ") || line.includes("type ")) {
        interfacesChanged = true;
        criticalAreas.push("Type definitions");
      }
    }
  });
  
  // Determine impact level
  let impactLevel: "high" | "medium" | "low" = "low";
  
  if (importsChanged && exportsChanged && interfacesChanged) {
    impactLevel = "high";
  } else if ((importsChanged && exportsChanged) || 
             (importsChanged && interfacesChanged) || 
             (exportsChanged && interfacesChanged) ||
             functionsChanged.size > 5) {
    impactLevel = "medium";
  }
  
  // Generate analysis text
  let analysis = `Impact Analysis:
- Impact Level: ${impactLevel.toUpperCase()}
- Functions/Methods Modified: ${functionsChanged.size > 0 ? Array.from(functionsChanged).join(", ") : "None"}
- Import Statements Changed: ${importsChanged ? "Yes" : "No"}
- Export Statements Changed: ${exportsChanged ? "Yes" : "No"}
- Type Definitions Changed: ${interfacesChanged ? "Yes" : "No"}`;

  if (impactLevel === "high") {
    analysis += "\n\nThis change has a HIGH impact as it modifies core interfaces, imports, and exports. Consider thorough testing.";
  } else if (impactLevel === "medium") {
    analysis += "\n\nThis change has a MEDIUM impact. Testing is recommended for affected functionality.";
  } else {
    analysis += "\n\nThis change has a LOW impact and is likely isolated. Basic testing should be sufficient.";
  }
  
  // Remove duplicates from critical areas
  criticalAreas = Array.from(new Set(criticalAreas));
  
  return { 
    impactLevel, 
    analysis,
    criticalAreas
  };
}

export const diffTool = new GSXTool<typeof diffToolSchema>({
  name: "diff",
  description: `Tool for comparing different versions of files and analyzing changes.

Commands:
* diff: Generate a detailed diff between two files
  - Shows line-by-line changes with context
  - Supports different output formats
* summary: Generate a concise summary of changes
  - Counts added, removed, and changed lines
  - Provides a high-level overview of modifications
* analyze: Analyze the impact of changes
  - Evaluates the significance of the changes
  - Identifies critical areas affected by changes`,
  schema: diffToolSchema,
  run: async (params: DiffToolParams) => {
    console.log("🔍 Calling the DiffTool:", params);

    try {
      // Set default values
      const format = params.format || "unified";
      const contextLines = params.contextLines || 3;
      
      // Check if files exist
      const statsA = await fs.stat(params.pathA).catch(() => null);
      const statsB = await fs.stat(params.pathB).catch(() => null);
      
      if (!statsA) {
        throw new Error(`First file does not exist: ${params.pathA}`);
      }
      
      if (!statsB) {
        throw new Error(`Second file does not exist: ${params.pathB}`);
      }
      
      if (statsA.isDirectory() || statsB.isDirectory()) {
        throw new Error("Paths must be files, not directories");
      }

      // Generate the diff
      const diff = await generateDiff(params.pathA, params.pathB, format, contextLines);
      
      switch (params.command) {
        case "diff": {
          return {
            success: true,
            message: `Diff between ${params.pathA} and ${params.pathB}`,
            diff,
            format,
          };
        }
        
        case "summary": {
          const summary = generateSummary(diff);
          
          return {
            success: true,
            message: `Summary of changes between ${params.pathA} and ${params.pathB}`,
            ...summary,
          };
        }
        
        case "analyze": {
          const impact = analyzeImpact(diff);
          const summary = generateSummary(diff);
          
          return {
            success: true,
            message: `Analysis of changes between ${params.pathA} and ${params.pathB}`,
            diff: diff.length > 1000 ? diff.substring(0, 1000) + "... (truncated)" : diff,
            summary: summary.summary,
            ...impact,
          };
        }
        
        default:
          throw new Error(`Unknown command: ${String(params.command)}`);
      }
    } catch (error) {
      console.error("Diff tool error:", error);
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
        error: serializeError(error),
      };
    }
  },
});
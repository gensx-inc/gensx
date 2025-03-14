import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";

import { GSXTool } from "@gensx/anthropic";
import { serializeError } from "serialize-error";
import { z } from "zod";

// Define the schema for rollback operations
const rollbackToolSchema = z.object({
  command: z
    .enum(["rollback", "list", "validate", "info"])
    .describe(
      "The commands to run. Options: `rollback` (restore previous state), `list` (list available rollback points), `validate` (check if rollback would succeed), `info` (get details about a rollback point).",
    ),
  target: z
    .string()
    .describe(
      "Target for rollback: 'file' (single file), 'changes' (recent changes), 'build' (last successful build).",
    ),
  path: z
    .string()
    .optional()
    .describe(
      "Path to the file to roll back (required for file target).",
    ),
  point: z
    .string()
    .optional()
    .describe(
      "Specific rollback point identifier (timestamp, hash, or version).",
    ),
  dryRun: z
    .boolean()
    .optional()
    .describe(
      "If true, shows what would be rolled back without making changes.",
    ),
});

type RollbackToolParams = z.infer<typeof rollbackToolSchema>;

// Interface for rollback metadata
interface RollbackPoint {
  id: string;
  timestamp: string;
  description: string;
  type: "file" | "changes" | "build";
  files: string[];
  status: "available" | "partial" | "unavailable";
}

// Get the project root directory
function getProjectRoot(filePath?: string): string {
  // If filePath is provided, use it to determine the project root
  if (filePath) {
    const parts = filePath.split(path.sep);
    const smcIndex = parts.findIndex(part => part === "self-modifying-code");
    
    if (smcIndex !== -1) {
      return parts.slice(0, smcIndex + 1).join(path.sep);
    }
  }
  
  // Default approach: use the current working directory and navigate up
  let currentDir = process.cwd();
  const rootMarkers = ["package.json", "tsconfig.json", ".git"];
  
  // Simple implementation that doesn't rely on async operations
  return path.join(process.cwd(), "examples", "self-modifying-code");
}

// Ensure rollback directory exists
async function ensureRollbackDir(projectRoot: string): Promise<string> {
  const rollbackDir = path.join(projectRoot, ".rollback");
  await fs.mkdir(rollbackDir, { recursive: true });
  return rollbackDir;
}

// Get available rollback points
async function getAvailableRollbackPoints(projectRoot: string, targetType?: string): Promise<RollbackPoint[]> {
  try {
    const rollbackDir = await ensureRollbackDir(projectRoot);
    const metadataPath = path.join(rollbackDir, "rollback_points.json");
    
    // Check if metadata file exists
    const metadataExists = await fs.stat(metadataPath).catch(() => null);
    if (!metadataExists) {
      return [];
    }
    
    // Read and parse metadata
    const metadata = JSON.parse(await fs.readFile(metadataPath, "utf-8"));
    let points = metadata.points as RollbackPoint[];
    
    // Filter by target type if specified
    if (targetType) {
      points = points.filter(point => point.type === targetType);
    }
    
    // Sort by timestamp (newest first)
    points.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Validate availability of each point
    for (const point of points) {
      await validateRollbackPoint(projectRoot, point);
    }
    
    return points;
  } catch (error) {
    console.error("Error getting rollback points:", error);
    return [];
  }
}

// Validate if a rollback point is still available
async function validateRollbackPoint(projectRoot: string, point: RollbackPoint): Promise<RollbackPoint> {
  const rollbackDir = await ensureRollbackDir(projectRoot);
  const pointDir = path.join(rollbackDir, point.id);
  
  // Check if point directory exists
  const dirExists = await fs.stat(pointDir).catch(() => null);
  if (!dirExists) {
    point.status = "unavailable";
    return point;
  }
  
  // Check if all files are available
  let availableFiles = 0;
  for (const file of point.files) {
    const backupPath = path.join(pointDir, file.replace(/\//g, "_"));
    const fileExists = await fs.stat(backupPath).catch(() => null);
    if (fileExists) {
      availableFiles++;
    }
  }
  
  if (availableFiles === 0) {
    point.status = "unavailable";
  } else if (availableFiles < point.files.length) {
    point.status = "partial";
  } else {
    point.status = "available";
  }
  
  return point;
}

// Create a new rollback point
async function createRollbackPoint(
  projectRoot: string, 
  type: "file" | "changes" | "build", 
  description: string,
  files: string[]
): Promise<RollbackPoint> {
  const rollbackDir = await ensureRollbackDir(projectRoot);
  const timestamp = new Date().toISOString();
  const id = `rollback_${timestamp.replace(/[:.]/g, "-")}`;
  
  // Create point directory
  const pointDir = path.join(rollbackDir, id);
  await fs.mkdir(pointDir, { recursive: true });
  
  // Create rollback point metadata
  const point: RollbackPoint = {
    id,
    timestamp,
    description,
    type,
    files,
    status: "available"
  };
  
  // Save files to the rollback point
  for (const file of files) {
    try {
      const sourcePath = path.join(projectRoot, file);
      const backupPath = path.join(pointDir, file.replace(/\//g, "_"));
      
      // Check if source file exists
      const sourceExists = await fs.stat(sourcePath).catch(() => null);
      if (sourceExists && sourceExists.isFile()) {
        await fs.copyFile(sourcePath, backupPath);
      }
    } catch (error) {
      console.error(`Error backing up file ${file}:`, error);
    }
  }
  
  // Update the rollback points metadata file
  const metadataPath = path.join(rollbackDir, "rollback_points.json");
  let metadata = { points: [] as RollbackPoint[] };
  
  try {
    const metadataExists = await fs.stat(metadataPath).catch(() => null);
    if (metadataExists) {
      metadata = JSON.parse(await fs.readFile(metadataPath, "utf-8"));
    }
  } catch (error) {
    console.error("Error reading rollback metadata:", error);
  }
  
  metadata.points.push(point);
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), "utf-8");
  
  return point;
}

// Perform a rollback operation
async function performRollback(
  projectRoot: string,
  point: RollbackPoint,
  dryRun: boolean = false
): Promise<{ success: boolean; restoredFiles: string[]; message: string }> {
  if (point.status === "unavailable") {
    return {
      success: false,
      restoredFiles: [],
      message: `Rollback point ${point.id} is unavailable.`
    };
  }
  
  const rollbackDir = await ensureRollbackDir(projectRoot);
  const pointDir = path.join(rollbackDir, point.id);
  const restoredFiles: string[] = [];
  const failedFiles: string[] = [];
  
  // If this is a dry run, just return what would be restored
  if (dryRun) {
    const availableFiles: string[] = [];
    
    for (const file of point.files) {
      const backupPath = path.join(pointDir, file.replace(/\//g, "_"));
      const fileExists = await fs.stat(backupPath).catch(() => null);
      if (fileExists) {
        availableFiles.push(file);
      }
    }
    
    return {
      success: true,
      restoredFiles: availableFiles,
      message: `Dry run: Would restore ${availableFiles.length} files from rollback point ${point.id}.`
    };
  }
  
  // Create a new rollback point for the current state before rolling back
  const currentFiles: string[] = [];
  
  for (const file of point.files) {
    const filePath = path.join(projectRoot, file);
    const exists = await fs.stat(filePath).catch(() => null);
    if (exists) {
      currentFiles.push(file);
    }
  }
  
  if (currentFiles.length > 0) {
    await createRollbackPoint(
      projectRoot,
      "changes",
      `Auto-created before rollback to ${point.id}`,
      currentFiles
    );
  }
  
  // Restore files from the rollback point
  for (const file of point.files) {
    try {
      const backupPath = path.join(pointDir, file.replace(/\//g, "_"));
      const targetPath = path.join(projectRoot, file);
      
      // Check if backup file exists
      const backupExists = await fs.stat(backupPath).catch(() => null);
      if (!backupExists) {
        failedFiles.push(file);
        continue;
      }
      
      // Ensure target directory exists
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      
      // Restore the file
      await fs.copyFile(backupPath, targetPath);
      restoredFiles.push(file);
    } catch (error) {
      console.error(`Error restoring file ${file}:`, error);
      failedFiles.push(file);
    }
  }
  
  // Determine success status
  const success = restoredFiles.length > 0 && failedFiles.length === 0;
  
  // Build message
  let message = `Restored ${restoredFiles.length} files from rollback point ${point.id}.`;
  if (failedFiles.length > 0) {
    message += ` Failed to restore ${failedFiles.length} files.`;
  }
  
  return {
    success,
    restoredFiles,
    message
  };
}

// Get modified files since last successful build
async function getModifiedFilesSinceLastBuild(projectRoot: string): Promise<string[]> {
  try {
    // Use git to get modified files
    const output = execSync("git status --porcelain", { 
      cwd: projectRoot,
      encoding: "utf-8" 
    });
    
    return output
      .split("\n")
      .filter(line => line.trim() !== "")
      .map(line => {
        // Extract the file path from git status output
        const match = line.match(/^.{0,2}\s+(.+)$/);
        return match ? match[1] : "";
      })
      .filter(file => file !== "");
  } catch (error) {
    console.error("Error getting modified files:", error);
    return [];
  }
}

export const rollbackTool = new GSXTool<typeof rollbackToolSchema>({
  name: "rollback",
  description: `Tool for safely rolling back changes to restore a previous state.

Commands:
* rollback: Restore to a previous state
  - Can target a single file, recent changes, or last successful build
  - Creates a backup of current state before rollback
  - Includes safety checks to prevent data loss
* list: List available rollback points
  - Shows all points where rollback is possible
  - Includes timestamps and descriptions
* validate: Check if rollback would succeed
  - Validates that rollback data is available
  - Checks for potential conflicts
* info: Get detailed information about a rollback point
  - Shows files that would be affected
  - Includes metadata about the rollback point`,
  schema: rollbackToolSchema,
  run: async (params: RollbackToolParams) => {
    console.log("↩️ Calling the RollbackTool:", params);

    try {
      // Determine project root
      const projectRoot = getProjectRoot(params.path);
      
      switch (params.command) {
        case "list": {
          const points = await getAvailableRollbackPoints(projectRoot, params.target);
          
          return {
            success: true,
            message: `Found ${points.length} rollback points`,
            points: points.map(p => ({
              id: p.id,
              timestamp: p.timestamp,
              description: p.description,
              type: p.type,
              status: p.status,
              fileCount: p.files.length
            }))
          };
        }
        
        case "validate": {
          if (!params.point) {
            throw new Error("point parameter is required for validate command");
          }
          
          // Get all rollback points
          const points = await getAvailableRollbackPoints(projectRoot);
          
          // Find the specified point
          const point = points.find(p => p.id === params.point);
          
          if (!point) {
            return {
              success: false,
              message: `Rollback point ${params.point} not found`,
              isValid: false,
              reason: "Rollback point not found"
            };
          }
          
          // Check if the point is available
          if (point.status === "unavailable") {
            return {
              success: false,
              message: `Rollback point ${params.point} is unavailable`,
              isValid: false,
              reason: "Rollback data is missing"
            };
          }
          
          if (point.status === "partial") {
            // Get available files
            const availableFiles: string[] = [];
            const rollbackDir = await ensureRollbackDir(projectRoot);
            const pointDir = path.join(rollbackDir, point.id);
            
            for (const file of point.files) {
              const backupPath = path.join(pointDir, file.replace(/\//g, "_"));
              const exists = await fs.stat(backupPath).catch(() => null);
              if (exists) {
                availableFiles.push(file);
              }
            }
            
            return {
              success: true,
              message: `Rollback point ${params.point} is partially available`,
              isValid: true,
              warning: "Some files are missing and cannot be restored",
              availableFiles
            };
          }
          
          return {
            success: true,
            message: `Rollback point ${params.point} is valid and available`,
            isValid: true,
            fileCount: point.files.length
          };
        }
        
        case "info": {
          if (!params.point) {
            throw new Error("point parameter is required for info command");
          }
          
          // Get all rollback points
          const points = await getAvailableRollbackPoints(projectRoot);
          
          // Find the specified point
          const point = points.find(p => p.id === params.point);
          
          if (!point) {
            return {
              success: false,
              message: `Rollback point ${params.point} not found`,
            };
          }
          
          return {
            success: true,
            message: `Information for rollback point ${params.point}`,
            point: {
              id: point.id,
              timestamp: point.timestamp,
              description: point.description,
              type: point.type,
              status: point.status,
              files: point.files
            }
          };
        }
        
        case "rollback": {
          // Handle different target types
          switch (params.target) {
            case "file": {
              if (!params.path) {
                throw new Error("path parameter is required for file rollback");
              }
              
              // Get all rollback points
              const points = await getAvailableRollbackPoints(projectRoot, "file");
              
              // Find points that include this file
              const filePoints = points.filter(p => 
                p.files.some(f => f === params.path || f.endsWith(`/${params.path}`))
              );
              
              if (filePoints.length === 0) {
                return {
                  success: false,
                  message: `No rollback points found for file ${params.path}`,
                };
              }
              
              // Use the specified point or the most recent one
              let targetPoint = params.point 
                ? filePoints.find(p => p.id === params.point) 
                : filePoints[0];
              
              if (!targetPoint) {
                return {
                  success: false,
                  message: `Specified rollback point not found for file ${params.path}`,
                };
              }
              
              // Perform the rollback
              const result = await performRollback(
                projectRoot, 
                targetPoint, 
                params.dryRun || false
              );
              
              return {
                success: result.success,
                message: result.message,
                restoredFiles: result.restoredFiles,
                rollbackPoint: targetPoint.id
              };
            }
            
            case "changes": {
              // Get all rollback points
              const points = await getAvailableRollbackPoints(projectRoot, "changes");
              
              if (points.length === 0) {
                return {
                  success: false,
                  message: "No change rollback points found",
                };
              }
              
              // Use the specified point or the most recent one
              let targetPoint = params.point 
                ? points.find(p => p.id === params.point) 
                : points[0];
              
              if (!targetPoint) {
                return {
                  success: false,
                  message: `Specified rollback point not found`,
                };
              }
              
              // Perform the rollback
              const result = await performRollback(
                projectRoot, 
                targetPoint, 
                params.dryRun || false
              );
              
              return {
                success: result.success,
                message: result.message,
                restoredFiles: result.restoredFiles,
                rollbackPoint: targetPoint.id
              };
            }
            
            case "build": {
              // Get all rollback points
              const points = await getAvailableRollbackPoints(projectRoot, "build");
              
              if (points.length === 0) {
                return {
                  success: false,
                  message: "No build rollback points found",
                };
              }
              
              // Use the specified point or the most recent one
              let targetPoint = params.point 
                ? points.find(p => p.id === params.point) 
                : points[0];
              
              if (!targetPoint) {
                return {
                  success: false,
                  message: `Specified rollback point not found`,
                };
              }
              
              // Perform the rollback
              const result = await performRollback(
                projectRoot, 
                targetPoint, 
                params.dryRun || false
              );
              
              return {
                success: result.success,
                message: result.message,
                restoredFiles: result.restoredFiles,
                rollbackPoint: targetPoint.id
              };
            }
            
            default:
              throw new Error(`Unknown target type: ${params.target}`);
          }
        }
        
        default:
          throw new Error(`Unknown command: ${String(params.command)}`);
      }
    } catch (error) {
      console.error("Rollback error:", error);
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
        error: serializeError(error),
      };
    }
  },
});
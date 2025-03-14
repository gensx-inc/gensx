import { execSync } from "child_process";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

import { GSXTool } from "@gensx/anthropic";
import { serializeError } from "serialize-error";
import { z } from "zod";

// Define the schema for version control operations
const versionControlToolSchema = z.object({
  command: z
    .enum(["save", "list", "compare", "restore", "info"])
    .describe(
      "The commands to run. Options: `save` (save current version), `list` (list versions), `compare` (compare versions), `restore` (rollback to version), `info` (get version info).",
    ),
  path: z
    .string()
    .describe(
      "Path to the file to version control, relative to the project root or absolute.",
    ),
  version: z
    .string()
    .optional()
    .describe(
      "Version identifier for restore/compare operations. Use 'latest' for most recent version.",
    ),
  compareWithVersion: z
    .string()
    .optional()
    .describe(
      "Second version identifier for compare operations.",
    ),
  reason: z
    .string()
    .optional()
    .describe(
      "Reason for saving this version (used for documentation).",
    ),
});

type VersionControlParams = z.infer<typeof versionControlToolSchema>;

// Interface for version metadata
interface VersionMetadata {
  id: string;
  timestamp: string;
  reason?: string;
  path: string;
  hash: string;
}

// Create version control directory if it doesn't exist
async function ensureVersionControlDir(projectRoot: string): Promise<string> {
  const vcDir = path.join(projectRoot, ".version-control");
  await fs.mkdir(vcDir, { recursive: true });
  return vcDir;
}

// Generate a version ID
function generateVersionId(): string {
  return crypto.randomBytes(4).toString("hex");
}

// Calculate file hash for content tracking
async function calculateFileHash(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return crypto.createHash("sha256").update(content).digest("hex").substring(0, 16);
  } catch (error) {
    throw new Error(`Failed to calculate file hash: ${error}`);
  }
}

// Get the project root directory
function getProjectRoot(filePath: string): string {
  // Assuming the project root is the directory containing examples/self-modifying-code
  const parts = filePath.split(path.sep);
  const smcIndex = parts.findIndex(part => part === "self-modifying-code");
  
  if (smcIndex === -1) {
    throw new Error("Could not determine project root from path");
  }
  
  return parts.slice(0, smcIndex + 1).join(path.sep);
}

// Get the metadata file path for a specific file
async function getMetadataFilePath(filePath: string): Promise<string> {
  const projectRoot = getProjectRoot(filePath);
  const vcDir = await ensureVersionControlDir(projectRoot);
  
  // Create a directory structure that mirrors the original file path
  const relativePath = path.relative(projectRoot, filePath);
  const metadataDir = path.join(vcDir, path.dirname(relativePath));
  await fs.mkdir(metadataDir, { recursive: true });
  
  return path.join(metadataDir, `${path.basename(filePath)}.metadata.json`);
}

// Get the versions directory for a specific file
async function getVersionsDir(filePath: string): Promise<string> {
  const projectRoot = getProjectRoot(filePath);
  const vcDir = await ensureVersionControlDir(projectRoot);
  
  // Create a directory structure that mirrors the original file path
  const relativePath = path.relative(projectRoot, filePath);
  const versionsDir = path.join(vcDir, path.dirname(relativePath), path.basename(filePath) + ".versions");
  await fs.mkdir(versionsDir, { recursive: true });
  
  return versionsDir;
}

// Get all versions of a file
async function getVersions(filePath: string): Promise<VersionMetadata[]> {
  try {
    const metadataFilePath = await getMetadataFilePath(filePath);
    const metadata = await fs.readFile(metadataFilePath, "utf-8")
      .then(content => JSON.parse(content) as { versions: VersionMetadata[] })
      .catch(() => ({ versions: [] }));
    
    return metadata.versions.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (error) {
    return [];
  }
}

// Save version metadata
async function saveVersionMetadata(filePath: string, version: VersionMetadata): Promise<void> {
  const metadataFilePath = await getMetadataFilePath(filePath);
  const existingVersions = await getVersions(filePath);
  
  const metadata = {
    versions: [version, ...existingVersions]
  };
  
  await fs.writeFile(metadataFilePath, JSON.stringify(metadata, null, 2), "utf-8");
}

export const versionControlTool = new GSXTool<typeof versionControlToolSchema>({
  name: "versionControl",
  description: `Tool for tracking file versions, comparing different versions, and rolling back changes when needed.

Commands:
* save: Save the current state of a file as a new version
  - Creates a snapshot of the file with metadata
  - Requires a reason for documentation purposes
* list: List all saved versions of a file
  - Shows version IDs, timestamps, and reasons
* compare: Compare two versions of a file
  - Shows differences between versions
  - Requires two version IDs (or 'latest' for the most recent)
* restore: Roll back to a previous version
  - Restores the file to a specified version
  - Creates a backup of the current state before rollback
* info: Get detailed information about a specific version
  - Shows metadata, hash, and other details about the version`,
  schema: versionControlToolSchema,
  run: async (params: VersionControlParams) => {
    console.log("🔄 Calling the VersionControlTool:", params);

    try {
      // Ensure path is valid
      const stats = await fs.stat(params.path).catch(() => null);
      if (!stats) {
        throw new Error(`File does not exist: ${params.path}`);
      }
      
      if (stats.isDirectory()) {
        throw new Error(`Path must be a file, not a directory: ${params.path}`);
      }

      switch (params.command) {
        case "save": {
          // Generate a new version ID
          const versionId = generateVersionId();
          const timestamp = new Date().toISOString();
          const fileHash = await calculateFileHash(params.path);
          
          // Create version metadata
          const versionMetadata: VersionMetadata = {
            id: versionId,
            timestamp,
            reason: params.reason || "Manual save",
            path: params.path,
            hash: fileHash,
          };
          
          // Save the file content
          const versionsDir = await getVersionsDir(params.path);
          const versionFilePath = path.join(versionsDir, `${versionId}.backup`);
          await fs.copyFile(params.path, versionFilePath);
          
          // Save metadata
          await saveVersionMetadata(params.path, versionMetadata);
          
          return {
            success: true,
            message: `Version ${versionId} saved successfully for ${params.path}`,
            versionId,
            timestamp,
          };
        }
        
        case "list": {
          const versions = await getVersions(params.path);
          
          if (versions.length === 0) {
            return {
              success: true,
              message: `No versions found for ${params.path}`,
              versions: []
            };
          }
          
          return {
            success: true,
            message: `Found ${versions.length} versions for ${params.path}`,
            versions: versions.map(v => ({
              id: v.id,
              timestamp: v.timestamp,
              reason: v.reason,
            }))
          };
        }
        
        case "compare": {
          if (!params.version) {
            throw new Error("version parameter is required for compare operations");
          }
          
          if (!params.compareWithVersion) {
            throw new Error("compareWithVersion parameter is required for compare operations");
          }
          
          const versions = await getVersions(params.path);
          if (versions.length === 0) {
            throw new Error(`No versions found for ${params.path}`);
          }
          
          // Resolve version IDs
          let version1 = params.version === "latest" ? versions[0].id : params.version;
          let version2 = params.compareWithVersion === "latest" ? versions[0].id : params.compareWithVersion;
          
          // Get the version files
          const versionsDir = await getVersionsDir(params.path);
          const version1Path = path.join(versionsDir, `${version1}.backup`);
          const version2Path = path.join(versionsDir, `${version2}.backup`);
          
          // Check if versions exist
          const version1Exists = await fs.stat(version1Path).catch(() => null);
          const version2Exists = await fs.stat(version2Path).catch(() => null);
          
          if (!version1Exists) {
            throw new Error(`Version ${version1} not found for ${params.path}`);
          }
          
          if (!version2Exists) {
            throw new Error(`Version ${version2} not found for ${params.path}`);
          }
          
          // Read file contents
          const content1 = await fs.readFile(version1Path, "utf-8");
          const content2 = await fs.readFile(version2Path, "utf-8");
          
          // Generate a diff
          const tempDir = path.join(getProjectRoot(params.path), ".version-control", "temp");
          await fs.mkdir(tempDir, { recursive: true });
          
          const tempFile1 = path.join(tempDir, `${version1}.txt`);
          const tempFile2 = path.join(tempDir, `${version2}.txt`);
          
          await fs.writeFile(tempFile1, content1, "utf-8");
          await fs.writeFile(tempFile2, content2, "utf-8");
          
          // Generate diff using diff command
          try {
            const diffOutput = execSync(`diff -u "${tempFile1}" "${tempFile2}"`, { encoding: "utf-8" });
            
            // Clean up temp files
            await fs.rm(tempFile1, { force: true });
            await fs.rm(tempFile2, { force: true });
            
            return {
              success: true,
              message: `Comparison between versions ${version1} and ${version2}`,
              diff: diffOutput,
              version1: version1,
              version2: version2,
            };
          } catch (error: any) {
            // diff returns non-zero exit code when files differ
            const diffOutput = error.stdout || "";
            
            // Clean up temp files
            await fs.rm(tempFile1, { force: true });
            await fs.rm(tempFile2, { force: true });
            
            return {
              success: true,
              message: `Comparison between versions ${version1} and ${version2}`,
              diff: diffOutput,
              version1: version1,
              version2: version2,
            };
          }
        }
        
        case "restore": {
          if (!params.version) {
            throw new Error("version parameter is required for restore operations");
          }
          
          const versions = await getVersions(params.path);
          if (versions.length === 0) {
            throw new Error(`No versions found for ${params.path}`);
          }
          
          // Resolve version ID
          const versionId = params.version === "latest" ? versions[0].id : params.version;
          
          // Get the version file
          const versionsDir = await getVersionsDir(params.path);
          const versionPath = path.join(versionsDir, `${versionId}.backup`);
          
          // Check if version exists
          const versionExists = await fs.stat(versionPath).catch(() => null);
          if (!versionExists) {
            throw new Error(`Version ${versionId} not found for ${params.path}`);
          }
          
          // Save current state before restoring
          const currentVersionId = generateVersionId();
          const timestamp = new Date().toISOString();
          const fileHash = await calculateFileHash(params.path);
          
          // Create version metadata for current state
          const currentVersionMetadata: VersionMetadata = {
            id: currentVersionId,
            timestamp,
            reason: `Auto-save before restoring to version ${versionId}`,
            path: params.path,
            hash: fileHash,
          };
          
          // Save the current file content
          const currentVersionPath = path.join(versionsDir, `${currentVersionId}.backup`);
          await fs.copyFile(params.path, currentVersionPath);
          
          // Save metadata for current state
          await saveVersionMetadata(params.path, currentVersionMetadata);
          
          // Restore the selected version
          await fs.copyFile(versionPath, params.path);
          
          return {
            success: true,
            message: `File ${params.path} restored to version ${versionId}`,
            previousVersion: currentVersionId,
            restoredVersion: versionId,
          };
        }
        
        case "info": {
          if (!params.version) {
            throw new Error("version parameter is required for info operations");
          }
          
          const versions = await getVersions(params.path);
          if (versions.length === 0) {
            throw new Error(`No versions found for ${params.path}`);
          }
          
          // Resolve version ID
          const versionId = params.version === "latest" ? versions[0].id : params.version;
          
          // Find the version metadata
          const versionMetadata = versions.find(v => v.id === versionId);
          if (!versionMetadata) {
            throw new Error(`Version ${versionId} not found for ${params.path}`);
          }
          
          return {
            success: true,
            message: `Information for version ${versionId}`,
            version: versionMetadata,
          };
        }
        
        default:
          throw new Error(`Unknown command: ${String(params.command)}`);
      }
    } catch (error) {
      console.error("Version control error:", error);
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
        error: serializeError(error),
      };
    }
  },
});
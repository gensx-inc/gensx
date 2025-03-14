import path from "path";
import fs from "fs/promises";
import * as gensx from "@gensx/core";

import { updateWorkspaceContext, useWorkspace } from "../../workspace.js";

export interface ChangeRecord {
  timestamp: Date;
  files: {
    path: string;
    changeType: "created" | "modified" | "deleted";
    reason?: string;
    beforeSnapshot?: string;
    afterSnapshot?: string;
  }[];
  description: string;
  initiatedBy: string;
  success: boolean;
  metadata?: Record<string, any>;
}

interface TrackChangesProps {
  files: string[];
  description: string;
  initiatedBy: string;
  reason?: string;
  includeSnapshots?: boolean;
  children: (result: { 
    success: boolean; 
    changeId: string;
    recordedFiles: string[];
  }) => any;
}

/**
 * TrackChanges component that records detailed information about file changes
 * 
 * This component:
 * 1. Records what files were modified, created, or deleted
 * 2. Stores before and after snapshots of modified files (if enabled)
 * 3. Adds metadata including timestamps, change reasons, and result status
 * 4. Integrates with the agent workflow to maintain a history of changes
 */
export const TrackChanges = gensx.Component<TrackChangesProps, { success: boolean; changeId: string; recordedFiles: string[] }>(
  "TrackChanges",
  async ({ files, description, initiatedBy, reason, includeSnapshots = false, children }) => {
    const workspace = useWorkspace();
    const projectRoot = path.join(workspace.sourceDir, "examples", "self-modifying-code");
    const changeHistoryDir = path.join(projectRoot, ".change-history");
    
    // Ensure the change history directory exists
    await fs.mkdir(changeHistoryDir, { recursive: true });
    
    // Generate a unique change ID
    const timestamp = new Date();
    const changeId = `change_${timestamp.toISOString().replace(/[:.]/g, "-")}`;
    
    // Create a record for this change
    const changeRecord: ChangeRecord = {
      timestamp,
      files: [],
      description,
      initiatedBy,
      success: false, // Will be updated later
    };
    
    // Process each file
    const recordedFiles: string[] = [];
    
    for (const filePath of files) {
      const fullPath = path.isAbsolute(filePath) 
        ? filePath 
        : path.join(projectRoot, filePath);
      
      try {
        // Check if file exists
        const fileExists = await fs.stat(fullPath).catch(() => null);
        
        if (!fileExists) {
          // File doesn't exist (likely deleted or not yet created)
          changeRecord.files.push({
            path: filePath,
            changeType: "deleted",
            reason,
          });
          continue;
        }
        
        // File exists, record it as modified
        const fileInfo: {
          path: string;
          changeType: "modified";
          reason?: string;
          beforeSnapshot?: string;
          afterSnapshot?: string;
        } = {
          path: filePath,
          changeType: "modified",
          reason,
        };
        
        // Include file snapshots if requested
        if (includeSnapshots) {
          const content = await fs.readFile(fullPath, "utf-8");
          fileInfo.afterSnapshot = content;
          
          // Try to get the previous version from version control
          try {
            // This assumes we have version control in place
            // In a real implementation, this would use the versionControlTool
            const vcDir = path.join(projectRoot, ".version-control");
            const versionsDir = path.join(vcDir, path.dirname(filePath), path.basename(filePath) + ".versions");
            
            // Get the most recent version
            const versions = await fs.readdir(versionsDir).catch(() => []);
            if (versions.length > 0) {
              // Sort versions by creation time (newest first)
              const sortedVersions = await Promise.all(
                versions.map(async (v) => {
                  const stats = await fs.stat(path.join(versionsDir, v));
                  return { version: v, time: stats.mtime.getTime() };
                })
              );
              
              sortedVersions.sort((a, b) => b.time - a.time);
              
              // Get the most recent version content
              const latestVersion = sortedVersions[0].version;
              const previousContent = await fs.readFile(
                path.join(versionsDir, latestVersion), 
                "utf-8"
              );
              
              fileInfo.beforeSnapshot = previousContent;
            }
          } catch (error) {
            console.error(`Failed to get previous version for ${filePath}:`, error);
            // Continue without the before snapshot
          }
        }
        
        changeRecord.files.push(fileInfo);
        recordedFiles.push(filePath);
      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
      }
    }
    
    // Save the initial change record
    const changeRecordPath = path.join(changeHistoryDir, `${changeId}.json`);
    await fs.writeFile(
      changeRecordPath, 
      JSON.stringify(changeRecord, null, 2), 
      "utf-8"
    );
    
    // Update the agent context with this change
    await updateWorkspaceContext({
      history: [
        {
          timestamp: new Date(),
          action: "Tracking changes",
          result: "in_progress",
          details: `Started tracking changes for: ${description}`,
        },
      ],
    });
    
    // Execute the child component
    const result = await children({
      success: true,
      changeId,
      recordedFiles,
    });
    
    // Update the change record with the result
    changeRecord.success = result.success;
    
    // Add any additional metadata from the result
    changeRecord.metadata = {
      ...changeRecord.metadata,
      result: result.success ? "success" : "failure",
    };
    
    // Update the change record file
    await fs.writeFile(
      changeRecordPath, 
      JSON.stringify(changeRecord, null, 2), 
      "utf-8"
    );
    
    // Update the agent context with the final status
    await updateWorkspaceContext({
      history: [
        {
          timestamp: new Date(),
          action: "Tracked changes",
          result: result.success ? "success" : "failure",
          details: `Completed tracking changes for: ${description}`,
        },
      ],
    });
    
    return result;
  }
);
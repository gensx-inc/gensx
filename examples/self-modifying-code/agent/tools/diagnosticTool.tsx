import { z } from "zod";

import { AgentContext, useWorkspaceContext, Workspace } from "../../workspace.js";

export const diagnosticToolSchema = z.object({
  operation: z
    .enum(["error-stats", "recovery-stats", "history", "build-stats"])
    .describe("The type of diagnostic information to retrieve"),
  timeframe: z
    .enum(["current-session", "last-24h", "all-time"])
    .optional()
    .describe("The timeframe for the diagnostic data"),
  filter: z
    .string()
    .optional()
    .describe("Optional filter to apply to the diagnostic data"),
});

export type DiagnosticToolInput = z.infer<typeof diagnosticToolSchema>;

// Helper function to extract error patterns from history
const extractErrorPatterns = (history: AgentContext["history"]) => {
  const patterns: Record<string, number> = {};
  
  history.forEach(entry => {
    if (entry.result === "failure") {
      // Extract common error patterns from details
      const details = entry.details.toLowerCase();
      
      if (details.includes("typescript")) patterns["TypeScript errors"] = (patterns["TypeScript errors"] || 0) + 1;
      if (details.includes("syntax")) patterns["Syntax errors"] = (patterns["Syntax errors"] || 0) + 1;
      if (details.includes("undefined")) patterns["Undefined references"] = (patterns["Undefined references"] || 0) + 1;
      if (details.includes("missing")) patterns["Missing dependencies"] = (patterns["Missing dependencies"] || 0) + 1;
      if (details.includes("type") && details.includes("mismatch")) patterns["Type mismatches"] = (patterns["Type mismatches"] || 0) + 1;
      if (details.includes("build failed")) patterns["Build failures"] = (patterns["Build failures"] || 0) + 1;
      if (details.includes("test failed")) patterns["Test failures"] = (patterns["Test failures"] || 0) + 1;
    }
  });
  
  return patterns;
};

// Helper function to calculate recovery success rate
const calculateRecoveryStats = (history: AgentContext["history"]) => {
  let recoveryAttempts = 0;
  let recoverySuccesses = 0;
  
  // Group entries by operation for tracking recovery sequences
  const operationGroups: Record<string, typeof history> = {};
  
  history.forEach(entry => {
    if (entry.action.includes("Error recovery")) {
      const operation = entry.action.replace("Error recovery for ", "");
      
      if (!operationGroups[operation]) {
        operationGroups[operation] = [];
      }
      
      operationGroups[operation].push(entry);
      
      if (entry.result === "in_progress") {
        recoveryAttempts++;
      }
      
      if (entry.result === "success") {
        recoverySuccesses++;
      }
    }
  });
  
  // Calculate average attempts per recovery
  const operationCount = Object.keys(operationGroups).length;
  const avgAttemptsPerRecovery = operationCount > 0 
    ? recoveryAttempts / operationCount 
    : 0;
  
  return {
    totalRecoveryAttempts: recoveryAttempts,
    successfulRecoveries: recoverySuccesses,
    successRate: recoveryAttempts > 0 
      ? (recoverySuccesses / recoveryAttempts) * 100 
      : 0,
    avgAttemptsPerRecovery,
    operationCount
  };
};

// Helper function to calculate build statistics
const calculateBuildStats = (history: AgentContext["history"]) => {
  let totalBuilds = 0;
  let successfulBuilds = 0;
  let buildTimeTotal = 0;
  let buildAttemptsByFile: Record<string, number> = {};
  
  // Track build attempts and successes
  history.forEach((entry, index) => {
    if (entry.action.includes("build") || entry.action.includes("Build") || entry.action.includes("validation")) {
      totalBuilds++;
      
      if (entry.result === "success") {
        successfulBuilds++;
      }
      
      // Estimate build time by looking at timestamps between entries
      if (index > 0) {
        const timeDiff = entry.timestamp.getTime() - history[index-1].timestamp.getTime();
        // Only count reasonable build times (less than 5 minutes)
        if (timeDiff > 0 && timeDiff < 300000) {
          buildTimeTotal += timeDiff;
        }
      }
      
      // Extract file information from details if available
      const fileMatch = entry.details.match(/File: ([^\s,]+)/);
      if (fileMatch && fileMatch[1]) {
        const file = fileMatch[1];
        buildAttemptsByFile[file] = (buildAttemptsByFile[file] || 0) + 1;
      }
    }
  });
  
  // Calculate average build time
  const avgBuildTime = totalBuilds > 0 ? buildTimeTotal / totalBuilds : 0;
  
  // Find files with most build attempts (potential problem files)
  const problemFiles = Object.entries(buildAttemptsByFile)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  return {
    totalBuilds,
    successfulBuilds,
    buildSuccessRate: totalBuilds > 0 ? (successfulBuilds / totalBuilds) * 100 : 0,
    avgBuildTimeMs: avgBuildTime,
    problemFiles
  };
};

// Filter history based on timeframe
const filterHistoryByTimeframe = (
  history: AgentContext["history"], 
  timeframe: DiagnosticToolInput["timeframe"]
) => {
  if (!timeframe || timeframe === "all-time") return history;
  
  const now = new Date();
  let cutoff = new Date(now);
  
  if (timeframe === "last-24h") {
    cutoff.setDate(cutoff.getDate() - 1);
  } else if (timeframe === "current-session") {
    // Find the last goal state update as session boundary
    const lastGoalIndex = [...history].reverse().findIndex(
      entry => entry.action.includes("goal state")
    );
    
    if (lastGoalIndex >= 0 && lastGoalIndex < history.length) {
      return history.slice(history.length - lastGoalIndex - 1);
    }
    
    // Default to last 4 hours if no goal state update found
    cutoff.setHours(cutoff.getHours() - 4);
  }
  
  return history.filter(entry => entry.timestamp >= cutoff);
};

export const getDiagnosticTool = (workspace: Workspace) => {
  return {
    name: "diagnostic",
    description: "Displays diagnostic information about errors and the system's performance",
    schema: diagnosticToolSchema,
    async run({ operation, timeframe, filter }: DiagnosticToolInput): Promise<string> {
      try {
        // Get the current workspace context
        const context = useWorkspaceContext();
        
        // Filter history based on timeframe
        const filteredHistory = filterHistoryByTimeframe(context.history, timeframe);
        
        // Apply additional filtering if specified
        const finalHistory = filter 
          ? filteredHistory.filter(entry => 
              entry.action.includes(filter) || 
              entry.details.includes(filter)
            )
          : filteredHistory;
            
        switch (operation) {
          case "error-stats": {
            const errorPatterns = extractErrorPatterns(finalHistory);
            const totalErrors = Object.values(errorPatterns).reduce((sum, count) => sum + count, 0);
            
            return `# Error Statistics ${timeframe ? `(${timeframe})` : ''}

Total errors: ${totalErrors}

## Error Patterns:
${Object.entries(errorPatterns)
  .sort((a, b) => b[1] - a[1])
  .map(([pattern, count]) => `- ${pattern}: ${count} (${((count / totalErrors) * 100).toFixed(1)}%)`)
  .join('\n')}

${totalErrors === 0 ? 'No errors found in the selected timeframe.' : ''}`;
          }
          
          case "recovery-stats": {
            const stats = calculateRecoveryStats(finalHistory);
            
            return `# Error Recovery Statistics ${timeframe ? `(${timeframe})` : ''}

Total recovery attempts: ${stats.totalRecoveryAttempts}
Successful recoveries: ${stats.successfulRecoveries}
Success rate: ${stats.successRate.toFixed(1)}%
Average attempts per recovery: ${stats.avgAttemptsPerRecovery.toFixed(2)}
Operations with recovery attempts: ${stats.operationCount}

${stats.totalRecoveryAttempts === 0 ? 'No recovery attempts found in the selected timeframe.' : ''}`;
          }
          
          case "history": {
            return `# Operation History ${timeframe ? `(${timeframe})` : ''}

Total entries: ${finalHistory.length}

${finalHistory.length > 0 ? finalHistory.map((entry, index) => 
`## ${index + 1}. ${entry.action} (${entry.result})
Time: ${entry.timestamp.toISOString()}
Details: ${entry.details}`
).join('\n\n') : 'No history entries found in the selected timeframe.'}`;
          }
          
          case "build-stats": {
            const stats = calculateBuildStats(finalHistory);
            
            return `# Build Statistics ${timeframe ? `(${timeframe})` : ''}

Total builds: ${stats.totalBuilds}
Successful builds: ${stats.successfulBuilds}
Build success rate: ${stats.buildSuccessRate.toFixed(1)}%
Average build time: ${(stats.avgBuildTimeMs / 1000).toFixed(2)} seconds

${stats.problemFiles.length > 0 ? `## Potential Problem Files:
${stats.problemFiles.map(([file, count]) => `- ${file}: ${count} build attempts`).join('\n')}` : ''}

${stats.totalBuilds === 0 ? 'No builds found in the selected timeframe.' : ''}`;
          }
          
          default:
            return `Unknown diagnostic operation: ${operation}`;
        }
      } catch (error) {
        return `Error retrieving diagnostic information: ${error}`;
      }
    },
  };
};
import * as gensx from "@gensx/core";

import { updateWorkspaceContext, useWorkspace } from "../../workspace.js";

interface ErrorRecoveryProps {
  error: {
    message: string;
    type: "build" | "test" | "runtime" | "lint" | "validation";
    context?: string;
    attempt?: number;
  };
  operation: string;
  maxRetries?: number;
  children: (recoveryResult: ErrorRecoveryResult) => any;
}

export interface ErrorRecoveryResult {
  success: boolean;
  retryCount: number;
  adjustments: string[];
  analysis: {
    rootCause: string;
    suggestedFixes: string[];
    affectedFiles: string[];
  };
  shouldRetry: boolean;
}

// Exponential backoff delay function
const getBackoffDelay = (attempt: number, baseDelay = 500): number => {
  return Math.min(baseDelay * Math.pow(1.5, attempt), 5000); // Max 5 seconds
};

export const ErrorRecovery = gensx.Component<
  ErrorRecoveryProps,
  ErrorRecoveryResult
>("ErrorRecovery", async ({ error, operation, maxRetries = 3, children }) => {
  const workspace = useWorkspace();
  console.log(`Handling error in ${operation}:`, error.message);

  // Initialize recovery result
  const recoveryResult: ErrorRecoveryResult = {
    success: false,
    retryCount: error.attempt || 0,
    adjustments: [],
    analysis: {
      rootCause: "Unknown error",
      suggestedFixes: [],
      affectedFiles: [],
    },
    shouldRetry: false,
  };

  try {
    // Increment retry count
    recoveryResult.retryCount += 1;
    
    // Determine if we should retry based on max retries
    recoveryResult.shouldRetry = recoveryResult.retryCount < maxRetries;

    // Log error recovery attempt to history
    await updateWorkspaceContext({
      history: [
        {
          timestamp: new Date(),
          action: `Error recovery for ${operation}`,
          result: "in_progress",
          details: `Attempt ${recoveryResult.retryCount}/${maxRetries}: ${error.message}`,
        },
      ],
    });

    // Only analyze if we have the analyzeError function
    if (workspace.analyzeError) {
      // Apply backoff delay based on retry count
      const delay = getBackoffDelay(recoveryResult.retryCount);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Analyze the error
      const errorType = error.type === "validation" ? "build" : error.type;
      const analysis = await workspace.analyzeError(error.message, errorType);
      
      // Update recovery result with analysis
      recoveryResult.analysis = analysis;
      
      // Generate adjustments based on suggested fixes
      recoveryResult.adjustments = analysis.suggestedFixes.map((fix, index) => 
        `Adjustment ${index + 1}: ${fix}`
      );
      
      // If we have a root cause, consider the analysis successful
      recoveryResult.success = !!analysis.rootCause && analysis.rootCause !== "Unknown error";
      
      // Log the analysis results
      await updateWorkspaceContext({
        history: [
          {
            timestamp: new Date(),
            action: `Error analysis for ${operation}`,
            result: recoveryResult.success ? "success" : "failure",
            details: `Root cause: ${analysis.rootCause}\nFiles: ${analysis.affectedFiles.join(", ")}\nSuggestions: ${analysis.suggestedFixes.length}`,
          },
        ],
      });
    } else {
      // Basic error handling if analyzeError is not available
      recoveryResult.analysis.rootCause = "Error analysis not available";
      recoveryResult.analysis.suggestedFixes = [
        "Check syntax errors",
        "Verify all imports are correct",
        "Check for type mismatches"
      ];
      recoveryResult.adjustments = [
        "Adjustment 1: Check for syntax errors in the code",
        "Adjustment 2: Verify all imports and dependencies",
        "Adjustment 3: Check for type mismatches"
      ];
      recoveryResult.success = false;
    }

    return children(recoveryResult);
  } catch (recoveryError) {
    // Handle errors in the recovery process itself
    console.error("Error during recovery process:", recoveryError);
    
    await updateWorkspaceContext({
      history: [
        {
          timestamp: new Date(),
          action: `Error recovery for ${operation}`,
          result: "failure",
          details: `Recovery process failed: ${recoveryError}`,
        },
      ],
    });
    
    recoveryResult.success = false;
    recoveryResult.analysis.rootCause = `Recovery process error: ${recoveryError}`;
    return children(recoveryResult);
  }
});
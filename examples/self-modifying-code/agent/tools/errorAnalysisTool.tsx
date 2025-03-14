import { z } from "zod";

import { Workspace } from "../../workspace.js";

export const errorAnalysisToolSchema = z.object({
  errorText: z
    .string()
    .describe("The error message or build output to analyze"),
  errorType: z
    .enum(["build", "test", "runtime", "lint"])
    .describe("The type of error to analyze"),
});

export type ErrorAnalysisToolInput = z.infer<typeof errorAnalysisToolSchema>;

export const getErrorAnalysisTool = (workspace: Workspace) => {
  return {
    name: "errorAnalysis",
    description: "Analyze build and test errors and suggest fixes",
    schema: errorAnalysisToolSchema,
    async run({ errorText, errorType }: ErrorAnalysisToolInput): Promise<string> {
      // Get the error analysis function from the workspace
      const { analyzeError } = workspace;
      
      if (!analyzeError) {
        return "Error analysis tool is not available - workspace doesn't have analyzeError function";
      }

      try {
        // Run the error analysis
        const result = await analyzeError(errorText, errorType);
        
        return `Error analysis complete:

Error Type: ${errorType}

Root Cause:
${result.rootCause}

${result.suggestedFixes.length > 0 ? `Suggested Fixes (${result.suggestedFixes.length}):
${result.suggestedFixes.map((fix, index) => `${index + 1}. ${fix}`).join('\n')}` : 'No suggested fixes available.'}

${result.affectedFiles.length > 0 ? `Affected Files:
${result.affectedFiles.join('\n')}` : 'No specific files identified.'}`;
      } catch (error) {
        return `Error analyzing errors: ${error}`;
      }
    },
  };
};
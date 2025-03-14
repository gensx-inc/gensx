import { z } from "zod";

import { Workspace } from "../../workspace.js";

export const analysisToolSchema = z.object({
  path: z
    .string()
    .describe("Path to the file or directory to analyze"),
  analysisType: z
    .enum(["code-quality", "patterns", "suggestions", "dependencies"])
    .describe("The type of analysis to perform"),
});

export type AnalysisToolInput = z.infer<typeof analysisToolSchema>;

export const getAnalysisTool = (workspace: Workspace) => {
  return {
    name: "analysis",
    description: "Analyze code to identify patterns, issues, and improvement opportunities",
    schema: analysisToolSchema,
    async run({ path, analysisType }: AnalysisToolInput): Promise<string> {
      // Get the code analysis function from the workspace
      const { analyzeCode } = workspace;
      
      if (!analyzeCode) {
        return "Analysis tool is not available - workspace doesn't have analyzeCode function";
      }

      try {
        // Run the analysis
        const result = await analyzeCode(path, analysisType);
        
        return `Code analysis complete for ${path}:

Analysis Type: ${analysisType}

${result.summary}

${result.issues.length > 0 ? `Issues Found (${result.issues.length}):
${result.issues.map((issue, index) => `${index + 1}. ${issue.description} at ${issue.location}`).join('\n')}` : 'No issues found.'}

${result.suggestions.length > 0 ? `Improvement Suggestions (${result.suggestions.length}):
${result.suggestions.map((suggestion, index) => `${index + 1}. ${suggestion}`).join('\n')}` : 'No suggestions available.'}`;
      } catch (error) {
        return `Error analyzing code: ${error}`;
      }
    },
  };
};
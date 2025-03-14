import * as gensx from "@gensx/core";

import { updateWorkspaceContext, useWorkspace } from "../../workspace.js";

interface ValidateChangesProps {
  modifiedFiles: string[];
  children: (validationResult: ValidationResult) => any;
}

export interface ValidationResult {
  success: boolean;
  details: {
    buildSuccess: boolean;
    testSuccess: boolean;
    codeQualitySuccess: boolean;
    buildOutput: string;
    testOutput: string;
    codeQualityReport: string;
    suggestions: string[];
  };
}

export const ValidateChanges = gensx.Component<
  ValidateChangesProps,
  ValidationResult
>("ValidateChanges", async ({ modifiedFiles, children }) => {
  const workspace = useWorkspace();
  console.log("Validating changes to files:", modifiedFiles);

  // Initialize validation result
  const validationResult: ValidationResult = {
    success: false,
    details: {
      buildSuccess: false,
      testSuccess: false,
      codeQualitySuccess: false,
      buildOutput: "",
      testOutput: "",
      codeQualityReport: "",
      suggestions: [],
    },
  };

  try {
    // 1. Validate build
    const buildValidation = await workspace.validateBuild(workspace);
    validationResult.details.buildSuccess = buildValidation.success;
    validationResult.details.buildOutput = buildValidation.output;

    // If build fails, no need to continue validation
    if (!buildValidation.success) {
      await updateWorkspaceContext({
        history: [
          {
            timestamp: new Date(),
            action: "Validate changes",
            result: "failure",
            details: `Build validation failed: ${buildValidation.output}`,
          },
        ],
      });
      validationResult.success = false;
      return children(validationResult);
    }

    // 2. Run tests if available
    if (workspace.runTests) {
      const testResult = await workspace.runTests("run-all");
      validationResult.details.testSuccess = testResult.success;
      validationResult.details.testOutput = testResult.output;
      
      if (!testResult.success) {
        await updateWorkspaceContext({
          history: [
            {
              timestamp: new Date(),
              action: "Validate changes",
              result: "failure",
              details: `Test validation failed: ${testResult.output}`,
            },
          ],
        });
        validationResult.success = false;
        return children(validationResult);
      }
    } else {
      // If tests aren't available, consider test validation successful
      validationResult.details.testSuccess = true;
      validationResult.details.testOutput = "Tests not available";
    }

    // 3. Check code quality if available
    if (workspace.analyzeCode && modifiedFiles.length > 0) {
      const qualityResults = await Promise.all(
        modifiedFiles.map(async (file) => {
          return workspace.analyzeCode!(file, "code-quality");
        })
      );
      
      // Combine all quality results
      const allIssues = qualityResults.flatMap(result => result.issues);
      const allSuggestions = qualityResults.flatMap(result => result.suggestions);
      
      validationResult.details.codeQualitySuccess = allIssues.length === 0;
      validationResult.details.codeQualityReport = qualityResults.map(
        result => result.summary
      ).join("\n\n");
      validationResult.details.suggestions = allSuggestions;
      
      if (allIssues.length > 0) {
        await updateWorkspaceContext({
          history: [
            {
              timestamp: new Date(),
              action: "Validate changes",
              result: "failure",
              details: `Code quality validation failed: ${allIssues.length} issues found`,
            },
          ],
        });
        validationResult.success = false;
        return children(validationResult);
      }
    } else {
      // If code quality analysis isn't available, consider it successful
      validationResult.details.codeQualitySuccess = true;
      validationResult.details.codeQualityReport = "Code quality analysis not available";
    }

    // All validations passed
    validationResult.success = true;
    await updateWorkspaceContext({
      history: [
        {
          timestamp: new Date(),
          action: "Validate changes",
          result: "success",
          details: "All validations passed successfully",
        },
      ],
    });

    return children(validationResult);
  } catch (error) {
    // Handle any unexpected errors
    await updateWorkspaceContext({
      history: [
        {
          timestamp: new Date(),
          action: "Validate changes",
          result: "failure",
          details: `Validation error: ${error}`,
        },
      ],
    });
    
    validationResult.success = false;
    return children(validationResult);
  }
});
import { z } from "zod";

import { Workspace } from "../../workspace.js";

export const testToolSchema = z.object({
  command: z
    .string()
    .describe(
      "The test command to run. Can be 'run-all' for all tests or specify a specific test file or pattern.",
    ),
});

export type TestToolInput = z.infer<typeof testToolSchema>;

export const getTestTool = (workspace: Workspace) => {
  return {
    name: "test",
    description: "Run tests on the codebase to validate changes",
    schema: testToolSchema,
    async run({ command }: TestToolInput): Promise<string> {
      // Get the test runner from the workspace
      const { runTests } = workspace;
      
      if (!runTests) {
        return "Test tool is not available - workspace doesn't have runTests function";
      }

      try {
        // Run the tests
        const result = await runTests(command);
        
        return `Test execution complete:
${result.output}

Test Summary:
- Total Tests: ${result.total}
- Passed: ${result.passed}
- Failed: ${result.failed}
- Success: ${result.success ? "Yes" : "No"}
        
${result.success ? "All tests passed!" : "Some tests failed. Please review the output above."}`;
      } catch (error) {
        return `Error running tests: ${error}`;
      }
    },
  };
};
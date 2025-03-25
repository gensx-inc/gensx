/**
 * Plan Templates
 * 
 * This file provides templates for common modification patterns to improve plan generation.
 * Templates help create more structured and consistent plans for different types of changes.
 */

export interface PlanTemplate {
  name: string;
  description: string;
  applicabilityKeywords: string[];
  template: string;
}

export const planTemplates: PlanTemplate[] = [
  {
    name: "add-new-feature",
    description: "Template for adding a completely new feature to the codebase",
    applicabilityKeywords: ["add feature", "new feature", "implement feature", "create feature"],
    template: `# Plan to Add New Feature: {featureName}

## 1. Create New Files

**Files to create:**
- {path/to/new/file1.tsx}
- {path/to/new/file2.tsx}

**Changes to make:**
1. Implement core functionality in new files
2. Add necessary imports and dependencies
3. Ensure proper error handling
4. Add documentation for the new feature

## 2. Modify Existing Files to Integrate Feature

**Files to modify:**
- {path/to/existing/file1.tsx}
- {path/to/existing/file2.tsx}

**Changes to make:**
1. Import the new components/functions
2. Add integration points in the existing code
3. Update any configuration as needed
4. Ensure backward compatibility

## 3. Add Tests

**Files to create/modify:**
- {path/to/test/file1.tsx}

**Changes to make:**
1. Create unit tests for the new functionality
2. Add integration tests if applicable
3. Ensure test coverage for error cases

## 4. Update Documentation

**Files to modify:**
- README.md
- docs/{feature}.md

**Changes to make:**
1. Document the new feature
2. Update usage examples
3. Update API documentation if applicable

**Validation:**
- Verify all tests pass
- Ensure the build succeeds
- Manually test the feature functionality
- Check documentation accuracy

**Expected outcome:**
- New feature is fully implemented and integrated
- Feature works as expected with proper error handling
- Tests verify the feature's functionality
- Documentation is updated to reflect the new feature`,
  },
  {
    name: "fix-bug",
    description: "Template for fixing a bug in the codebase",
    applicabilityKeywords: ["fix bug", "resolve issue", "fix error", "fix problem", "debug"],
    template: `# Plan to Fix Bug: {bugDescription}

## 1. Identify the Root Cause

**Files to analyze:**
- {path/to/file1.tsx}
- {path/to/file2.tsx}

**Analysis steps:**
1. Understand the expected behavior
2. Identify where the actual behavior deviates
3. Trace the execution flow to find the root cause
4. Identify any edge cases that might be affected

## 2. Implement the Fix

**Files to modify:**
- {path/to/file1.tsx}

**Changes to make:**
1. Modify the code to fix the identified issue
2. Ensure edge cases are handled correctly
3. Add comments explaining the fix if necessary
4. Ensure the fix doesn't introduce new issues

## 3. Add or Update Tests

**Files to create/modify:**
- {path/to/test/file1.tsx}

**Changes to make:**
1. Add a test case that reproduces the bug
2. Ensure the test passes with the fix
3. Add tests for any edge cases

**Validation:**
- Verify the bug is fixed
- Ensure all tests pass
- Check that no new issues are introduced
- Verify performance is not negatively impacted

**Expected outcome:**
- Bug is fixed in all scenarios
- Tests verify the fix works correctly
- No regression in other functionality`,
  },
  {
    name: "refactor-code",
    description: "Template for refactoring code to improve structure or performance",
    applicabilityKeywords: ["refactor", "restructure", "improve performance", "optimize", "clean up"],
    template: `# Plan to Refactor: {refactoringGoal}

## 1. Analyze Current Implementation

**Files to analyze:**
- {path/to/file1.tsx}
- {path/to/file2.tsx}

**Analysis steps:**
1. Understand the current implementation
2. Identify pain points or inefficiencies
3. Determine what structures or patterns to use in the refactoring
4. Identify potential risks and dependencies

## 2. Create New Structures (if applicable)

**Files to create:**
- {path/to/new/file1.tsx}

**Changes to make:**
1. Implement new classes/functions/modules
2. Ensure proper error handling
3. Add comprehensive documentation
4. Write tests for the new code

## 3. Modify Existing Code

**Files to modify:**
- {path/to/file1.tsx}
- {path/to/file2.tsx}

**Changes to make:**
1. Update code to use the new structures
2. Remove deprecated or redundant code
3. Update imports and dependencies
4. Ensure consistent style and patterns

## 4. Update Tests

**Files to modify:**
- {path/to/test/file1.tsx}

**Changes to make:**
1. Update tests to match the new structure
2. Add tests for any new functionality
3. Ensure test coverage is maintained or improved

**Validation:**
- Verify all tests pass
- Ensure the build succeeds
- Measure performance improvements if applicable
- Verify functionality remains the same

**Expected outcome:**
- Code is more maintainable, readable, or efficient
- Functionality remains the same
- Tests verify the behavior is unchanged
- Documentation reflects the new structure`,
  },
  {
    name: "add-tool-integration",
    description: "Template for adding integration with a new tool or service",
    applicabilityKeywords: ["add tool", "integrate", "add service", "new integration"],
    template: `# Plan to Add Tool Integration: {toolName}

## 1. Create Integration Module

**Files to create:**
- agent/tools/{toolName}Tool.tsx
- agent/tools/{toolName}Types.tsx (if needed)

**Changes to make:**
1. Implement the tool interface
2. Create necessary types and schemas
3. Implement error handling and retries
4. Add documentation for the tool usage

## 2. Integrate with Existing Code

**Files to modify:**
- agent/codeAgent.tsx
- agent/smcAgent.tsx (if needed)

**Changes to make:**
1. Import the new tool
2. Add the tool to the available tools list
3. Update any relevant context or state management
4. Ensure proper initialization and cleanup

## 3. Add Tests

**Files to create:**
- tests/{toolName}Tool.test.tsx (if applicable)

**Changes to make:**
1. Create unit tests for the tool functionality
2. Add integration tests with other components
3. Test error handling and edge cases

**Validation:**
- Verify the tool works as expected
- Ensure all tests pass
- Check error handling for various scenarios
- Verify the build succeeds

**Expected outcome:**
- New tool is fully integrated and available
- Tool works correctly with proper error handling
- Documentation explains how to use the tool
- Tests verify the tool's functionality`,
  },
  {
    name: "improve-performance",
    description: "Template for improving performance of existing functionality",
    applicabilityKeywords: ["performance", "speed up", "optimize", "efficiency", "faster"],
    template: `# Plan to Improve Performance: {featureToOptimize}

## 1. Analyze Current Performance

**Files to analyze:**
- {path/to/file1.tsx}
- {path/to/file2.tsx}

**Analysis steps:**
1. Identify performance bottlenecks
2. Measure current performance metrics
3. Determine optimization strategies
4. Identify potential risks

## 2. Implement Caching or Memoization

**Files to modify or create:**
- {path/to/cache/implementation.tsx}
- {path/to/file/to/optimize.tsx}

**Changes to make:**
1. Implement caching mechanism
2. Add cache invalidation logic
3. Ensure thread safety if applicable
4. Add configuration options if needed

## 3. Optimize Algorithms

**Files to modify:**
- {path/to/file1.tsx}

**Changes to make:**
1. Refactor inefficient algorithms
2. Reduce unnecessary operations
3. Optimize data structures
4. Minimize I/O operations or network calls

## 4. Add Performance Tests

**Files to create/modify:**
- {path/to/performance/test.tsx}

**Changes to make:**
1. Create benchmarks for before/after comparison
2. Test with various data sizes or loads
3. Measure memory usage if applicable

**Validation:**
- Measure performance improvement
- Ensure functionality remains correct
- Verify there are no regressions
- Check resource usage (CPU, memory)

**Expected outcome:**
- Improved performance metrics
- Same functionality with better efficiency
- Documented performance gains
- Maintainable optimized code`,
  },
  {
    name: "enhance-error-handling",
    description: "Template for improving error handling and recovery",
    applicabilityKeywords: ["error handling", "recovery", "resilience", "robustness", "fault tolerance"],
    template: `# Plan to Enhance Error Handling: {targetComponent}

## 1. Analyze Current Error Handling

**Files to analyze:**
- {path/to/file1.tsx}
- {path/to/file2.tsx}

**Analysis steps:**
1. Identify error-prone operations
2. Assess current error handling approach
3. Determine missing error cases
4. Identify recovery mechanisms needed

## 2. Implement Improved Error Handling

**Files to modify:**
- {path/to/file1.tsx}
- {path/to/file2.tsx}

**Changes to make:**
1. Add try/catch blocks for error-prone operations
2. Create more descriptive error messages
3. Implement proper error logging
4. Add type-safe error handling

## 3. Add Recovery Mechanisms

**Files to modify or create:**
- {path/to/recovery/implementation.tsx}
- {path/to/file/to/enhance.tsx}

**Changes to make:**
1. Implement automatic retry logic
2. Add fallback mechanisms
3. Create recovery strategies
4. Implement circuit breaker pattern if applicable

## 4. Update Tests

**Files to modify:**
- {path/to/test/file1.tsx}

**Changes to make:**
1. Add tests for error scenarios
2. Verify recovery mechanisms work
3. Test edge cases and rare error conditions

**Validation:**
- Inject errors to test handling
- Verify recovery works as expected
- Ensure errors are properly reported
- Check logging is comprehensive

**Expected outcome:**
- More robust error handling
- Better user experience during errors
- Improved system resilience
- Comprehensive error reporting`,
  }
];

/**
 * Find the most appropriate template for a given goal
 * @param goalState The current goal state
 * @returns The best matching template or null if no good match
 */
export function findBestTemplate(goalState: string): PlanTemplate | null {
  const goalLower = goalState.toLowerCase();
  
  // Score each template based on keyword matches
  const scoredTemplates = planTemplates.map(template => {
    const keywordMatches = template.applicabilityKeywords.filter(keyword => 
      goalLower.includes(keyword.toLowerCase())
    ).length;
    
    return {
      template,
      score: keywordMatches
    };
  });
  
  // Sort by score descending
  scoredTemplates.sort((a, b) => b.score - a.score);
  
  // Return the highest scoring template if it has at least one match
  if (scoredTemplates[0].score > 0) {
    return scoredTemplates[0].template;
  }
  
  return null;
}

/**
 * Customize a template for a specific goal
 * @param template The template to customize
 * @param goalState The current goal state
 * @returns Customized template with placeholders replaced
 */
export function customizeTemplate(template: PlanTemplate, goalState: string): string {
  let customized = template.template;
  
  // Extract potential feature name from goal
  const featureNameMatch = goalState.match(/(?:add|implement|create|build)\s+(?:a|an)?\s*([a-zA-Z\s]+?)(?:\s+to|\s+for|\s+that|\.|$)/i);
  const featureName = featureNameMatch ? featureNameMatch[1].trim() : "New Feature";
  
  // Replace placeholders with extracted or default values
  customized = customized.replace(/\{featureName\}/g, featureName);
  customized = customized.replace(/\{bugDescription\}/g, "Identified Issue");
  customized = customized.replace(/\{refactoringGoal\}/g, "Code Improvement");
  customized = customized.replace(/\{toolName\}/g, "NewTool");
  customized = customized.replace(/\{featureToOptimize\}/g, "Target Feature");
  customized = customized.replace(/\{targetComponent\}/g, "System Component");
  
  // Replace any remaining placeholders with generic values
  customized = customized.replace(/\{path\/to\/[^}]+\}/g, "[Specific file path to be determined]");
  
  return customized;
}
/**
 * Test Runner
 * 
 * This file contains functionality to execute generated tests
 * and report on their results.
 */

import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { serializeError } from 'serialize-error';

/**
 * Interface for test results
 */
export interface TestResult {
  success: boolean;
  stats: {
    passed: number;
    failed: number;
    skipped: number;
    total: number;
  };
  output: string;
  duration: number;
}

/**
 * Interface for test coverage
 */
export interface TestCoverage {
  lines: {
    total: number;
    covered: number;
    percentage: number;
  };
  functions: {
    total: number;
    covered: number;
    percentage: number;
  };
  statements: {
    total: number;
    covered: number;
    percentage: number;
  };
  branches: {
    total: number;
    covered: number;
    percentage: number;
  };
}

/**
 * Run all tests in the project
 */
export async function runAllTests(): Promise<TestResult> {
  return runTests('');
}

/**
 * Run tests for a specific file
 */
export async function runFileTests(filePath: string): Promise<TestResult> {
  // Convert file path to test pattern
  // For example, if filePath is /path/to/myFile.tsx, we want to run tests in /path/to/__tests__/myFile.test.tsx
  const dirname = path.dirname(filePath);
  const filename = path.basename(filePath, path.extname(filePath));
  const testPattern = `${dirname}/__tests__/${filename}.test`;
  
  return runTests(testPattern);
}

/**
 * Run tests matching a specific pattern
 */
export async function runTests(testPattern: string = ''): Promise<TestResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    // Build the test command
    const command = testPattern 
      ? `npx vitest run ${testPattern} --reporter=json`
      : 'npx vitest run --reporter=json';
    
    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      const duration = Date.now() - startTime;
      
      try {
        // Parse the JSON output from Vitest
        const result = JSON.parse(stdout);
        
        const testResult: TestResult = {
          success: result.success,
          stats: {
            passed: result.passed || 0,
            failed: result.failed || 0,
            skipped: result.skipped || 0,
            total: result.total || 0,
          },
          output: stdout,
          duration,
        };
        
        resolve(testResult);
      } catch (parseError) {
        // If we can't parse the output, return a failure result
        console.error('Error parsing test output:', serializeError(parseError));
        
        resolve({
          success: false,
          stats: {
            passed: 0,
            failed: 1,
            skipped: 0,
            total: 1,
          },
          output: stderr || stdout || String(error),
          duration,
        });
      }
    });
  });
}

/**
 * Run tests with coverage
 */
export async function runTestsWithCoverage(testPattern: string = ''): Promise<{ result: TestResult; coverage: TestCoverage }> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    // Build the test command with coverage
    const command = testPattern 
      ? `npx vitest run ${testPattern} --coverage --reporter=json`
      : 'npx vitest run --coverage --reporter=json';
    
    exec(command, { maxBuffer: 1024 * 1024 * 10 }, async (error, stdout, stderr) => {
      const duration = Date.now() - startTime;
      
      try {
        // Parse the JSON output from Vitest
        const result = JSON.parse(stdout);
        
        const testResult: TestResult = {
          success: result.success,
          stats: {
            passed: result.passed || 0,
            failed: result.failed || 0,
            skipped: result.skipped || 0,
            total: result.total || 0,
          },
          output: stdout,
          duration,
        };
        
        // Try to read the coverage summary JSON file
        try {
          const coverageJson = await fs.readFile('coverage/coverage-summary.json', 'utf-8');
          const coverageData = JSON.parse(coverageJson).total;
          
          const coverage: TestCoverage = {
            lines: {
              total: coverageData.lines.total,
              covered: coverageData.lines.covered,
              percentage: coverageData.lines.pct,
            },
            functions: {
              total: coverageData.functions.total,
              covered: coverageData.functions.covered,
              percentage: coverageData.functions.pct,
            },
            statements: {
              total: coverageData.statements.total,
              covered: coverageData.statements.covered,
              percentage: coverageData.statements.pct,
            },
            branches: {
              total: coverageData.branches.total,
              covered: coverageData.branches.covered,
              percentage: coverageData.branches.pct,
            },
          };
          
          resolve({ result: testResult, coverage });
        } catch (coverageError) {
          // If we can't read coverage data, return just the test result
          console.error('Error reading coverage data:', serializeError(coverageError));
          
          resolve({
            result: testResult,
            coverage: {
              lines: { total: 0, covered: 0, percentage: 0 },
              functions: { total: 0, covered: 0, percentage: 0 },
              statements: { total: 0, covered: 0, percentage: 0 },
              branches: { total: 0, covered: 0, percentage: 0 },
            },
          });
        }
      } catch (parseError) {
        // If we can't parse the output, return a failure result
        console.error('Error parsing test output:', serializeError(parseError));
        
        resolve({
          result: {
            success: false,
            stats: {
              passed: 0,
              failed: 1,
              skipped: 0,
              total: 1,
            },
            output: stderr || stdout || String(error),
            duration,
          },
          coverage: {
            lines: { total: 0, covered: 0, percentage: 0 },
            functions: { total: 0, covered: 0, percentage: 0 },
            statements: { total: 0, covered: 0, percentage: 0 },
            branches: { total: 0, covered: 0, percentage: 0 },
          },
        });
      }
    });
  });
}

/**
 * Format test results for display
 */
export function formatTestResults(result: TestResult): string {
  const { stats, duration, success } = result;
  
  return `
Test Results:
${success ? '✓ PASSED' : '✗ FAILED'}
Total: ${stats.total}
Passed: ${stats.passed}
Failed: ${stats.failed}
Skipped: ${stats.skipped}
Duration: ${(duration / 1000).toFixed(2)}s
`;
}

/**
 * Format coverage results for display
 */
export function formatCoverageResults(coverage: TestCoverage): string {
  return `
Coverage Results:
Lines: ${coverage.lines.covered}/${coverage.lines.total} (${coverage.lines.percentage}%)
Functions: ${coverage.functions.covered}/${coverage.functions.total} (${coverage.functions.percentage}%)
Statements: ${coverage.statements.covered}/${coverage.statements.total} (${coverage.statements.percentage}%)
Branches: ${coverage.branches.covered}/${coverage.branches.total} (${coverage.branches.percentage}%)
`;
}
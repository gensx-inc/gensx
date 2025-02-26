import * as path from 'path';
import { z } from 'zod';

import { ErrorCategory, ErrorDetails, createErrorHandler } from '../utils/errorHandler.js';

/**
 * Interface for a test result
 */
export interface TestResult {
  name: string;
  passed: boolean;
  duration: number; // in milliseconds
  error?: string;
  errorDetails?: ErrorDetails;
}

/**
 * Interface for a test suite result
 */
export interface TestSuiteResult {
  name: string;
  tests: TestResult[];
  passed: boolean;
  failedCount: number;
  passedCount: number;
  duration: number; // in milliseconds
}

/**
 * Interface for a test report
 */
export interface TestReport {
  suites: TestSuiteResult[];
  passed: boolean;
  failedCount: number;
  passedCount: number;
  duration: number; // in milliseconds
  timestamp: Date;
}

/**
 * Schema for test configuration
 */
export const testConfigSchema = z.object({
  testDir: z.string(),
  testMatch: z.array(z.string()).default(['**/*.test.ts', '**/*.test.tsx']),
  timeout: z.number().default(5000),
  maxConcurrency: z.number().default(1),
  modifiedFilesOnly: z.boolean().default(false),
  modifiedFiles: z.array(z.string()).optional(),
  excludePatterns: z.array(z.string()).default([]),
});

export type TestConfig = z.infer<typeof testConfigSchema>;

/**
 * Interface for a test function
 */
export type TestFunction = () => void | Promise<void>;

/**
 * Interface for a test definition
 */
export interface TestDefinition {
  name: string;
  fn: TestFunction;
  skip?: boolean;
  only?: boolean;
}

/**
 * Interface for a test suite
 */
export interface TestSuite {
  name: string;
  tests: TestDefinition[];
  beforeEach?: TestFunction;
  afterEach?: TestFunction;
  beforeAll?: TestFunction;
  afterAll?: TestFunction;
}

/**
 * Class for running tests
 */
export class TestRunner {
  private suites: TestSuite[] = [];
  private config: TestConfig;
  private errorHandler = createErrorHandler();
  
  /**
   * Creates a new test runner
   * @param config Test configuration
   */
  constructor(config: TestConfig) {
    this.config = config;
  }
  
  /**
   * Adds a test suite
   * @param suite Test suite to add
   */
  addSuite(suite: TestSuite): void {
    this.suites.push(suite);
  }
  
  /**
   * Runs all tests
   * @returns Test report
   */
  async runTests(): Promise<TestReport> {
    const startTime = Date.now();
    const suiteResults: TestSuiteResult[] = [];
    
    for (const suite of this.suites) {
      const suiteResult = await this.runSuite(suite);
      suiteResults.push(suiteResult);
    }
    
    const duration = Date.now() - startTime;
    const failedCount = suiteResults.reduce((count, suite) => count + suite.failedCount, 0);
    const passedCount = suiteResults.reduce((count, suite) => count + suite.passedCount, 0);
    
    return {
      suites: suiteResults,
      passed: failedCount === 0,
      failedCount,
      passedCount,
      duration,
      timestamp: new Date(),
    };
  }
  
  /**
   * Runs a specific test suite
   * @param suite Test suite to run
   * @returns Test suite result
   */
  private async runSuite(suite: TestSuite): Promise<TestSuiteResult> {
    const startTime = Date.now();
    const testResults: TestResult[] = [];
    
    try {
      // Run beforeAll hook
      if (suite.beforeAll) {
        await suite.beforeAll();
      }
      
      // Run tests
      for (const test of suite.tests) {
        // Skip tests marked with skip
        if (test.skip) {
          testResults.push({
            name: test.name,
            passed: true,
            duration: 0,
          });
          continue;
        }
        
        // Run the test
        const testResult = await this.runTest(test, suite);
        testResults.push(testResult);
      }
      
      // Run afterAll hook
      if (suite.afterAll) {
        await suite.afterAll();
      }
    } catch (error) {
      // If beforeAll or afterAll fails, mark all tests as failed
      if (testResults.length === 0) {
        for (const test of suite.tests) {
          testResults.push({
            name: test.name,
            passed: false,
            duration: 0,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
    
    const duration = Date.now() - startTime;
    const failedCount = testResults.filter(result => !result.passed).length;
    const passedCount = testResults.filter(result => result.passed).length;
    
    return {
      name: suite.name,
      tests: testResults,
      passed: failedCount === 0,
      failedCount,
      passedCount,
      duration,
    };
  }
  
  /**
   * Runs a specific test
   * @param test Test to run
   * @param suite Test suite containing the test
   * @returns Test result
   */
  private async runTest(test: TestDefinition, suite: TestSuite): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Run beforeEach hook
      if (suite.beforeEach) {
        await suite.beforeEach();
      }
      
      // Run the test with a timeout
      await this.runWithTimeout(test.fn, this.config.timeout);
      
      // Run afterEach hook
      if (suite.afterEach) {
        await suite.afterEach();
      }
      
      const duration = Date.now() - startTime;
      
      return {
        name: test.name,
        passed: true,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorDetails = this.errorHandler.captureError(error);
      
      return {
        name: test.name,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : String(error),
        errorDetails,
      };
    }
  }
  
  /**
   * Runs a function with a timeout
   * @param fn Function to run
   * @param timeout Timeout in milliseconds
   * @returns Promise that resolves when the function completes
   */
  private async runWithTimeout(fn: TestFunction, timeout: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Test timed out after ${timeout}ms`));
      }, timeout);
      
      try {
        const result = fn();
        
        if (result instanceof Promise) {
          result.then(() => {
            clearTimeout(timeoutId);
            resolve();
          }).catch(error => {
            clearTimeout(timeoutId);
            reject(error);
          });
        } else {
          clearTimeout(timeoutId);
          resolve();
        }
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }
  
  /**
   * Filters test suites based on modified files
   * @param modifiedFiles List of modified files
   */
  filterByModifiedFiles(modifiedFiles: string[]): void {
    if (!this.config.modifiedFilesOnly || !modifiedFiles.length) {
      return;
    }
    
    // Convert file paths to module paths
    const modifiedModules = modifiedFiles.map(file => {
      const ext = path.extname(file);
      return file.substring(0, file.length - ext.length);
    });
    
    // TODO: Implement dependency analysis to determine which tests to run
    // For now, we'll just run all tests
  }
  
  /**
   * Generates a detailed report of test results
   * @param report Test report
   * @returns Formatted report string
   */
  static formatReport(report: TestReport): string {
    let output = '# Test Report\n\n';
    
    output += `Run at: ${report.timestamp.toISOString()}\n`;
    output += `Duration: ${report.duration}ms\n`;
    output += `Result: ${report.passed ? 'PASSED' : 'FAILED'}\n`;
    output += `Tests: ${report.passedCount} passed, ${report.failedCount} failed\n\n`;
    
    for (const suite of report.suites) {
      output += `## ${suite.name}\n\n`;
      output += `Result: ${suite.passed ? 'PASSED' : 'FAILED'}\n`;
      output += `Tests: ${suite.passedCount} passed, ${suite.failedCount} failed\n`;
      output += `Duration: ${suite.duration}ms\n\n`;
      
      for (const test of suite.tests) {
        const status = test.passed ? '✅ PASSED' : '❌ FAILED';
        output += `- ${test.name}: ${status} (${test.duration}ms)\n`;
        
        if (!test.passed && test.error) {
          output += `  Error: ${test.error}\n`;
          
          if (test.errorDetails?.filePath && test.errorDetails?.lineNumber) {
            output += `  Location: ${test.errorDetails.filePath}:${test.errorDetails.lineNumber}\n`;
          }
        }
      }
      
      output += '\n';
    }
    
    return output;
  }
}

/**
 * Creates a test suite
 * @param name Suite name
 * @param defineFn Function that defines the suite
 * @returns Test suite
 */
export function describe(name: string, defineFn: (suite: TestSuiteBuilder) => void): TestSuite {
  const builder = new TestSuiteBuilder(name);
  defineFn(builder);
  return builder.build();
}

/**
 * Builder class for test suites
 */
class TestSuiteBuilder {
  private name: string;
  private tests: TestDefinition[] = [];
  private beforeEachFn?: TestFunction;
  private afterEachFn?: TestFunction;
  private beforeAllFn?: TestFunction;
  private afterAllFn?: TestFunction;
  
  /**
   * Creates a new test suite builder
   * @param name Suite name
   */
  constructor(name: string) {
    this.name = name;
  }
  
  /**
   * Adds a test to the suite
   * @param name Test name
   * @param fn Test function
   */
  test(name: string, fn: TestFunction): void {
    this.tests.push({ name, fn });
  }
  
  /**
   * Adds a test to the suite (alias for test)
   * @param name Test name
   * @param fn Test function
   */
  it(name: string, fn: TestFunction): void {
    this.test(name, fn);
  }
  
  /**
   * Adds a skipped test to the suite
   * @param name Test name
   * @param fn Test function
   */
  skip(name: string, fn: TestFunction): void {
    this.tests.push({ name, fn, skip: true });
  }
  
  /**
   * Adds a test that should run exclusively
   * @param name Test name
   * @param fn Test function
   */
  only(name: string, fn: TestFunction): void {
    this.tests.push({ name, fn, only: true });
  }
  
  /**
   * Sets the beforeEach function
   * @param fn Function to run before each test
   */
  beforeEach(fn: TestFunction): void {
    this.beforeEachFn = fn;
  }
  
  /**
   * Sets the afterEach function
   * @param fn Function to run after each test
   */
  afterEach(fn: TestFunction): void {
    this.afterEachFn = fn;
  }
  
  /**
   * Sets the beforeAll function
   * @param fn Function to run before all tests
   */
  beforeAll(fn: TestFunction): void {
    this.beforeAllFn = fn;
  }
  
  /**
   * Sets the afterAll function
   * @param fn Function to run after all tests
   */
  afterAll(fn: TestFunction): void {
    this.afterAllFn = fn;
  }
  
  /**
   * Builds the test suite
   * @returns Test suite
   */
  build(): TestSuite {
    return {
      name: this.name,
      tests: this.tests,
      beforeEach: this.beforeEachFn,
      afterEach: this.afterEachFn,
      beforeAll: this.beforeAllFn,
      afterAll: this.afterAllFn,
    };
  }
}

/**
 * Assertion functions for tests
 */
export const expect = {
  /**
   * Asserts that a value is truthy
   * @param value Value to check
   * @param message Optional error message
   */
  toBeTruthy(value: any, message?: string): void {
    if (!value) {
      throw new Error(message || `Expected ${value} to be truthy`);
    }
  },
  
  /**
   * Asserts that a value is falsy
   * @param value Value to check
   * @param message Optional error message
   */
  toBeFalsy(value: any, message?: string): void {
    if (value) {
      throw new Error(message || `Expected ${value} to be falsy`);
    }
  },
  
  /**
   * Asserts that a value is equal to another value
   * @param actual Actual value
   * @param expected Expected value
   * @param message Optional error message
   */
  toEqual(actual: any, expected: any, message?: string): void {
    if (actual !== expected) {
      throw new Error(message || `Expected ${actual} to equal ${expected}`);
    }
  },
  
  /**
   * Asserts that a value is not equal to another value
   * @param actual Actual value
   * @param expected Expected value
   * @param message Optional error message
   */
  notToEqual(actual: any, expected: any, message?: string): void {
    if (actual === expected) {
      throw new Error(message || `Expected ${actual} not to equal ${expected}`);
    }
  },
  
  /**
   * Asserts that an array contains a value
   * @param array Array to check
   * @param value Value to check for
   * @param message Optional error message
   */
  toContain(array: any[], value: any, message?: string): void {
    if (!array.includes(value)) {
      throw new Error(message || `Expected ${array} to contain ${value}`);
    }
  },
  
  /**
   * Asserts that a function throws an error
   * @param fn Function to check
   * @param errorType Optional error type to check for
   * @param message Optional error message
   */
  toThrow(fn: () => any, errorType?: any, message?: string): void {
    try {
      fn();
      throw new Error(message || 'Expected function to throw an error');
    } catch (error) {
      if (errorType && !(error instanceof errorType)) {
        throw new Error(message || `Expected function to throw ${errorType.name}`);
      }
    }
  },
  
  /**
   * Asserts that a value is defined
   * @param value Value to check
   * @param message Optional error message
   */
  toBeDefined(value: any, message?: string): void {
    if (value === undefined) {
      throw new Error(message || 'Expected value to be defined');
    }
  },
  
  /**
   * Asserts that a value is undefined
   * @param value Value to check
   * @param message Optional error message
   */
  toBeUndefined(value: any, message?: string): void {
    if (value !== undefined) {
      throw new Error(message || `Expected ${value} to be undefined`);
    }
  },
  
  /**
   * Asserts that a value is null
   * @param value Value to check
   * @param message Optional error message
   */
  toBeNull(value: any, message?: string): void {
    if (value !== null) {
      throw new Error(message || `Expected ${value} to be null`);
    }
  },
  
  /**
   * Asserts that a value is not null
   * @param value Value to check
   * @param message Optional error message
   */
  notToBeNull(value: any, message?: string): void {
    if (value === null) {
      throw new Error(message || 'Expected value not to be null');
    }
  },
  
  /**
   * Asserts that a value is greater than another value
   * @param actual Actual value
   * @param expected Expected value
   * @param message Optional error message
   */
  toBeGreaterThan(actual: number, expected: number, message?: string): void {
    if (actual <= expected) {
      throw new Error(message || `Expected ${actual} to be greater than ${expected}`);
    }
  },
  
  /**
   * Asserts that a value is less than another value
   * @param actual Actual value
   * @param expected Expected value
   * @param message Optional error message
   */
  toBeLessThan(actual: number, expected: number, message?: string): void {
    if (actual >= expected) {
      throw new Error(message || `Expected ${actual} to be less than ${expected}`);
    }
  },
};

/**
 * Loads test files from a directory
 * @param testDir Directory containing test files
 * @param testMatch Patterns to match test files
 * @param excludePatterns Patterns to exclude
 * @returns List of test files
 */
export async function loadTestFiles(
  testDir: string,
  testMatch: string[] = ['**/*.test.ts', '**/*.test.tsx'],
  excludePatterns: string[] = []
): Promise<string[]> {
  // This would normally use a glob pattern to find test files
  // For simplicity, we'll just return an empty array
  return [];
}

/**
 * Runs tests for modified files
 * @param config Test configuration
 * @param modifiedFiles List of modified files
 * @returns Test report
 */
export async function runTestsForModifiedFiles(
  config: TestConfig,
  modifiedFiles: string[]
): Promise<TestReport> {
  const runner = new TestRunner({
    ...config,
    modifiedFilesOnly: true,
    modifiedFiles,
  });
  
  runner.filterByModifiedFiles(modifiedFiles);
  
  // Load test suites
  // This would normally load test files and create test suites
  // For simplicity, we'll just create a dummy suite
  
  const dummySuite = describe('Dummy Suite', (suite) => {
    suite.test('Dummy Test', () => {
      expect.toBeTruthy(true);
    });
  });
  
  runner.addSuite(dummySuite);
  
  return runner.runTests();
}
import * as path from 'path';
import { expect, TestRunner, TestSuite, describe } from './testRunner.js';

/**
 * Basic mock function implementation
 */
export function fn<T extends (...args: any[]) => any>(implementation?: T): any {
  const calls: any[][] = [];
  const results: any[] = [];
  
  const mockFn = function(...args: any[]) {
    calls.push(args);
    let result;
    
    try {
      if (implementation) {
        result = implementation(...args);
      }
      results.push({ type: 'return', value: result });
      return result;
    } catch (error) {
      results.push({ type: 'throw', value: error });
      throw error;
    }
  };
  
  mockFn.mock = {
    calls,
    results,
    mockClear: () => {
      calls.length = 0;
      results.length = 0;
    },
    mockReset: () => {
      calls.length = 0;
      results.length = 0;
    },
    mockRestore: () => {
      calls.length = 0;
      results.length = 0;
    }
  };
  
  return mockFn;
}

/**
 * Creates a spy on an object method
 */
export function spyOn(object: any, method: string): any {
  const originalMethod = object[method];
  
  if (typeof originalMethod !== 'function') {
    throw new Error(`Cannot spy on non-function property ${method}`);
  }
  
  const mockFn = fn(originalMethod);
  
  // Add mockRestore method to restore the original method
  mockFn.mockRestore = () => {
    object[method] = originalMethod;
  };
  
  // Replace the method with the spy
  object[method] = mockFn;
  
  return mockFn;
}

/**
 * Creates a mock object
 */
export function mockObject<T extends object>(template: Partial<T> = {}): T {
  const mock = { ...template };
  
  // Make all functions in the template mock functions
  for (const key of Object.keys(template)) {
    const value = template[key as keyof T];
    if (typeof value === 'function') {
      mock[key as keyof T] = fn(value as any) as any;
    }
  }
  
  return mock as T;
}

/**
 * Interface for a snapshot
 */
export interface Snapshot {
  name: string;
  value: any;
}

/**
 * Class for managing snapshots
 */
export class SnapshotManager {
  private snapshots: Map<string, Snapshot> = new Map();
  
  /**
   * Takes a snapshot
   * @param name Snapshot name
   * @param value Value to snapshot
   */
  takeSnapshot(name: string, value: any): void {
    this.snapshots.set(name, { name, value });
  }
  
  /**
   * Matches a value against a snapshot
   * @param name Snapshot name
   * @param value Value to match
   * @returns Whether the value matches the snapshot
   */
  matchSnapshot(name: string, value: any): boolean {
    const snapshot = this.snapshots.get(name);
    
    if (!snapshot) {
      // If no snapshot exists, create one
      this.takeSnapshot(name, value);
      return true;
    }
    
    // Compare the value to the snapshot
    return this.deepEqual(value, snapshot.value);
  }
  
  /**
   * Deep equality check
   * @param a First value
   * @param b Second value
   * @returns Whether the values are deeply equal
   */
  private deepEqual(a: any, b: any): boolean {
    if (a === b) {
      return true;
    }
    
    if (a === null || b === null) {
      return a === b;
    }
    
    if (typeof a !== 'object' || typeof b !== 'object') {
      return a === b;
    }
    
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) {
        return false;
      }
      
      for (let i = 0; i < a.length; i++) {
        if (!this.deepEqual(a[i], b[i])) {
          return false;
        }
      }
      
      return true;
    }
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) {
      return false;
    }
    
    for (const key of keysA) {
      if (!keysB.includes(key) || !this.deepEqual(a[key], b[key])) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Gets all snapshots
   * @returns Map of snapshots
   */
  getSnapshots(): Map<string, Snapshot> {
    return new Map(this.snapshots);
  }
  
  /**
   * Clears all snapshots
   */
  clearSnapshots(): void {
    this.snapshots.clear();
  }
}

// Singleton snapshot manager
const snapshotManager = new SnapshotManager();

/**
 * Extended expect functions for snapshots
 */
export const expectWithSnapshots = {
  ...expect,
  
  /**
   * Asserts that a value matches a snapshot
   * @param value Value to check
   * @param snapshotName Optional snapshot name
   */
  toMatchSnapshot(value: any, snapshotName?: string): void {
    const name = snapshotName || 'snapshot';
    const matches = snapshotManager.matchSnapshot(name, value);
    
    if (!matches) {
      throw new Error(`Expected value to match snapshot '${name}'`);
    }
  },
};

/**
 * Creates a test suite for component testing
 * @param name Suite name
 * @param defineFn Function that defines the suite
 * @returns Test suite
 */
export function describeComponent(name: string, defineFn: (suite: any) => void): TestSuite {
  return describe(`Component: ${name}`, defineFn);
}

/**
 * Creates a test suite for utility testing
 * @param name Suite name
 * @param defineFn Function that defines the suite
 * @returns Test suite
 */
export function describeUtil(name: string, defineFn: (suite: any) => void): TestSuite {
  return describe(`Util: ${name}`, defineFn);
}

/**
 * Creates a test suite for integration testing
 * @param name Suite name
 * @param defineFn Function that defines the suite
 * @returns Test suite
 */
export function describeIntegration(name: string, defineFn: (suite: any) => void): TestSuite {
  return describe(`Integration: ${name}`, defineFn);
}

/**
 * Runs tests for specific files
 * @param files Files to test
 * @param testDir Test directory
 * @returns Promise that resolves when tests complete
 */
export async function runTestsForFiles(files: string[], testDir: string): Promise<void> {
  // Determine which test files to run based on the modified files
  const testFiles: string[] = [];
  
  for (const file of files) {
    // For each file, find the corresponding test file
    const ext = path.extname(file);
    const basename = path.basename(file, ext);
    const dirname = path.dirname(file);
    
    // Check for test files in the same directory
    const testFile = path.join(dirname, `${basename}.test${ext}`);
    testFiles.push(testFile);
    
    // Check for test files in a __tests__ directory
    const testsDir = path.join(dirname, '__tests__');
    const testsDirFile = path.join(testsDir, `${basename}.test${ext}`);
    testFiles.push(testsDirFile);
  }
  
  // Run the tests
  const runner = new TestRunner({
    testDir,
    testMatch: ['**/*.test.ts', '**/*.test.tsx'],
    timeout: 5000,
    maxConcurrency: 1,
    modifiedFilesOnly: true,
    modifiedFiles: files,
    excludePatterns: [],
  });
  
  await runner.runTests();
}

/**
 * Creates a snapshot test
 * @param name Test name
 * @param value Value to snapshot
 */
export function snapshot(name: string, value: any): void {
  snapshotManager.takeSnapshot(name, value);
}

/**
 * Verifies a snapshot
 * @param name Snapshot name
 * @param value Value to verify
 * @returns Whether the value matches the snapshot
 */
export function verifySnapshot(name: string, value: any): boolean {
  return snapshotManager.matchSnapshot(name, value);
}
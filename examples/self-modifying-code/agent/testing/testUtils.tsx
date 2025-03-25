/**
 * Test Utilities
 * 
 * This file contains utility functions for testing, including
 * mocking, assertions, and test setup helpers.
 */

import fs from 'fs/promises';
import path from 'path';
import { vi, expect } from 'vitest';

// Define React types without importing React
type ReactElement = any;
interface ReactComponentType<P = any> {
  (props: P): ReactElement;
  displayName?: string;
}

// Mock render function that would be imported from testing library
interface RenderResult {
  rerender: (ui: ReactElement) => void;
  // Add other properties as needed
}

const mockRender = (component: ReactElement): RenderResult => {
  return {
    rerender: () => {},
  };
};

/**
 * Create a mock object with the specified properties
 */
export function createMock<T extends object>(properties: Partial<T> = {}): T {
  return {
    ...properties,
  } as T;
}

/**
 * Create a mock function that returns the specified value
 */
export function createMockFunction<T>(returnValue: T): () => T {
  return vi.fn().mockReturnValue(returnValue);
}

/**
 * Create a mock async function that resolves to the specified value
 */
export function createMockAsyncFunction<T>(returnValue: T): () => Promise<T> {
  return vi.fn().mockResolvedValue(returnValue);
}

/**
 * Create a mock async function that rejects with the specified error
 */
export function createMockRejectedFunction(error: Error): () => Promise<never> {
  return vi.fn().mockRejectedValue(error);
}

/**
 * Mock the fs module for testing file operations
 */
export function mockFileSystem(files: Record<string, string>) {
  // Mock the fs.readFile function
  vi.mock('fs/promises', () => ({
    readFile: vi.fn().mockImplementation((filePath: string) => {
      const normalizedPath = path.normalize(filePath);
      if (normalizedPath in files) {
        return Promise.resolve(files[normalizedPath]);
      }
      return Promise.reject(new Error(`ENOENT: no such file or directory, open '${filePath}'`));
    }),
    writeFile: vi.fn().mockImplementation((filePath: string, content: string) => {
      const normalizedPath = path.normalize(filePath);
      files[normalizedPath] = content;
      return Promise.resolve();
    }),
    access: vi.fn().mockImplementation((filePath: string) => {
      const normalizedPath = path.normalize(filePath);
      if (normalizedPath in files) {
        return Promise.resolve();
      }
      return Promise.reject(new Error(`ENOENT: no such file or directory, access '${filePath}'`));
    }),
    stat: vi.fn().mockImplementation((filePath: string) => {
      const normalizedPath = path.normalize(filePath);
      if (normalizedPath in files) {
        return Promise.resolve({
          isFile: () => true,
          isDirectory: () => false,
        });
      }
      return Promise.reject(new Error(`ENOENT: no such file or directory, stat '${filePath}'`));
    }),
    mkdir: vi.fn().mockResolvedValue(undefined),
  }));
  
  return files;
}

/**
 * Restore all mocks
 */
export function restoreAllMocks() {
  vi.restoreAllMocks();
}

/**
 * Wait for a specified time
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a temporary test directory and clean it up after tests
 */
export async function withTempDirectory(callback: (dirPath: string) => Promise<void>): Promise<void> {
  const tempDir = path.join(process.cwd(), 'temp-test-dir-' + Date.now());
  
  try {
    await fs.mkdir(tempDir, { recursive: true });
    await callback(tempDir);
  } finally {
    try {
      // Recursively delete the temp directory
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up temp directory:', error);
    }
  }
}

/**
 * Helper to test async functions that throw errors
 */
export async function expectToThrowAsync(fn: () => Promise<any>, errorMessage?: string): Promise<void> {
  try {
    await fn();
    throw new Error('Expected function to throw an error but it did not');
  } catch (error) {
    if (errorMessage) {
      expect((error as Error).message).toContain(errorMessage);
    }
  }
}

/**
 * Create a mock for the child_process exec function
 */
export function mockExec(outputMap: Record<string, { stdout: string; stderr: string; error: Error | null }>) {
  vi.mock('child_process', () => ({
    exec: vi.fn().mockImplementation((command: string, options: any, callback: any) => {
      if (command in outputMap) {
        const { stdout, stderr, error } = outputMap[command];
        process.nextTick(() => callback(error, stdout, stderr));
      } else {
        process.nextTick(() => callback(
          new Error(`No mock response for command: ${command}`),
          '',
          `No mock response for command: ${command}`
        ));
      }
    }),
    execSync: vi.fn().mockImplementation((command: string) => {
      if (command in outputMap) {
        const { stdout, error } = outputMap[command];
        if (error) throw error;
        return stdout;
      }
      throw new Error(`No mock response for command: ${command}`);
    }),
  }));
}

/**
 * Helper for testing React components
 */
export function renderWithProps(Component: ReactComponentType, props: Record<string, any> = {}) {
  return mockRender(Component(props));
}
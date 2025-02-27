import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";

/**
 * A robust in-memory cache for file contents to reduce redundant file system operations.
 */
export class FileCache {
  private static instance: FileCache;
  private cache: Map<string, { content: string; timestamp: number }>;
  private metrics: {
    hits: number;
    misses: number;
    invalidations: number;
    totalOperations: number;
  };

  private constructor() {
    this.cache = new Map();
    this.metrics = {
      hits: 0,
      misses: 0,
      invalidations: 0,
      totalOperations: 0,
    };
  }

  /**
   * Get the singleton instance of the FileCache
   */
  public static getInstance(): FileCache {
    if (!FileCache.instance) {
      FileCache.instance = new FileCache();
    }
    return FileCache.instance;
  }

  /**
   * Store file content in the cache
   * @param path The file path
   * @param content The file content
   */
  public set(path: string, content: string): void {
    this.cache.set(path, { content, timestamp: Date.now() });
    this.metrics.totalOperations++;
  }

  /**
   * Get file content from the cache
   * @param path The file path
   * @returns The file content or undefined if not in cache
   */
  public get(path: string): string | undefined {
    this.metrics.totalOperations++;
    
    const cached = this.cache.get(path);
    if (cached) {
      this.metrics.hits++;
      return cached.content;
    }
    
    this.metrics.misses++;
    return undefined;
  }

  /**
   * Check if a file exists in the cache
   * @param path The file path
   * @returns True if the file is in the cache
   */
  public has(path: string): boolean {
    return this.cache.has(path);
  }

  /**
   * Invalidate a file in the cache
   * @param path The file path
   */
  public invalidate(path: string): void {
    if (this.cache.has(path)) {
      this.cache.delete(path);
      this.metrics.invalidations++;
      this.metrics.totalOperations++;
    }
  }

  /**
   * Clear the entire cache
   */
  public clear(): void {
    this.cache.clear();
    this.metrics.totalOperations++;
  }

  /**
   * Get the timestamp for when a file was cached
   * @param path The file path
   * @returns The timestamp or undefined if not in cache
   */
  public getTimestamp(path: string): number | undefined {
    return this.cache.get(path)?.timestamp;
  }

  /**
   * Check if a file is stale based on a maximum age
   * @param path The file path
   * @param maxAgeMs The maximum age in milliseconds
   * @returns True if the file is stale or not in cache
   */
  public isStale(path: string, maxAgeMs: number): boolean {
    const timestamp = this.getTimestamp(path);
    if (!timestamp) return true;
    return Date.now() - timestamp > maxAgeMs;
  }

  /**
   * Get all cached paths
   * @returns Array of file paths in the cache
   */
  public getPaths(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache metrics
   * @returns Object containing cache performance metrics
   */
  public getMetrics(): {
    hits: number;
    misses: number;
    invalidations: number;
    totalOperations: number;
    hitRate: number;
  } {
    const totalAccesses = this.metrics.hits + this.metrics.misses;
    const hitRate = totalAccesses > 0 ? this.metrics.hits / totalAccesses : 0;
    
    return {
      ...this.metrics,
      hitRate,
    };
  }

  /**
   * Reset cache metrics
   */
  public resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      invalidations: 0,
      totalOperations: 0,
    };
  }

  /**
   * Check if a file on disk has been modified since it was cached
   * @param filePath The file path to check
   * @returns True if the file has been modified or doesn't exist in cache
   */
  public async isModified(filePath: string): Promise<boolean> {
    if (!this.has(filePath)) return true;
    
    try {
      const stats = await fs.stat(filePath);
      const cachedTime = this.getTimestamp(filePath) || 0;
      
      // Compare file modification time with cache timestamp
      return stats.mtimeMs > cachedTime;
    } catch (error) {
      // If there's an error (e.g., file doesn't exist), consider it modified
      return true;
    }
  }

  /**
   * Refresh a cached file if it's been modified on disk
   * @param filePath The file path to refresh
   * @returns True if the file was refreshed, false otherwise
   */
  public async refreshIfNeeded(filePath: string): Promise<boolean> {
    const isModified = await this.isModified(filePath);
    
    if (isModified) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        this.set(filePath, content);
        return true;
      } catch (error) {
        // If there's an error reading the file, invalidate it in the cache
        this.invalidate(filePath);
        return false;
      }
    }
    
    return false;
  }

  /**
   * Pre-fetch multiple files into the cache
   * @param filePaths Array of file paths to pre-fetch
   */
  public async prefetchFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        const stats = await fs.stat(filePath);
        
        if (stats.isFile()) {
          const content = await fs.readFile(filePath, 'utf-8');
          this.set(filePath, content);
        }
      } catch (error) {
        // Ignore errors for files that don't exist or can't be read
      }
    }
  }

  /**
   * Pre-fetch all files in a directory that match a pattern
   * @param dirPath Directory path to scan
   * @param pattern File pattern to match (e.g., "*.tsx")
   * @param maxDepth Maximum directory depth to traverse
   */
  public async prefetchDirectory(
    dirPath: string, 
    pattern: string = "*", 
    maxDepth: number = 1
  ): Promise<void> {
    try {
      // Use find command to get matching files
      const cmd = `find "${dirPath}" -maxdepth ${maxDepth} -type f -name "${pattern}" -not -path "*/node_modules/*" -not -path "*/\\.*"`;
      const result = execSync(cmd, { encoding: 'utf-8' });
      
      // Split the result into file paths and prefetch them
      const filePaths = result.trim().split('\n').filter(Boolean);
      await this.prefetchFiles(filePaths);
    } catch (error) {
      // Ignore errors for directories that don't exist or permission issues
    }
  }

  /**
   * Handle errors gracefully during cache operations
   * @param operation Function that might throw an error
   * @param fallback Fallback value if operation fails
   * @returns Result of operation or fallback value
   */
  public async safeOperation<T>(
    operation: () => Promise<T>,
    fallback: T
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      return fallback;
    }
  }
}

/**
 * Schema for prefetch operation
 */
export const prefetchSchema = z.object({
  paths: z.array(z.string()).describe("Array of file paths to prefetch"),
  directory: z
    .string()
    .optional()
    .describe("Directory to prefetch all files from"),
  maxDepth: z
    .number()
    .optional()
    .describe("Maximum directory depth for prefetching"),
  pattern: z
    .string()
    .optional()
    .describe("File pattern to match (e.g. '*.tsx')"),
});

export type PrefetchParams = z.infer<typeof prefetchSchema>;

// Export a singleton instance of the cache
export const fileCache = FileCache.getInstance();
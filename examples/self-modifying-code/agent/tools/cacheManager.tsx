import { z } from "zod";

/**
 * A simple in-memory cache for file contents to reduce redundant file system operations.
 */
export class FileCache {
  private static instance: FileCache;
  private cache: Map<string, { content: string; timestamp: number }>;

  private constructor() {
    this.cache = new Map();
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
  }

  /**
   * Get file content from the cache
   * @param path The file path
   * @returns The file content or undefined if not in cache
   */
  public get(path: string): string | undefined {
    const cached = this.cache.get(path);
    return cached?.content;
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
    this.cache.delete(path);
  }

  /**
   * Clear the entire cache
   */
  public clear(): void {
    this.cache.clear();
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
/**
 * Simple file content cache to reduce file system operations
 */

// Use a simple object as cache
const fileContents: Record<string, string> = {};
const MAX_ENTRIES = 100;
const cacheKeys: string[] = [];

/**
 * Store file content in cache
 */
function set(path: string, content: any): void {
  // Convert to string and handle null/undefined
  const safeContent = content != null ? String(content) : "";
  
  // Check if we need to remove old entries
  if (cacheKeys.length >= MAX_ENTRIES && !fileContents[path]) {
    // Remove oldest entry
    const oldestKey = cacheKeys.shift();
    if (oldestKey) {
      delete fileContents[oldestKey];
    }
  }
  
  // Add to cache
  if (!fileContents[path]) {
    cacheKeys.push(path);
  }
  
  fileContents[path] = safeContent;
}

/**
 * Get file content from cache
 */
function get(path: string): string | null {
  return path in fileContents ? fileContents[path] : null;
}

/**
 * Check if path exists in cache
 */
function has(path: string): boolean {
  return path in fileContents;
}

/**
 * Remove path from cache
 */
function invalidate(path: string): void {
  if (path in fileContents) {
    delete fileContents[path];
    const index = cacheKeys.indexOf(path);
    if (index !== -1) {
      cacheKeys.splice(index, 1);
    }
  }
}

/**
 * Remove all paths matching pattern from cache
 */
function invalidatePattern(pattern: string | RegExp): void {
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  
  for (const path of Object.keys(fileContents)) {
    if (regex.test(path)) {
      invalidate(path);
    }
  }
}

/**
 * Clear entire cache
 */
function clear(): void {
  for (const key of Object.keys(fileContents)) {
    delete fileContents[key];
  }
  cacheKeys.length = 0;
}

/**
 * Get current cache size
 */
function size(): number {
  return cacheKeys.length;
}

/**
 * Get all cached paths
 */
function getCachedPaths(): string[] {
  return [...cacheKeys];
}

// Export all functions as a single object
export const fileCache = {
  set,
  get,
  has,
  invalidate,
  invalidatePattern,
  clear,
  size,
  getCachedPaths
};
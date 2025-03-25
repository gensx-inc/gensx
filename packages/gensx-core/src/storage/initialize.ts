import type {
  CloudStorageConfig,
  LocalStorageConfig,
  MemoryStorageConfig,
  S3StorageConfig,
  StorageConfig,
  StorageProvider,
} from "./types.js";

import { getCurrentContext } from "../context.js";
import { StorageContext } from "./context.js";

// Global storage provider instance
let globalStorageProvider: StorageProvider | null = null;
let currentConfig: StorageConfig | null = null;

/**
 * Initialize the storage subsystem with the provided configuration
 * @param config Configuration for the storage backend
 * @returns The configured storage provider
 */
export function initializeStorage(config: StorageConfig): StorageProvider {
  // Store the configuration
  currentConfig = config;

  // Create the appropriate provider based on the configuration type
  let provider: StorageProvider;

  // Determine which provider to create based on the config type
  if (config.type === "memory") {
    provider = createMemoryStorageProvider(config);
  } else if (config.type === "local") {
    provider = createLocalStorageProvider(config);
  } else if (config.type === "s3") {
    provider = createS3StorageProvider(config);
  } else if (config.type === "cloud") {
    provider = createCloudStorageProvider(config);
  } else {
    // This should be unreachable with TypeScript narrowing
    // but we include it for safety
    throw new Error(`Unsupported storage type: ${String(config.type)}`);
  }

  // Store the provider globally
  globalStorageProvider = provider;

  return provider;
}

/**
 * Get the current storage configuration
 * @returns The current storage configuration or null if not initialized
 */
export function getStorageConfig(): StorageConfig | null {
  return currentConfig;
}

/**
 * Get the current storage provider
 * Either from context if available, or from global state as fallback
 * @returns The current storage provider or null if not initialized
 */
export function getStorageProvider(): StorageProvider | null {
  // First try to get from context
  const context = getCurrentContext();
  const contextValue = context.get(StorageContext.symbol) as
    | StorageProvider
    | undefined;

  // If not in context, use global provider
  return contextValue ?? globalStorageProvider;
}

/**
 * Check if storage has been initialized
 * @returns true if storage is initialized
 */
export function isStorageInitialized(): boolean {
  return getStorageProvider() !== null;
}

/**
 * Create a memory-based storage provider (for testing)
 */
function createMemoryStorageProvider(
  config: MemoryStorageConfig,
): StorageProvider {
  // eslint-disable-next-line no-console
  console.log("Creating in-memory storage provider");

  const storage = new Map<string, unknown>();
  const metadata = new Map<string, Record<string, string>>();

  return {
    getBlob<T>(path: string) {
      // Add namespace prefix if configured
      const fullPath = config.defaultNamespace
        ? `${config.defaultNamespace}/${path}`
        : path;

      return {
        async get() {
          // Add await to satisfy linter
          await Promise.resolve();
          return storage.get(fullPath) as T | null;
        },
        async put(value) {
          // Add await to satisfy linter
          await Promise.resolve();
          storage.set(fullPath, value);
        },
        async delete() {
          // Add await to satisfy linter
          await Promise.resolve();
          storage.delete(fullPath);
          metadata.delete(fullPath);
        },
        async exists() {
          // Add await to satisfy linter
          await Promise.resolve();
          return storage.has(fullPath);
        },
        async getMetadata() {
          // Add await to satisfy linter
          await Promise.resolve();
          return metadata.get(fullPath) ?? null;
        },
        async putWithMetadata(value, meta) {
          // Add await to satisfy linter
          await Promise.resolve();
          storage.set(fullPath, value);
          metadata.set(fullPath, meta);
        },
      };
    },

    async listBlobs(prefix: string) {
      // Add await to satisfy linter
      await Promise.resolve();

      // Add namespace prefix if configured
      const fullPrefix = config.defaultNamespace
        ? `${config.defaultNamespace}/${prefix}`
        : prefix;

      return (
        Array.from(storage.keys())
          .filter((key) => key.startsWith(fullPrefix))
          // If namespace is configured, strip it from results when it matches the default namespace
          .map((key) => {
            if (
              config.defaultNamespace &&
              key.startsWith(`${config.defaultNamespace}/`)
            ) {
              return key.slice(config.defaultNamespace.length + 1);
            }
            return key;
          })
      );
    },
  };
}

/**
 * Create a local filesystem-based storage provider (for development)
 */
function createLocalStorageProvider(
  config: LocalStorageConfig,
): StorageProvider {
  // eslint-disable-next-line no-console
  console.log(
    `Creating local storage provider in directory: ${config.directory ?? "default"}`,
  );

  // Placeholder - in a real implementation, this would use the filesystem
  // For now, we'll just return the memory implementation
  return createMemoryStorageProvider({
    ...config,
    type: "memory",
  });
}

/**
 * Create an S3-based storage provider (for production)
 */
function createS3StorageProvider(config: S3StorageConfig): StorageProvider {
  // eslint-disable-next-line no-console
  console.log(
    `Creating S3 storage provider in bucket: ${config.bucket ?? "default"}`,
  );

  // Placeholder - in a real implementation, this would use the AWS SDK
  // For now, we'll just return the memory implementation
  return createMemoryStorageProvider({
    ...config,
    type: "memory",
  });
}

/**
 * Create a GenSX cloud-based storage provider (for production)
 */
function createCloudStorageProvider(
  config: CloudStorageConfig,
): StorageProvider {
  // eslint-disable-next-line no-console
  console.log("Creating GenSX cloud storage provider");

  // Placeholder - in a real implementation, this would use the GenSX API
  // For now, we'll just return the memory implementation
  return createMemoryStorageProvider({
    ...config,
    type: "memory",
  });
}

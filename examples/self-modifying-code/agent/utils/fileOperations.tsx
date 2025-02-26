import fs from "fs/promises";
import path from "path";
import { glob } from "glob";

/**
 * Utility library for common file operations with enhanced error handling,
 * logging, and safety features.
 */

// Types for file operations
export interface FileOperationResult {
  success: boolean;
  content?: string;
  error?: string;
}

export interface FileWriteOptions {
  createBackup?: boolean;
  validateContent?: (content: string) => boolean | Promise<boolean>;
  logOperation?: boolean;
}

export interface FileSearchOptions {
  pattern?: string;
  contentMatch?: string | RegExp;
  maxDepth?: number;
  ignorePatterns?: string[];
}

/**
 * Logger for file operations
 */
class FileOperationLogger {
  private static _instance: FileOperationLogger;
  private operations: {
    timestamp: Date;
    operation: string;
    path: string;
    success: boolean;
    details?: string;
  }[] = [];

  private constructor() {}

  public static getInstance(): FileOperationLogger {
    if (!FileOperationLogger._instance) {
      FileOperationLogger._instance = new FileOperationLogger();
    }
    return FileOperationLogger._instance;
  }

  public log(
    operation: string,
    path: string,
    success: boolean,
    details?: string
  ) {
    const entry = {
      timestamp: new Date(),
      operation,
      path,
      success,
      details,
    };
    this.operations.push(entry);
    console.log(
      `[FileOperation] ${entry.timestamp.toISOString()} - ${operation} - ${path} - ${
        success ? "SUCCESS" : "FAILURE"
      }${details ? ` - ${details}` : ""}`
    );
  }

  public getOperationHistory() {
    return [...this.operations];
  }

  public clearHistory() {
    this.operations = [];
  }
}

/**
 * Reads file content with enhanced error handling
 * @param filePath Path to the file
 * @param logOperation Whether to log the operation
 * @returns FileOperationResult with success status and content or error
 */
export async function readFile(
  filePath: string,
  logOperation = true
): Promise<FileOperationResult> {
  const logger = FileOperationLogger.getInstance();
  try {
    const content = await fs.readFile(filePath, "utf-8");
    if (logOperation) {
      logger.log("READ", filePath, true);
    }
    return { success: true, content };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (logOperation) {
      logger.log("READ", filePath, false, errorMessage);
    }
    return { success: false, error: errorMessage };
  }
}

/**
 * Writes content to a file with optional backup and validation
 * @param filePath Path to the file
 * @param content Content to write
 * @param options Options for file writing
 * @returns FileOperationResult with success status and error if applicable
 */
export async function writeFile(
  filePath: string,
  content: string,
  options: FileWriteOptions = {}
): Promise<FileOperationResult> {
  const { createBackup = true, validateContent, logOperation = true } = options;
  const logger = FileOperationLogger.getInstance();

  try {
    // Check if file exists for backup
    const fileExists = await fs
      .access(filePath)
      .then(() => true)
      .catch(() => false);

    // Create directory if it doesn't exist
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Create backup if needed and file exists
    if (createBackup && fileExists) {
      const backupPath = `${filePath}.backup.${Date.now()}`;
      await fs.copyFile(filePath, backupPath);
      if (logOperation) {
        logger.log("BACKUP", backupPath, true);
      }
    }

    // Validate content if validator provided
    if (validateContent) {
      const isValid = await Promise.resolve(validateContent(content));
      if (!isValid) {
        const errorMessage = "Content validation failed";
        if (logOperation) {
          logger.log("VALIDATE", filePath, false, errorMessage);
        }
        return { success: false, error: errorMessage };
      }
    }

    // Write the file
    await fs.writeFile(filePath, content, "utf-8");
    
    if (logOperation) {
      logger.log("WRITE", filePath, true);
    }
    
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (logOperation) {
      logger.log("WRITE", filePath, false, errorMessage);
    }
    return { success: false, error: errorMessage };
  }
}

/**
 * Creates a new file with the specified content
 * @param filePath Path to the file
 * @param content Content to write
 * @param options Options for file creation
 * @returns FileOperationResult with success status and error if applicable
 */
export async function createFile(
  filePath: string,
  content: string,
  options: Omit<FileWriteOptions, "createBackup"> = {}
): Promise<FileOperationResult> {
  const { validateContent, logOperation = true } = options;
  const logger = FileOperationLogger.getInstance();

  try {
    // Check if file already exists
    const fileExists = await fs
      .access(filePath)
      .then(() => true)
      .catch(() => false);

    if (fileExists) {
      const errorMessage = `File already exists: ${filePath}`;
      if (logOperation) {
        logger.log("CREATE", filePath, false, errorMessage);
      }
      return { success: false, error: errorMessage };
    }

    // Create directory if it doesn't exist
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Validate content if validator provided
    if (validateContent) {
      const isValid = await Promise.resolve(validateContent(content));
      if (!isValid) {
        const errorMessage = "Content validation failed";
        if (logOperation) {
          logger.log("VALIDATE", filePath, false, errorMessage);
        }
        return { success: false, error: errorMessage };
      }
    }

    // Write the file
    await fs.writeFile(filePath, content, "utf-8");
    
    if (logOperation) {
      logger.log("CREATE", filePath, true);
    }
    
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (logOperation) {
      logger.log("CREATE", filePath, false, errorMessage);
    }
    return { success: false, error: errorMessage };
  }
}

/**
 * Checks if a file or directory exists
 * @param filePath Path to check
 * @returns Boolean indicating existence
 */
export async function pathExists(filePath: string): Promise<boolean> {
  return fs
    .access(filePath)
    .then(() => true)
    .catch(() => false);
}

/**
 * Finds files matching a pattern or containing specific content
 * @param directory Base directory for search
 * @param options Search options
 * @returns Array of matching file paths
 */
export async function findFiles(
  directory: string,
  options: FileSearchOptions = {}
): Promise<string[]> {
  const {
    pattern = "**/*",
    contentMatch,
    maxDepth = 5,
    ignorePatterns = ["**/node_modules/**", "**/.git/**"],
  } = options;

  // Find files matching pattern
  const files = await glob(pattern, {
    cwd: directory,
    absolute: true,
    ignore: ignorePatterns,
    dot: false,
    maxDepth,
  });

  // If no content matching is required, return pattern matches
  if (!contentMatch) {
    return files;
  }

  // Filter files by content
  const matchingFiles: string[] = [];
  for (const file of files) {
    try {
      const stats = await fs.stat(file);
      if (!stats.isFile()) continue;

      const content = await fs.readFile(file, "utf-8");
      const regex = contentMatch instanceof RegExp ? contentMatch : new RegExp(contentMatch, "i");
      
      if (regex.test(content)) {
        matchingFiles.push(file);
      }
    } catch (error) {
      // Skip files that can't be read
      continue;
    }
  }

  return matchingFiles;
}

/**
 * Get the operation logger instance
 * @returns FileOperationLogger instance
 */
export function getFileOperationLogger(): FileOperationLogger {
  return FileOperationLogger.getInstance();
}
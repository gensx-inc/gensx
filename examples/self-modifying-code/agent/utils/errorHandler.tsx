import { z } from 'zod';

/**
 * Enum for error categories
 */
export enum ErrorCategory {
  SYNTAX = 'syntax',
  BUILD = 'build',
  RUNTIME = 'runtime',
  LOGICAL = 'logical',
  DEPENDENCY = 'dependency',
  UNKNOWN = 'unknown',
}

/**
 * Interface for error details
 */
export interface ErrorDetails {
  message: string;
  stack?: string;
  category: ErrorCategory;
  filePath?: string;
  lineNumber?: number;
  columnNumber?: number;
  code?: string;
  suggestion?: string;
}

/**
 * Schema for error details
 */
export const errorDetailsSchema = z.object({
  message: z.string(),
  stack: z.string().optional(),
  category: z.nativeEnum(ErrorCategory),
  filePath: z.string().optional(),
  lineNumber: z.number().optional(),
  columnNumber: z.number().optional(),
  code: z.string().optional(),
  suggestion: z.string().optional(),
});

/**
 * Class for handling errors in the agent
 */
export class ErrorHandler {
  private errors: ErrorDetails[] = [];
  private recoveryStrategies: Map<ErrorCategory, (error: ErrorDetails) => Promise<boolean>> = new Map();
  
  /**
   * Registers a recovery strategy for a specific error category
   * @param category Error category
   * @param strategy Recovery strategy function
   */
  registerRecoveryStrategy(
    category: ErrorCategory,
    strategy: (error: ErrorDetails) => Promise<boolean>
  ): void {
    this.recoveryStrategies.set(category, strategy);
  }
  
  /**
   * Captures an error and adds it to the error log
   * @param error Error to capture
   * @returns Structured error details
   */
  captureError(error: unknown): ErrorDetails {
    const errorDetails = this.parseError(error);
    this.errors.push(errorDetails);
    return errorDetails;
  }
  
  /**
   * Attempts to recover from an error using registered strategies
   * @param error Error details
   * @returns Whether recovery was successful
   */
  async attemptRecovery(error: ErrorDetails): Promise<boolean> {
    const strategy = this.recoveryStrategies.get(error.category);
    
    if (strategy) {
      return await strategy(error);
    }
    
    return false;
  }
  
  /**
   * Parses an error into structured error details
   * @param error Error to parse
   * @returns Structured error details
   */
  private parseError(error: unknown): ErrorDetails {
    if (error instanceof Error) {
      return this.parseJavaScriptError(error);
    } else if (typeof error === 'string') {
      return this.parseErrorString(error);
    } else {
      return {
        message: 'Unknown error',
        category: ErrorCategory.UNKNOWN,
      };
    }
  }
  
  /**
   * Parses a JavaScript Error object
   * @param error Error object
   * @returns Structured error details
   */
  private parseJavaScriptError(error: Error): ErrorDetails {
    const errorDetails: ErrorDetails = {
      message: error.message,
      stack: error.stack,
      category: ErrorCategory.UNKNOWN,
    };
    
    // Try to determine the error category
    if (error instanceof SyntaxError) {
      errorDetails.category = ErrorCategory.SYNTAX;
    } else if (error instanceof TypeError) {
      errorDetails.category = ErrorCategory.RUNTIME;
    } else if (error instanceof ReferenceError) {
      errorDetails.category = ErrorCategory.RUNTIME;
    }
    
    // Try to extract file path and line number from stack trace
    if (error.stack) {
      const stackLines = error.stack.split('\n');
      
      for (const line of stackLines) {
        const match = line.match(/at\s+(?:.*\s+\()?(.+):(\d+):(\d+)/);
        
        if (match) {
          errorDetails.filePath = match[1];
          errorDetails.lineNumber = parseInt(match[2], 10);
          errorDetails.columnNumber = parseInt(match[3], 10);
          break;
        }
      }
    }
    
    return errorDetails;
  }
  
  /**
   * Parses an error string (e.g., from build output)
   * @param errorString Error string
   * @returns Structured error details
   */
  private parseErrorString(errorString: string): ErrorDetails {
    const errorDetails: ErrorDetails = {
      message: errorString,
      category: ErrorCategory.UNKNOWN,
    };
    
    // Try to determine the error category
    if (errorString.includes('SyntaxError') || errorString.includes('Parse error')) {
      errorDetails.category = ErrorCategory.SYNTAX;
    } else if (errorString.includes('TypeError') || errorString.includes('is not a function') || errorString.includes('is not defined')) {
      errorDetails.category = ErrorCategory.RUNTIME;
    } else if (errorString.includes('Cannot find module') || errorString.includes('Module not found')) {
      errorDetails.category = ErrorCategory.DEPENDENCY;
    } else if (errorString.includes('Failed to compile') || errorString.includes('Build failed')) {
      errorDetails.category = ErrorCategory.BUILD;
    }
    
    // Try to extract file path and line number
    const filePathMatch = errorString.match(/([a-zA-Z0-9_\-/.]+\.[a-zA-Z0-9]+):(\d+)(?::(\d+))?/);
    
    if (filePathMatch) {
      errorDetails.filePath = filePathMatch[1];
      errorDetails.lineNumber = parseInt(filePathMatch[2], 10);
      
      if (filePathMatch[3]) {
        errorDetails.columnNumber = parseInt(filePathMatch[3], 10);
      }
    }
    
    return errorDetails;
  }
  
  /**
   * Gets all captured errors
   * @returns Array of error details
   */
  getErrors(): ErrorDetails[] {
    return [...this.errors];
  }
  
  /**
   * Gets errors of a specific category
   * @param category Error category
   * @returns Array of error details
   */
  getErrorsByCategory(category: ErrorCategory): ErrorDetails[] {
    return this.errors.filter(error => error.category === category);
  }
  
  /**
   * Gets errors for a specific file
   * @param filePath File path
   * @returns Array of error details
   */
  getErrorsByFile(filePath: string): ErrorDetails[] {
    return this.errors.filter(error => error.filePath === filePath);
  }
  
  /**
   * Analyzes errors to generate suggestions for fixing them
   * @returns Map of error messages to suggestions
   */
  analyzePatternsAndSuggestFixes(): Map<string, string> {
    const suggestions = new Map<string, string>();
    
    // Group errors by message
    const errorGroups = this.errors.reduce((groups, error) => {
      const key = error.message;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(error);
      return groups;
    }, {} as Record<string, ErrorDetails[]>);
    
    // Generate suggestions for each error group
    for (const [message, errors] of Object.entries(errorGroups)) {
      const category = errors[0].category;
      
      switch (category) {
        case ErrorCategory.SYNTAX:
          suggestions.set(message, this.suggestSyntaxErrorFix(message, errors));
          break;
        case ErrorCategory.BUILD:
          suggestions.set(message, this.suggestBuildErrorFix(message, errors));
          break;
        case ErrorCategory.DEPENDENCY:
          suggestions.set(message, this.suggestDependencyErrorFix(message, errors));
          break;
        case ErrorCategory.RUNTIME:
          suggestions.set(message, this.suggestRuntimeErrorFix(message, errors));
          break;
        default:
          suggestions.set(message, 'No specific suggestion available for this error type.');
      }
    }
    
    return suggestions;
  }
  
  /**
   * Suggests a fix for a syntax error
   * @param message Error message
   * @param errors Array of error details
   * @returns Suggestion for fixing the error
   */
  private suggestSyntaxErrorFix(message: string, errors: ErrorDetails[]): string {
    if (message.includes('Unexpected token')) {
      return 'Check for mismatched brackets, parentheses, or missing semicolons near the indicated position.';
    } else if (message.includes('Unexpected end of input')) {
      return 'Check for unclosed brackets or parentheses in your code.';
    } else if (message.includes('Invalid or unexpected token')) {
      return 'Check for invalid characters or string literals that are not properly closed.';
    } else if (message.includes('Unexpected identifier')) {
      return 'Check for missing operators or punctuation before identifiers.';
    } else {
      return 'Review the syntax around the indicated position for errors.';
    }
  }
  
  /**
   * Suggests a fix for a build error
   * @param message Error message
   * @param errors Array of error details
   * @returns Suggestion for fixing the error
   */
  private suggestBuildErrorFix(message: string, errors: ErrorDetails[]): string {
    if (message.includes('TypeScript error')) {
      return 'Check type definitions and ensure all variables have the correct types.';
    } else if (message.includes('Cannot find module')) {
      return 'Verify that the module is installed and the import path is correct.';
    } else if (message.includes('Property') && message.includes('does not exist on type')) {
      return 'Check that you are accessing a valid property on the object, or update the type definition.';
    } else {
      return 'Review the build error and check for type mismatches or missing dependencies.';
    }
  }
  
  /**
   * Suggests a fix for a dependency error
   * @param message Error message
   * @param errors Array of error details
   * @returns Suggestion for fixing the error
   */
  private suggestDependencyErrorFix(message: string, errors: ErrorDetails[]): string {
    if (message.includes('Cannot find module')) {
      const moduleMatch = message.match(/'([^']+)'/);
      const moduleName = moduleMatch ? moduleMatch[1] : 'the module';
      
      if (moduleName.startsWith('.')) {
        return `Check that the file path '${moduleName}' is correct and the file exists.`;
      } else {
        return `Make sure the package '${moduleName}' is installed. Try running 'npm install ${moduleName}'.`;
      }
    } else if (message.includes('Module not found')) {
      return 'Verify that the module is installed and the import path is correct.';
    } else {
      return 'Check your import statements and make sure all dependencies are installed.';
    }
  }
  
  /**
   * Suggests a fix for a runtime error
   * @param message Error message
   * @param errors Array of error details
   * @returns Suggestion for fixing the error
   */
  private suggestRuntimeErrorFix(message: string, errors: ErrorDetails[]): string {
    if (message.includes('is not a function')) {
      const match = message.match(/([a-zA-Z0-9_]+) is not a function/);
      const funcName = match ? match[1] : 'the function';
      return `Check that '${funcName}' is defined and is actually a function before calling it.`;
    } else if (message.includes('Cannot read property') || message.includes('Cannot read properties')) {
      return 'Verify that the object is not null or undefined before accessing its properties.';
    } else if (message.includes('is not defined')) {
      const match = message.match(/([a-zA-Z0-9_]+) is not defined/);
      const varName = match ? match[1] : 'the variable';
      return `Make sure '${varName}' is defined before using it, or check for typos in the variable name.`;
    } else {
      return 'Review the runtime error and check for undefined variables or functions.';
    }
  }
  
  /**
   * Clears all captured errors
   */
  clearErrors(): void {
    this.errors = [];
  }
}

/**
 * Creates a new error handler
 * @returns Error handler instance
 */
export function createErrorHandler(): ErrorHandler {
  return new ErrorHandler();
}

/**
 * Wraps a function with error handling
 * @param fn Function to wrap
 * @param errorHandler Error handler
 * @returns Wrapped function
 */
export function withErrorHandling<T, Args extends any[]>(
  fn: (...args: Args) => Promise<T>,
  errorHandler: ErrorHandler
): (...args: Args) => Promise<T> {
  return async (...args: Args): Promise<T> => {
    try {
      return await fn(...args);
    } catch (error) {
      const errorDetails = errorHandler.captureError(error);
      const recovered = await errorHandler.attemptRecovery(errorDetails);
      
      if (recovered) {
        // Try again after recovery
        return await fn(...args);
      }
      
      // Re-throw the error if recovery failed
      throw error;
    }
  };
}

/**
 * Parses build errors from build output
 * @param buildOutput Build tool output
 * @returns Array of error details
 */
export function parseBuildErrors(buildOutput: string): ErrorDetails[] {
  const errors: ErrorDetails[] = [];
  const lines = buildOutput.split('\n');
  
  // TypeScript error pattern: file(line,col): error TS1234: Error message
  const tsErrorRegex = /([^(]+)\((\d+),(\d+)\):\s+error\s+TS(\d+):\s+(.*)/;
  
  // Generic error pattern: ERROR in ./path/to/file.ts:line:col
  const genericErrorRegex = /ERROR\s+in\s+([^:]+):(\d+):(\d+)/;
  
  let currentError: ErrorDetails | null = null;
  
  for (const line of lines) {
    const tsMatch = line.match(tsErrorRegex);
    const genericMatch = line.match(genericErrorRegex);
    
    if (tsMatch) {
      currentError = {
        message: tsMatch[5],
        category: ErrorCategory.BUILD,
        filePath: tsMatch[1],
        lineNumber: parseInt(tsMatch[2], 10),
        columnNumber: parseInt(tsMatch[3], 10),
        code: `TS${tsMatch[4]}`,
      };
      errors.push(currentError);
    } else if (genericMatch) {
      currentError = {
        message: line,
        category: ErrorCategory.BUILD,
        filePath: genericMatch[1],
        lineNumber: parseInt(genericMatch[2], 10),
        columnNumber: parseInt(genericMatch[3], 10),
      };
      errors.push(currentError);
    } else if (currentError && line.trim() && !line.startsWith(' ')) {
      // If we have a current error and this line isn't indented, it might be part of the error message
      currentError.message += '\n' + line;
    }
  }
  
  return errors;
}

/**
 * Default recovery strategies for common errors
 * @param errorHandler Error handler to register strategies with
 */
export function registerDefaultRecoveryStrategies(errorHandler: ErrorHandler): void {
  // Strategy for syntax errors
  errorHandler.registerRecoveryStrategy(ErrorCategory.SYNTAX, async (error) => {
    // For now, we can't automatically fix syntax errors
    return false;
  });
  
  // Strategy for dependency errors
  errorHandler.registerRecoveryStrategy(ErrorCategory.DEPENDENCY, async (error) => {
    // If it's a missing module error, we could try to install it
    if (error.message.includes('Cannot find module') && !error.message.includes('./')) {
      const moduleMatch = error.message.match(/'([^']+)'/);
      if (moduleMatch) {
        const moduleName = moduleMatch[1];
        try {
          // This would require access to npm/yarn/pnpm
          // await runCommand('npm', ['install', moduleName]);
          return true;
        } catch (e) {
          return false;
        }
      }
    }
    return false;
  });
  
  // Strategy for build errors
  errorHandler.registerRecoveryStrategy(ErrorCategory.BUILD, async (error) => {
    // For now, we can't automatically fix build errors
    return false;
  });
}

/**
 * Tracks error patterns across iterations
 */
export class ErrorPatternTracker {
  private patterns: Map<string, number> = new Map();
  
  /**
   * Adds an error to the tracker
   * @param error Error details
   */
  trackError(error: ErrorDetails): void {
    const key = this.getErrorKey(error);
    this.patterns.set(key, (this.patterns.get(key) || 0) + 1);
  }
  
  /**
   * Gets the most common error patterns
   * @param limit Maximum number of patterns to return
   * @returns Array of error patterns and their counts
   */
  getMostCommonPatterns(limit: number = 10): Array<{ pattern: string; count: number }> {
    return Array.from(this.patterns.entries())
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
  
  /**
   * Generates a key for an error
   * @param error Error details
   * @returns Error key
   */
  private getErrorKey(error: ErrorDetails): string {
    // Create a key that represents the error pattern
    return `${error.category}:${error.message.split('\n')[0]}`;
  }
  
  /**
   * Clears all tracked patterns
   */
  clear(): void {
    this.patterns.clear();
  }
}
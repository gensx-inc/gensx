import { ErrorCategory, ErrorDetails, createErrorHandler, withErrorHandling } from '../utils/errorHandler.js';

/**
 * Example of using error handling in a function
 * @param input Input value
 * @returns Processed output
 */
export async function processWithErrorHandling(input: any): Promise<any> {
  const errorHandler = createErrorHandler();
  
  // Register custom recovery strategies
  errorHandler.registerRecoveryStrategy(ErrorCategory.DEPENDENCY, async (error) => {
    // Example recovery strategy for dependency errors
    console.log(`Attempting to recover from dependency error: ${error.message}`);
    // Implement recovery logic here
    return false; // Return true if recovery was successful
  });
  
  // Wrap the function with error handling
  const processWithHandling = withErrorHandling(async (input: any) => {
    // Implement your logic here
    if (!input) {
      throw new Error('Input is required');
    }
    
    return {
      processed: true,
      result: input,
    };
  }, errorHandler);
  
  try {
    // Call the wrapped function
    return await processWithHandling(input);
  } catch (error) {
    // Handle any unrecovered errors
    console.error('Failed to process input:', error);
    
    // Analyze error patterns
    const suggestions = errorHandler.analyzePatternsAndSuggestFixes();
    
    for (const [message, suggestion] of suggestions.entries()) {
      console.log(`Suggestion for "${message}": ${suggestion}`);
    }
    
    // Re-throw or return a default value
    throw error;
  }
}
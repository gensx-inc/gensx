import * as path from 'path';
import { z } from 'zod';

/**
 * Interface representing a code component (function, class, etc.)
 */
export interface CodeComponent {
  name: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'component';
  signature?: string;
  description?: string;
  dependencies?: string[];
  location: {
    filePath: string;
    startLine?: number;
    endLine?: number;
  };
}

/**
 * Interface representing a file in the codebase
 */
export interface CodeFile {
  path: string;
  components: CodeComponent[];
  imports: string[];
  exports: string[];
  dependencies: {
    internal: string[]; // Files within the project that this file depends on
    external: string[]; // External packages that this file depends on
  };
}

/**
 * Interface representing the structure of a codebase
 */
export interface CodebaseStructure {
  files: CodeFile[];
  dependencies: Record<string, string[]>; // Map of file paths to their dependencies
  dependents: Record<string, string[]>; // Map of file paths to files that depend on them
}

/**
 * Schema for code modification validation
 */
export const codeModificationSchema = z.object({
  isValid: z.boolean(),
  issues: z.array(z.object({
    type: z.enum(['error', 'warning', 'info']),
    message: z.string(),
    filePath: z.string().optional(),
    line: z.number().optional(),
  })),
  suggestions: z.array(z.string()).optional(),
});

export type CodeModificationValidation = z.infer<typeof codeModificationSchema>;

/**
 * Analyzes a TypeScript/JavaScript file to extract its structure
 * @param filePath Path to the file
 * @param fileContent Content of the file
 * @returns Structured representation of the file
 */
export function analyzeFile(filePath: string, fileContent: string): CodeFile {
  // Extract imports
  const importRegex = /import\s+(?:{([^}]+)}|\*\s+as\s+([a-zA-Z0-9_]+)|([a-zA-Z0-9_]+))\s+from\s+['"]([^'"]+)['"]/g;
  const imports: string[] = [];
  const internalDependencies: string[] = [];
  const externalDependencies: string[] = [];
  
  let match;
  while ((match = importRegex.exec(fileContent)) !== null) {
    const importPath = match[4];
    imports.push(importPath);
    
    // Determine if this is an internal or external dependency
    if (importPath.startsWith('.')) {
      // This is an internal dependency
      const absolutePath = path.resolve(path.dirname(filePath), importPath);
      internalDependencies.push(absolutePath);
    } else {
      // This is an external dependency
      externalDependencies.push(importPath);
    }
  }
  
  // Extract exports
  const exportRegex = /export\s+(?:(default)\s+)?(?:(const|let|var|function|class|interface|type)\s+)?([a-zA-Z0-9_]+)/g;
  const exports: string[] = [];
  
  while ((match = exportRegex.exec(fileContent)) !== null) {
    exports.push(match[3]);
  }
  
  // Extract components (functions, classes, interfaces, etc.)
  const components: CodeComponent[] = extractComponents(filePath, fileContent);
  
  return {
    path: filePath,
    components,
    imports,
    exports,
    dependencies: {
      internal: internalDependencies,
      external: externalDependencies,
    },
  };
}

/**
 * Extracts code components from a file
 * @param filePath Path to the file
 * @param fileContent Content of the file
 * @returns Array of code components
 */
function extractComponents(filePath: string, fileContent: string): CodeComponent[] {
  const components: CodeComponent[] = [];
  
  // Extract functions
  const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/g;
  let match;
  
  while ((match = functionRegex.exec(fileContent)) !== null) {
    const functionName = match[1];
    const params = match[2];
    const startIndex = match.index;
    
    // Find the end of the function
    let braceCount = 0;
    let endIndex = startIndex;
    let foundOpeningBrace = false;
    
    for (let i = startIndex; i < fileContent.length; i++) {
      if (fileContent[i] === '{') {
        foundOpeningBrace = true;
        braceCount++;
      } else if (fileContent[i] === '}') {
        braceCount--;
      }
      
      if (foundOpeningBrace && braceCount === 0) {
        endIndex = i;
        break;
      }
    }
    
    // Calculate line numbers
    const contentBeforeFunction = fileContent.substring(0, startIndex);
    const startLine = (contentBeforeFunction.match(/\n/g) || []).length + 1;
    const contentBeforeEnd = fileContent.substring(0, endIndex);
    const endLine = (contentBeforeEnd.match(/\n/g) || []).length + 1;
    
    components.push({
      name: functionName,
      type: 'function',
      signature: `function ${functionName}(${params})`,
      location: {
        filePath,
        startLine,
        endLine,
      },
    });
  }
  
  // Extract React components (using gsx.Component pattern)
  const gsxComponentRegex = /export\s+const\s+([a-zA-Z0-9_]+)\s*=\s*gsx\.Component/g;
  
  while ((match = gsxComponentRegex.exec(fileContent)) !== null) {
    const componentName = match[1];
    const startIndex = match.index;
    
    // Calculate line numbers (simplified)
    const contentBeforeComponent = fileContent.substring(0, startIndex);
    const startLine = (contentBeforeComponent.match(/\n/g) || []).length + 1;
    
    components.push({
      name: componentName,
      type: 'component',
      location: {
        filePath,
        startLine,
      },
    });
  }
  
  // Extract interfaces and types
  const interfaceRegex = /(?:export\s+)?(?:interface|type)\s+([a-zA-Z0-9_]+)/g;
  
  while ((match = interfaceRegex.exec(fileContent)) !== null) {
    const typeName = match[1];
    const isInterface = match[0].includes('interface');
    const startIndex = match.index;
    
    // Calculate line numbers (simplified)
    const contentBeforeType = fileContent.substring(0, startIndex);
    const startLine = (contentBeforeType.match(/\n/g) || []).length + 1;
    
    components.push({
      name: typeName,
      type: isInterface ? 'interface' : 'type',
      location: {
        filePath,
        startLine,
      },
    });
  }
  
  return components;
}

/**
 * Analyzes the codebase to build a dependency graph
 * @param fileContents Map of file paths to their contents
 * @returns Structure of the codebase
 */
export function analyzeCorebase(fileContents: Record<string, string>): CodebaseStructure {
  const files: CodeFile[] = [];
  const dependencies: Record<string, string[]> = {};
  const dependents: Record<string, string[]> = {};
  
  // First pass: analyze individual files
  for (const [filePath, content] of Object.entries(fileContents)) {
    const fileAnalysis = analyzeFile(filePath, content);
    files.push(fileAnalysis);
    dependencies[filePath] = fileAnalysis.dependencies.internal;
    
    // Initialize dependents entry for this file
    if (!dependents[filePath]) {
      dependents[filePath] = [];
    }
  }
  
  // Second pass: build the dependents map
  for (const [filePath, deps] of Object.entries(dependencies)) {
    for (const dep of deps) {
      if (!dependents[dep]) {
        dependents[dep] = [];
      }
      dependents[dep].push(filePath);
    }
  }
  
  return {
    files,
    dependencies,
    dependents,
  };
}

/**
 * Validates proposed code changes against existing patterns
 * @param filePath Path to the file being modified
 * @param originalContent Original content of the file
 * @param newContent New content of the file
 * @param codebaseStructure Structure of the codebase
 * @returns Validation result
 */
export function validateCodeChanges(
  filePath: string,
  originalContent: string,
  newContent: string,
  codebaseStructure: CodebaseStructure
): CodeModificationValidation {
  const issues: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    filePath?: string;
    line?: number;
  }> = [];
  
  // Check for syntax errors (simple approach)
  const syntaxIssues = checkForSyntaxIssues(newContent);
  issues.push(...syntaxIssues);
  
  // Check for broken imports
  const brokenImportIssues = checkForBrokenImports(filePath, newContent, codebaseStructure);
  issues.push(...brokenImportIssues);
  
  // Check for consistency with existing patterns
  const consistencyIssues = checkForConsistencyIssues(filePath, originalContent, newContent, codebaseStructure);
  issues.push(...consistencyIssues);
  
  return {
    isValid: issues.filter(issue => issue.type === 'error').length === 0,
    issues,
    suggestions: generateSuggestions(issues),
  };
}

/**
 * Checks for basic syntax issues in the code
 * @param content Content to check
 * @returns Array of syntax issues
 */
function checkForSyntaxIssues(content: string): Array<{
  type: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
}> {
  const issues: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    line?: number;
  }> = [];
  
  // Check for mismatched braces
  const openBraces = (content.match(/{/g) || []).length;
  const closeBraces = (content.match(/}/g) || []).length;
  
  if (openBraces !== closeBraces) {
    issues.push({
      type: 'error',
      message: `Mismatched braces: ${openBraces} opening braces and ${closeBraces} closing braces`,
    });
  }
  
  // Check for mismatched parentheses
  const openParens = (content.match(/\(/g) || []).length;
  const closeParens = (content.match(/\)/g) || []).length;
  
  if (openParens !== closeParens) {
    issues.push({
      type: 'error',
      message: `Mismatched parentheses: ${openParens} opening parentheses and ${closeParens} closing parentheses`,
    });
  }
  
  // Check for unclosed strings
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let inSingleQuote = false;
    let inDoubleQuote = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const prevChar = j > 0 ? line[j - 1] : '';
      
      if (char === "'" && prevChar !== '\\') {
        inSingleQuote = !inSingleQuote;
      } else if (char === '"' && prevChar !== '\\') {
        inDoubleQuote = !inDoubleQuote;
      }
    }
    
    if (inSingleQuote || inDoubleQuote) {
      issues.push({
        type: 'error',
        message: `Unclosed string on line ${i + 1}`,
        line: i + 1,
      });
    }
  }
  
  return issues;
}

/**
 * Checks for broken imports in the code
 * @param filePath Path to the file being modified
 * @param content Content to check
 * @param codebaseStructure Structure of the codebase
 * @returns Array of import issues
 */
function checkForBrokenImports(
  filePath: string,
  content: string,
  codebaseStructure: CodebaseStructure
): Array<{
  type: 'error' | 'warning' | 'info';
  message: string;
  filePath?: string;
  line?: number;
}> {
  const issues: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    filePath?: string;
    line?: number;
  }> = [];
  
  // Extract imports
  const importRegex = /import\s+(?:{([^}]+)}|\*\s+as\s+([a-zA-Z0-9_]+)|([a-zA-Z0-9_]+))\s+from\s+['"]([^'"]+)['"]/g;
  const lines = content.split('\n');
  
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[4];
    
    // Skip external imports for now
    if (!importPath.startsWith('.')) {
      continue;
    }
    
    // Calculate line number
    const contentBeforeImport = content.substring(0, match.index);
    const lineNumber = (contentBeforeImport.match(/\n/g) || []).length + 1;
    
    // Resolve the import path
    const resolvedPath = path.resolve(path.dirname(filePath), importPath);
    const normalizedPath = resolvedPath.replace(/\\/g, '/');
    
    // Check if the file exists in the codebase structure
    const fileExists = codebaseStructure.files.some(file => 
      file.path === normalizedPath || 
      file.path === `${normalizedPath}.ts` || 
      file.path === `${normalizedPath}.tsx` || 
      file.path === `${normalizedPath}.js` || 
      file.path === `${normalizedPath}.jsx`
    );
    
    if (!fileExists) {
      issues.push({
        type: 'error',
        message: `Import path "${importPath}" does not resolve to an existing file`,
        filePath,
        line: lineNumber,
      });
    }
  }
  
  return issues;
}

/**
 * Checks for consistency issues in the code
 * @param filePath Path to the file being modified
 * @param originalContent Original content of the file
 * @param newContent New content of the file
 * @param codebaseStructure Structure of the codebase
 * @returns Array of consistency issues
 */
function checkForConsistencyIssues(
  filePath: string,
  originalContent: string,
  newContent: string,
  codebaseStructure: CodebaseStructure
): Array<{
  type: 'error' | 'warning' | 'info';
  message: string;
  filePath?: string;
  line?: number;
}> {
  const issues: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    filePath?: string;
    line?: number;
  }> = [];
  
  // Check for consistent indentation
  const originalIndentation = detectIndentation(originalContent);
  const newIndentation = detectIndentation(newContent);
  
  if (originalIndentation !== newIndentation) {
    issues.push({
      type: 'warning',
      message: `Inconsistent indentation: original uses ${originalIndentation} spaces, new uses ${newIndentation} spaces`,
      filePath,
    });
  }
  
  // Check for consistent export patterns
  const originalExportPattern = detectExportPattern(originalContent);
  const newExportPattern = detectExportPattern(newContent);
  
  if (originalExportPattern && newExportPattern && originalExportPattern !== newExportPattern) {
    issues.push({
      type: 'warning',
      message: `Inconsistent export pattern: original uses "${originalExportPattern}" pattern, new uses "${newExportPattern}" pattern`,
      filePath,
    });
  }
  
  return issues;
}

/**
 * Detects the indentation used in a file
 * @param content Content to analyze
 * @returns Number of spaces used for indentation
 */
function detectIndentation(content: string): number {
  const lines = content.split('\n');
  const indentations: number[] = [];
  
  for (const line of lines) {
    const match = line.match(/^(\s+)/);
    if (match) {
      indentations.push(match[1].length);
    }
  }
  
  // Find the most common indentation
  const indentationCounts: Record<number, number> = {};
  for (const indentation of indentations) {
    indentationCounts[indentation] = (indentationCounts[indentation] || 0) + 1;
  }
  
  let mostCommonIndentation = 2; // Default to 2 spaces
  let maxCount = 0;
  
  for (const [indentation, count] of Object.entries(indentationCounts)) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonIndentation = parseInt(indentation, 10);
    }
  }
  
  return mostCommonIndentation;
}

/**
 * Detects the export pattern used in a file
 * @param content Content to analyze
 * @returns Export pattern used
 */
function detectExportPattern(content: string): string | null {
  // Check for named exports
  const namedExports = content.match(/export\s+(?:const|let|var|function|class|interface|type)\s+[a-zA-Z0-9_]+/g);
  
  // Check for default exports
  const defaultExports = content.match(/export\s+default\s+/g);
  
  // Check for namespace exports
  const namespaceExports = content.match(/export\s+\*\s+from/g);
  
  if ((namedExports?.length || 0) > (defaultExports?.length || 0) && (namedExports?.length || 0) > (namespaceExports?.length || 0)) {
    return 'named';
  } else if ((defaultExports?.length || 0) > (namedExports?.length || 0) && (defaultExports?.length || 0) > (namespaceExports?.length || 0)) {
    return 'default';
  } else if ((namespaceExports?.length || 0) > (namedExports?.length || 0) && (namespaceExports?.length || 0) > (defaultExports?.length || 0)) {
    return 'namespace';
  }
  
  return null;
}

/**
 * Generates suggestions based on issues
 * @param issues Array of issues
 * @returns Array of suggestions
 */
function generateSuggestions(issues: Array<{
  type: 'error' | 'warning' | 'info';
  message: string;
  filePath?: string;
  line?: number;
}>): string[] {
  const suggestions: string[] = [];
  
  for (const issue of issues) {
    if (issue.type === 'error') {
      if (issue.message.includes('Mismatched braces')) {
        suggestions.push('Check your code for missing or extra curly braces {}');
      } else if (issue.message.includes('Mismatched parentheses')) {
        suggestions.push('Check your code for missing or extra parentheses ()');
      } else if (issue.message.includes('Unclosed string')) {
        suggestions.push(`Check line ${issue.line} for unclosed string literals`);
      } else if (issue.message.includes('Import path')) {
        suggestions.push(`Verify that the import path "${issue.message.match(/\"([^\"]+)\"/)?.[1]}" is correct`);
      }
    } else if (issue.type === 'warning') {
      if (issue.message.includes('Inconsistent indentation')) {
        suggestions.push('Maintain consistent indentation throughout the file');
      } else if (issue.message.includes('Inconsistent export pattern')) {
        suggestions.push('Try to maintain a consistent export pattern');
      }
    }
  }
  
  return [...new Set(suggestions)]; // Remove duplicates
}

/**
 * Generates a summary report of the codebase structure
 * @param codebaseStructure Structure of the codebase
 * @returns Summary report
 */
export function generateCodebaseSummary(codebaseStructure: CodebaseStructure): string {
  const { files, dependencies, dependents } = codebaseStructure;
  
  let summary = '# Codebase Structure Summary\n\n';
  
  // File count
  summary += `## Overview\n\n`;
  summary += `- Total files: ${files.length}\n`;
  
  // Most dependent-upon files
  const mostDependedOn = Object.entries(dependents)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5);
  
  summary += `\n## Most Important Files\n\n`;
  summary += `These files are depended upon by the most other files:\n\n`;
  
  for (const [filePath, deps] of mostDependedOn) {
    summary += `- ${filePath}: ${deps.length} dependents\n`;
  }
  
  // Files with most dependencies
  const mostDependencies = Object.entries(dependencies)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5);
  
  summary += `\n## Most Complex Files\n\n`;
  summary += `These files depend on the most other files:\n\n`;
  
  for (const [filePath, deps] of mostDependencies) {
    summary += `- ${filePath}: ${deps.length} dependencies\n`;
  }
  
  // Component summary
  const components = files.flatMap(file => file.components);
  
  summary += `\n## Component Types\n\n`;
  summary += `- Total components: ${components.length}\n`;
  
  const componentTypes = components.reduce((acc, component) => {
    acc[component.type] = (acc[component.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  for (const [type, count] of Object.entries(componentTypes)) {
    summary += `- ${type}: ${count}\n`;
  }
  
  return summary;
}

/**
 * Extracts the interface/type definitions from a file
 * @param filePath Path to the file
 * @param fileContent Content of the file
 * @returns Array of interface/type definitions
 */
export function extractInterfaces(filePath: string, fileContent: string): Array<{
  name: string;
  definition: string;
  type: 'interface' | 'type';
}> {
  const interfaces: Array<{
    name: string;
    definition: string;
    type: 'interface' | 'type';
  }> = [];
  
  // Match interface definitions
  const interfaceRegex = /(?:export\s+)?interface\s+([a-zA-Z0-9_]+)\s*(?:extends\s+[a-zA-Z0-9_,\s]+\s*)?{([^}]*)}/g;
  let match;
  
  while ((match = interfaceRegex.exec(fileContent)) !== null) {
    const name = match[1];
    const body = match[2];
    
    interfaces.push({
      name,
      definition: `interface ${name} {${body}}`,
      type: 'interface',
    });
  }
  
  // Match type definitions
  const typeRegex = /(?:export\s+)?type\s+([a-zA-Z0-9_]+)\s*=\s*([^;]*);/g;
  
  while ((match = typeRegex.exec(fileContent)) !== null) {
    const name = match[1];
    const definition = match[2];
    
    interfaces.push({
      name,
      definition: `type ${name} = ${definition}`,
      type: 'type',
    });
  }
  
  return interfaces;
}

/**
 * Extracts function signatures from a file
 * @param filePath Path to the file
 * @param fileContent Content of the file
 * @returns Array of function signatures
 */
export function extractFunctionSignatures(filePath: string, fileContent: string): Array<{
  name: string;
  signature: string;
}> {
  const signatures: Array<{
    name: string;
    signature: string;
  }> = [];
  
  // Match function declarations
  const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*(?::\s*([^{]*))?/g;
  let match;
  
  while ((match = functionRegex.exec(fileContent)) !== null) {
    const name = match[1];
    const params = match[2];
    const returnType = match[3]?.trim() || 'any';
    
    signatures.push({
      name,
      signature: `function ${name}(${params}): ${returnType}`,
    });
  }
  
  // Match arrow functions with explicit type annotations
  const arrowFunctionRegex = /(?:export\s+)?const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*(?::\s*([^=]*))?=>/g;
  
  while ((match = arrowFunctionRegex.exec(fileContent)) !== null) {
    const name = match[1];
    const params = match[2];
    const returnType = match[3]?.trim() || 'any';
    
    signatures.push({
      name,
      signature: `const ${name} = (${params}): ${returnType} =>`,
    });
  }
  
  return signatures;
}
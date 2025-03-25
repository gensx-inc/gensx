/**
 * Code Analyzer for Test Generation
 * 
 * This file contains functionality to analyze code files and extract
 * information needed to generate appropriate tests.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileCache } from '../tools/cacheManager.js';

/**
 * Types of code constructs we can identify
 */
export enum CodeConstructType {
  Function = 'function',
  Class = 'class',
  Component = 'component',
  Hook = 'hook',
  Interface = 'interface',
  Type = 'type',
  Enum = 'enum',
  Variable = 'variable',
  Unknown = 'unknown'
}

/**
 * Interface for a parameter
 */
export interface Parameter {
  name: string;
  type?: string;
  optional: boolean;
  defaultValue?: string;
}

/**
 * Interface for a function signature
 */
export interface FunctionSignature {
  name: string;
  params: Parameter[];
  returnType?: string;
  isAsync: boolean;
  isExported: boolean;
  startLine: number;
  endLine: number;
}

/**
 * Interface for a class signature
 */
export interface ClassSignature {
  name: string;
  methods: FunctionSignature[];
  properties: Array<{ name: string; type?: string }>;
  extends?: string;
  implements?: string[];
  isExported: boolean;
  startLine: number;
  endLine: number;
}

/**
 * Interface for an import statement
 */
export interface ImportStatement {
  source: string;
  specifiers: string[];
  isDefault: boolean;
  isNamespace: boolean;
  lineNumber: number;
}

/**
 * Interface for a code construct
 */
export interface CodeConstruct {
  type: CodeConstructType;
  name: string;
  signature: FunctionSignature | ClassSignature;
  dependencies: string[];
  startLine: number;
  endLine: number;
  isExported: boolean;
}

/**
 * Interface for file analysis results
 */
export interface FileAnalysisResult {
  imports: ImportStatement[];
  constructs: CodeConstruct[];
  isReactComponent: boolean;
  isReactHook: boolean;
  isTypeScript: boolean;
}

/**
 * Analyze a file to extract information for test generation
 */
export async function analyzeFileForTesting(filePath: string): Promise<FileAnalysisResult> {
  // Get file content from cache or read from disk
  let content = fileCache.get(filePath);
  if (content === null) {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    content = fileContent;
    fileCache.set(filePath, fileContent);
  }
  
  const lines = content.split('\n');
  const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
  
  // Check if it's a React file
  const isReactFile = content.includes('import React') || 
                      content.includes('from "react"') || 
                      content.includes("from 'react'");
  
  // Check if it's a React component file
  const isReactComponent = isReactFile && (
    content.includes('function ') && (
      content.includes('return (') || 
      content.includes('return <')
    )
  );
  
  // Check if it's a React hook file
  const isReactHook = isReactFile && (
    content.includes('function use') || 
    content.includes('const use') && content.includes(' = (') && (
      content.includes('useState') || 
      content.includes('useEffect') || 
      content.includes('useContext') || 
      content.includes('useReducer')
    )
  );
  
  // Parse imports
  const imports = parseImports(content, lines);
  
  // Parse functions, classes, etc.
  const constructs = parseConstructs(content, lines, isTypeScript);
  
  return {
    imports,
    constructs,
    isReactComponent,
    isReactHook,
    isTypeScript,
  };
}

/**
 * Parse import statements from code
 */
function parseImports(content: string, lines: string[]): ImportStatement[] {
  const imports: ImportStatement[] = [];
  const importRegex = /import\s+(?:(\*\s+as\s+\w+)|(\{[^}]+\})|(\w+))?\s+from\s+['"]([^'"]+)['"]/g;
  
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const namespaceImport = match[1];
    const namedImports = match[2];
    const defaultImport = match[3];
    const source = match[4];
    
    // Find line number
    let lineNumber = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(match[0])) {
        lineNumber = i + 1;
        break;
      }
    }
    
    const importInfo: ImportStatement = {
      source,
      specifiers: [],
      isDefault: Boolean(defaultImport),
      isNamespace: Boolean(namespaceImport),
      lineNumber,
    };
    
    if (defaultImport) {
      importInfo.specifiers.push(defaultImport);
    }
    
    if (namedImports) {
      const specifiers = namedImports.replace(/[{}]/g, "").split(",")
        .map(s => s.trim())
        .filter(Boolean);
      importInfo.specifiers.push(...specifiers);
    }
    
    if (namespaceImport) {
      importInfo.specifiers.push(namespaceImport);
    }
    
    imports.push(importInfo);
  }
  
  return imports;
}

/**
 * Parse code constructs from content
 */
function parseConstructs(content: string, lines: string[], isTypeScript: boolean): CodeConstruct[] {
  const constructs: CodeConstruct[] = [];
  
  // Parse functions
  const functions = parseFunctions(content, lines, isTypeScript);
  for (const func of functions) {
    constructs.push({
      type: func.name.startsWith('use') && /^use[A-Z]/.test(func.name) 
        ? CodeConstructType.Hook 
        : CodeConstructType.Function,
      name: func.name,
      signature: func,
      dependencies: [],
      startLine: func.startLine,
      endLine: func.endLine,
      isExported: func.isExported,
    });
  }
  
  // Parse classes
  const classes = parseClasses(content, lines, isTypeScript);
  for (const cls of classes) {
    // Determine if this is a React component
    const isComponent = cls.extends === 'React.Component' || 
                        cls.extends === 'Component' ||
                        content.includes(`<${cls.name}`);
    
    constructs.push({
      type: isComponent ? CodeConstructType.Component : CodeConstructType.Class,
      name: cls.name,
      signature: cls,
      dependencies: [],
      startLine: cls.startLine,
      endLine: cls.endLine,
      isExported: cls.isExported,
    });
  }
  
  return constructs;
}

/**
 * Parse functions from content
 */
function parseFunctions(content: string, lines: string[], isTypeScript: boolean): FunctionSignature[] {
  const functions: FunctionSignature[] = [];
  
  // Regular function declarations
  const functionRegex = /(export\s+)?(async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?\s*\{/g;
  let match;
  while ((match = functionRegex.exec(content)) !== null) {
    const isExported = Boolean(match[1]);
    const isAsync = Boolean(match[2]);
    const name = match[3];
    const paramsStr = match[4];
    const returnType = match[5]?.trim();
    
    // Find the function's position in the file
    let startLine = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(match[0])) {
        startLine = i + 1;
        break;
      }
    }
    
    // Find the end of the function (simplified - just looks for balanced braces)
    let braceCount = 1;
    let endLine = startLine;
    for (let i = startLine; i < lines.length; i++) {
      for (const char of lines[i]) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        if (braceCount === 0) {
          endLine = i + 1;
          break;
        }
      }
      if (braceCount === 0) break;
    }
    
    functions.push({
      name,
      params: parseParameters(paramsStr, isTypeScript),
      returnType,
      isAsync,
      isExported,
      startLine,
      endLine,
    });
  }
  
  // Arrow functions
  const arrowFunctionRegex = /(export\s+)?const\s+(\w+)\s*=\s*(async\s*)?\(([^)]*)\)(?:\s*:\s*([^=]+))?\s*=>/g;
  while ((match = arrowFunctionRegex.exec(content)) !== null) {
    const isExported = Boolean(match[1]);
    const name = match[2];
    const isAsync = Boolean(match[3]);
    const paramsStr = match[4];
    const returnType = match[5]?.trim();
    
    // Find the function's position in the file
    let startLine = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(match[0])) {
        startLine = i + 1;
        break;
      }
    }
    
    // Find the end of the arrow function
    let braceCount = 0;
    let endLine = startLine;
    
    // Check if the function body starts with a brace
    if (content.substring(match.index + match[0].length).trim().startsWith('{')) {
      braceCount = 1;
      for (let i = startLine; i < lines.length; i++) {
        for (const char of lines[i]) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
          if (braceCount === 0) {
            endLine = i + 1;
            break;
          }
        }
        if (braceCount === 0) break;
      }
    } else {
      // Inline arrow function, end line is the same as start line
      endLine = startLine;
    }
    
    functions.push({
      name,
      params: parseParameters(paramsStr, isTypeScript),
      returnType,
      isAsync,
      isExported,
      startLine,
      endLine,
    });
  }
  
  return functions;
}

/**
 * Parse classes from content
 */
function parseClasses(content: string, lines: string[], isTypeScript: boolean): ClassSignature[] {
  const classes: ClassSignature[] = [];
  
  const classRegex = /(export\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?\s*\{/g;
  let match;
  while ((match = classRegex.exec(content)) !== null) {
    const isExported = Boolean(match[1]);
    const name = match[2];
    const extendsClass = match[3];
    const implementsInterfaces = match[4]?.split(',').map(i => i.trim());
    
    // Find the class's position in the file
    let startLine = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(match[0])) {
        startLine = i + 1;
        break;
      }
    }
    
    // Find the end of the class
    let braceCount = 1;
    let endLine = startLine;
    for (let i = startLine; i < lines.length; i++) {
      for (const char of lines[i]) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        if (braceCount === 0) {
          endLine = i + 1;
          break;
        }
      }
      if (braceCount === 0) break;
    }
    
    // Extract class methods (simplified)
    const classContent = lines.slice(startLine - 1, endLine).join('\n');
    const methods = parseClassMethods(classContent, startLine, isTypeScript);
    
    classes.push({
      name,
      methods,
      properties: [], // Simplified - not parsing properties
      extends: extendsClass,
      implements: implementsInterfaces,
      isExported,
      startLine,
      endLine,
    });
  }
  
  return classes;
}

/**
 * Parse class methods
 */
function parseClassMethods(classContent: string, classStartLine: number, isTypeScript: boolean): FunctionSignature[] {
  const methods: FunctionSignature[] = [];
  
  // Method regex - captures both regular and async methods
  const methodRegex = /(async\s+)?(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?\s*\{/g;
  let match;
  while ((match = methodRegex.exec(classContent)) !== null) {
    const isAsync = Boolean(match[1]);
    const name = match[2];
    const paramsStr = match[3];
    const returnType = match[4]?.trim();
    
    // Count lines to find the method's position
    const contentUpToMethod = classContent.substring(0, match.index);
    const lineCount = (contentUpToMethod.match(/\n/g) || []).length;
    const startLine = classStartLine + lineCount;
    
    // Find the end of the method (simplified)
    let braceCount = 1;
    let endLine = startLine;
    const remainingContent = classContent.substring(match.index + match[0].length);
    const remainingLines = remainingContent.split('\n');
    
    for (let i = 0; i < remainingLines.length; i++) {
      for (const char of remainingLines[i]) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        if (braceCount === 0) {
          endLine = startLine + i + 1;
          break;
        }
      }
      if (braceCount === 0) break;
    }
    
    // Skip constructor for test generation purposes
    if (name !== 'constructor') {
      methods.push({
        name,
        params: parseParameters(paramsStr, isTypeScript),
        returnType,
        isAsync,
        isExported: false, // Methods are not directly exported
        startLine,
        endLine,
      });
    }
  }
  
  return methods;
}

/**
 * Parse function parameters
 */
function parseParameters(paramsStr: string, isTypeScript: boolean): Parameter[] {
  if (!paramsStr.trim()) {
    return [];
  }
  
  const params: Parameter[] = [];
  const paramsList = paramsStr.split(',').map(p => p.trim());
  
  for (const param of paramsList) {
    if (!param) continue;
    
    let name = param;
    let type: string | undefined;
    let optional = false;
    let defaultValue: string | undefined;
    
    // Check for default value
    if (param.includes('=')) {
      const [paramName, defValue] = param.split('=').map(p => p.trim());
      name = paramName;
      defaultValue = defValue;
      optional = true;
    }
    
    // Check for type (TypeScript)
    if (isTypeScript && param.includes(':')) {
      const [paramName, paramType] = param.split(':').map(p => p.trim());
      name = paramName;
      
      // Handle optional parameter with type
      if (paramName.endsWith('?')) {
        name = paramName.slice(0, -1);
        optional = true;
      }
      
      // Extract type
      if (paramType.includes('=')) {
        const [typeValue, defValue] = paramType.split('=').map(p => p.trim());
        type = typeValue;
        defaultValue = defValue;
        optional = true;
      } else {
        type = paramType;
      }
    }
    
    params.push({
      name,
      type,
      optional,
      defaultValue,
    });
  }
  
  return params;
}

/**
 * Determine the appropriate test file path for a source file
 */
export function getTestFilePath(sourcePath: string): string {
  const dir = path.dirname(sourcePath);
  const filename = path.basename(sourcePath, path.extname(sourcePath));
  const ext = path.extname(sourcePath).replace('.', '');
  
  // Create test file in __tests__ directory
  const testDir = path.join(dir, '__tests__');
  return path.join(testDir, `${filename}.test.${ext}`);
}

/**
 * Create the test directory if it doesn't exist
 */
export async function ensureTestDirectory(testFilePath: string): Promise<void> {
  const testDir = path.dirname(testFilePath);
  
  try {
    await fs.access(testDir);
  } catch (error) {
    // Directory doesn't exist, create it
    await fs.mkdir(testDir, { recursive: true });
  }
}
import { describe, expect } from '../testing/testRunner.js';
import { analyzeFile, extractInterfaces, extractFunctionSignatures } from './codeAnalyzer.js';

describe('CodeAnalyzer', (suite) => {
  suite.test('analyzeFile should parse imports correctly', () => {
    const filePath = '/test/file.tsx';
    const fileContent = `
      import { Component } from 'react';
      import * as path from 'path';
      import utils from './utils';
      
      export function test() {
        return true;
      }
    `;
    
    const result = analyzeFile(filePath, fileContent);
    
    expect.toBeTruthy(result.imports.includes('react'));
    expect.toBeTruthy(result.imports.includes('path'));
    expect.toBeTruthy(result.imports.includes('./utils'));
    expect.toEqual(result.imports.length, 3);
  });
  
  suite.test('extractInterfaces should identify interfaces', () => {
    const filePath = '/test/file.tsx';
    const fileContent = `
      interface TestInterface {
        name: string;
        age: number;
      }
      
      export type TestType = {
        id: string;
        value: number;
      };
    `;
    
    const result = extractInterfaces(filePath, fileContent);
    
    expect.toEqual(result.length, 2);
    expect.toEqual(result[0].name, 'TestInterface');
    expect.toEqual(result[0].type, 'interface');
    expect.toEqual(result[1].name, 'TestType');
    expect.toEqual(result[1].type, 'type');
  });
  
  suite.test('extractFunctionSignatures should identify functions', () => {
    const filePath = '/test/file.tsx';
    const fileContent = `
      function testFunction(param1: string, param2: number): boolean {
        return true;
      }
      
      const arrowFunction = (value: string): number => {
        return 42;
      };
    `;
    
    const result = extractFunctionSignatures(filePath, fileContent);
    
    expect.toEqual(result.length, 2);
    expect.toEqual(result[0].name, 'testFunction');
    expect.toBeTruthy(result[0].signature.includes('param1: string'));
    expect.toBeTruthy(result[0].signature.includes('param2: number'));
    expect.toBeTruthy(result[0].signature.includes('boolean'));
    
    expect.toEqual(result[1].name, 'arrowFunction');
    expect.toBeTruthy(result[1].signature.includes('value: string'));
    expect.toBeTruthy(result[1].signature.includes('number'));
  });
});
/**
 * Test Templates
 * 
 * This file contains templates for generating different types of tests.
 * Templates are used by the test generator to create appropriate test files
 * based on the code being tested.
 */

/**
 * Template for a basic function test
 */
export function functionTestTemplate(
  functionName: string,
  params: string[],
  importPath: string,
  hasReturnValue: boolean = true
): string {
  const paramsList = params.map(p => `${p}: any`).join(', ');
  const mockParams = params.map(p => `mock${p.charAt(0).toUpperCase() + p.slice(1)}`).join(', ');
  const mockParamsDeclarations = params.map(p => 
    `  const mock${p.charAt(0).toUpperCase() + p.slice(1)} = {}; // TODO: Replace with appropriate mock value`
  ).join('\n');
  
  return `import { ${functionName} } from '${importPath}';
import { expect, test, describe, vi } from 'vitest';

describe('${functionName}', () => {
  test('should execute without errors', async () => {
${mockParamsDeclarations}
    
    // Execute the function
    ${hasReturnValue ? 'const result = await ' : 'await '}${functionName}(${mockParams});
    
    // Add assertions here
    ${hasReturnValue ? 'expect(result).toBeDefined();' : '// Add appropriate assertions'}
  });

  test('should handle edge cases', async () => {
    // TODO: Add tests for edge cases
  });

  test('should handle errors', async () => {
    // TODO: Add tests for error conditions
  });
});
`;
}

/**
 * Template for a class test
 */
export function classTestTemplate(
  className: string,
  methods: Array<{ name: string, params: string[] }>,
  importPath: string
): string {
  const methodTests = methods.map(method => {
    const paramsList = method.params.map(p => `${p}: any`).join(', ');
    const mockParams = method.params.map(p => `mock${p.charAt(0).toUpperCase() + p.slice(1)}`).join(', ');
    const mockParamsDeclarations = method.params.map(p => 
      `    const mock${p.charAt(0).toUpperCase() + p.slice(1)} = {}; // TODO: Replace with appropriate mock value`
    ).join('\n');
    
    return `  test('${method.name} should work correctly', async () => {
${mockParamsDeclarations}
    
    const instance = new ${className}();
    ${method.params.length > 0 
      ? `const result = await instance.${method.name}(${mockParams});
    expect(result).toBeDefined();` 
      : `await instance.${method.name}();
    // Add appropriate assertions`}
  });`;
  }).join('\n\n');
  
  return `import { ${className} } from '${importPath}';
import { expect, test, describe, vi, beforeEach, afterEach } from 'vitest';

describe('${className}', () => {
  beforeEach(() => {
    // Setup code before each test
  });

  afterEach(() => {
    // Cleanup code after each test
    vi.restoreAllMocks();
  });

  test('should instantiate correctly', () => {
    const instance = new ${className}();
    expect(instance).toBeInstanceOf(${className});
  });

${methodTests}
});
`;
}

/**
 * Template for a React component test
 */
export function componentTestTemplate(
  componentName: string,
  props: Array<{ name: string, type: string }>,
  importPath: string
): string {
  const propsObject = props.length > 0 
    ? `{\n    ${props.map(p => `${p.name}: ${getMockValueForType(p.type)}`).join(',\n    ')}\n  }` 
    : '{}';
  
  return `import { render, screen, fireEvent } from '@testing-library/react';
import { ${componentName} } from '${importPath}';
import { expect, test, describe, vi } from 'vitest';

describe('${componentName}', () => {
  test('renders without crashing', () => {
    const props = ${propsObject};
    render(<${componentName} {...props} />);
    // Add assertions based on what should be in the rendered output
  });

  test('handles user interactions', () => {
    const props = ${propsObject};
    render(<${componentName} {...props} />);
    
    // Example: Find and click a button
    // const button = screen.getByRole('button', { name: /submit/i });
    // fireEvent.click(button);
    
    // Add assertions for the expected behavior after interaction
  });

  test('handles prop changes', () => {
    const props = ${propsObject};
    const { rerender } = render(<${componentName} {...props} />);
    
    // Example: Rerender with different props
    // rerender(<${componentName} {...props} someProp="new value" />);
    
    // Add assertions for the expected behavior after prop changes
  });
});
`;
}

/**
 * Template for a hook test
 */
export function hookTestTemplate(
  hookName: string,
  params: string[],
  importPath: string
): string {
  const mockParams = params.map(p => `mock${p.charAt(0).toUpperCase() + p.slice(1)}`).join(', ');
  const mockParamsDeclarations = params.map(p => 
    `  const mock${p.charAt(0).toUpperCase() + p.slice(1)} = {}; // TODO: Replace with appropriate mock value`
  ).join('\n');
  
  return `import { renderHook, act } from '@testing-library/react-hooks';
import { ${hookName} } from '${importPath}';
import { expect, test, describe, vi } from 'vitest';

describe('${hookName}', () => {
${mockParamsDeclarations}

  test('should initialize correctly', () => {
    const { result } = renderHook(() => ${hookName}(${mockParams}));
    expect(result.current).toBeDefined();
    // Add more specific assertions based on the hook's expected initial state
  });

  test('should update state correctly', () => {
    const { result } = renderHook(() => ${hookName}(${mockParams}));
    
    // Example: If the hook returns a state and a setter function
    // act(() => {
    //   result.current[1]('new value');
    // });
    // expect(result.current[0]).toBe('new value');
    
    // Add assertions for the expected behavior after state updates
  });

  test('should handle side effects', () => {
    // Mock any dependencies the hook might use
    const mockFn = vi.fn();
    
    const { result, unmount } = renderHook(() => ${hookName}(${mockParams}));
    
    // Test side effects during hook lifecycle
    // expect(mockFn).toHaveBeenCalled();
    
    // Test cleanup when the hook unmounts
    unmount();
    // Add assertions for cleanup behavior
  });
});
`;
}

/**
 * Template for a utility module test
 */
export function utilityTestTemplate(
  utilityName: string,
  functions: Array<{ name: string, params: string[] }>,
  importPath: string
): string {
  const functionTests = functions.map(func => {
    const mockParams = func.params.map(p => `mock${p.charAt(0).toUpperCase() + p.slice(1)}`).join(', ');
    const mockParamsDeclarations = func.params.map(p => 
      `    const mock${p.charAt(0).toUpperCase() + p.slice(1)} = {}; // TODO: Replace with appropriate mock value`
    ).join('\n');
    
    return `  describe('${func.name}', () => {
    test('should work correctly', () => {
${mockParamsDeclarations}
      
      const result = ${utilityName}.${func.name}(${mockParams});
      expect(result).toBeDefined();
      // Add more specific assertions
    });

    test('should handle edge cases', () => {
      // TODO: Add tests for edge cases
    });
  });`;
  }).join('\n\n');
  
  return `import * as ${utilityName} from '${importPath}';
import { expect, test, describe, vi } from 'vitest';

describe('${utilityName} utility', () => {
${functionTests}
});
`;
}

/**
 * Helper function to generate mock values based on type
 */
function getMockValueForType(type: string): string {
  switch (type.toLowerCase()) {
    case 'string':
      return "'mock string'";
    case 'number':
      return '42';
    case 'boolean':
      return 'true';
    case 'function':
      return 'vi.fn()';
    case 'array':
      return '[]';
    case 'object':
      return '{}';
    case 'date':
      return 'new Date()';
    case 'promise':
      return 'Promise.resolve()';
    case 'null':
      return 'null';
    case 'undefined':
      return 'undefined';
    default:
      return '{}';
  }
}
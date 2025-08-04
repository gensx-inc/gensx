/**
 * DOM Tool Implementations for the New Architecture
 * Implements the tool surface specified in the rearchitecture document
 */

import { RoleSelector, ToolResult, Observation, MiniPCD } from '../shared/types';
import { TIMEOUTS } from '../shared/constants';
import { resolveRoleSelector, findBestMatch, getAccessibleName } from './roleDsl';
import { getMiniPCD, queryPCD, getDetails } from './pcd';

/**
 * Tool implementations matching the new API surface
 */
export const domToolImplementations = {
  
  /**
   * Get current MiniPCD
   */
  getMiniPCD: async (): Promise<ToolResult<MiniPCD>> => {
    try {
      const miniPCD = getMiniPCD();
      return { ok: true, data: miniPCD };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to get MiniPCD',
        retryable: true
      };
    }
  },

  /**
   * Query MiniPCD for elements
   */
  'pcd.query': async (args: {
    kind?: 'action'|'form'|'collection';
    text?: string;
    topK?: number;
  }): Promise<ToolResult<Array<{ id: string; label: string; kind?: string; landmark?: string; score: number }>>> => {
    try {
      const results = queryPCD(args);
      return { ok: true, data: results };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to query PCD',
        retryable: true
      };
    }
  },

  /**
   * Get detailed selectors for elements
   */
  getDetails: async (args: { ids: string[] }): Promise<ToolResult<any[]>> => {
    try {
      const details = getDetails(args.ids);
      return { ok: true, data: details };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to get details',
        retryable: true
      };
    }
  },

  /**
   * Click on an element using role selector
   */
  'dom.click': async (args: { selector: RoleSelector }): Promise<ToolResult<Observation>> => {
    try {
      const elements = resolveRoleSelector(args.selector);
      
      if (elements.length === 0) {
        return {
          ok: false,
          error: `No elements found matching selector`,
          retryable: true,
          code: 'ELEMENT_NOT_FOUND'
        };
      }

      const targetElement = findBestMatch(args.selector, elements);
      if (!targetElement) {
        return {
          ok: false,
          error: 'No suitable element found',
          retryable: true,
          code: 'NO_SUITABLE_ELEMENT'
        };
      }

      // Perform the click
      const startUrl = window.location.href;
      const startTitle = document.title;
      
      // Scroll element into view if needed
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Wait a moment for scroll
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Dispatch native click event
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      
      targetElement.dispatchEvent(clickEvent);
      
      // Wait for potential changes
      await new Promise(resolve => setTimeout(resolve, TIMEOUTS.ACTION_WAIT_MS));
      
      // Create observation
      const observation: Observation = {
        url: window.location.href,
        title: document.title,
        ts: Date.now(),
        urlChanged: window.location.href !== startUrl,
        focusedRole: targetElement.getAttribute('role') || targetElement.tagName.toLowerCase()
      };

      return { ok: true, data: observation };
      
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Click failed',
        retryable: true,
        code: 'CLICK_ERROR'
      };
    }
  },

  /**
   * Type text into an element
   */
  'dom.type': async (args: { 
    selector: RoleSelector; 
    text: string; 
    replace?: boolean 
  }): Promise<ToolResult<Observation>> => {
    try {
      const elements = resolveRoleSelector(args.selector);
      
      if (elements.length === 0) {
        return {
          ok: false,
          error: 'No elements found matching selector',
          retryable: true,
          code: 'ELEMENT_NOT_FOUND'
        };
      }

      const targetElement = findBestMatch(args.selector, elements);
      if (!targetElement) {
        return {
          ok: false,
          error: 'No suitable element found',
          retryable: true,
          code: 'NO_SUITABLE_ELEMENT'
        };
      }

      // Check if element is a valid input
      if (!isTypableElement(targetElement)) {
        return {
          ok: false,
          error: 'Element is not typable (not input, textarea, or contenteditable)',
          retryable: false,
          code: 'NOT_TYPABLE'
        };
      }

      // Focus the element
      targetElement.focus();
      
      // Clear existing content if replace is true
      if (args.replace) {
        if (targetElement instanceof HTMLInputElement || targetElement instanceof HTMLTextAreaElement) {
          targetElement.value = '';
        } else if (targetElement.isContentEditable) {
          targetElement.textContent = '';
        }
      }

      // Type the text using native value setter for React compatibility
      if (targetElement instanceof HTMLInputElement || targetElement instanceof HTMLTextAreaElement) {
        const nativeValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set || Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          'value'
        )?.set;

        if (nativeValueSetter) {
          const currentValue = args.replace ? '' : targetElement.value;
          nativeValueSetter.call(targetElement, currentValue + args.text);
        } else {
          targetElement.value = (args.replace ? '' : targetElement.value) + args.text;
        }

        // Dispatch input events for React
        targetElement.dispatchEvent(new Event('input', { bubbles: true }));
        targetElement.dispatchEvent(new Event('change', { bubbles: true }));
        
      } else if (targetElement.isContentEditable) {
        const currentText = args.replace ? '' : targetElement.textContent || '';
        targetElement.textContent = currentText + args.text;
        
        // Dispatch input event
        targetElement.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // Wait for updates
      await new Promise(resolve => setTimeout(resolve, TIMEOUTS.ACTION_WAIT_MS));

      const observation: Observation = {
        url: window.location.href,
        title: document.title,
        ts: Date.now(),
        focusedRole: targetElement.getAttribute('role') || targetElement.tagName.toLowerCase()
      };

      return { ok: true, data: observation };
      
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Type failed',
        retryable: true,
        code: 'TYPE_ERROR'
      };
    }
  },

  /**
   * Select an option from a dropdown
   */
  'dom.select': async (args: { 
    selector: RoleSelector; 
    value: string 
  }): Promise<ToolResult<Observation>> => {
    try {
      const elements = resolveRoleSelector(args.selector);
      
      if (elements.length === 0) {
        return {
          ok: false,
          error: 'No elements found matching selector',
          retryable: true,
          code: 'ELEMENT_NOT_FOUND'
        };
      }

      const targetElement = findBestMatch(args.selector, elements);
      if (!targetElement) {
        return {
          ok: false,
          error: 'No suitable element found',
          retryable: true,
          code: 'NO_SUITABLE_ELEMENT'
        };
      }

      if (!(targetElement instanceof HTMLSelectElement)) {
        return {
          ok: false,
          error: 'Element is not a select element',
          retryable: false,
          code: 'NOT_SELECT'
        };
      }

      // Find the option to select
      const option = Array.from(targetElement.options).find(opt => 
        opt.value === args.value || 
        opt.textContent?.trim() === args.value ||
        opt.label === args.value
      );

      if (!option) {
        const availableOptions = Array.from(targetElement.options).map(opt => ({
          value: opt.value,
          text: opt.textContent?.trim(),
          label: opt.label
        }));
        
        return {
          ok: false,
          error: `Option "${args.value}" not found. Available options: ${JSON.stringify(availableOptions)}`,
          retryable: false,
          code: 'OPTION_NOT_FOUND'
        };
      }

      // Select the option
      targetElement.value = option.value;
      option.selected = true;

      // Dispatch change event
      targetElement.dispatchEvent(new Event('change', { bubbles: true }));

      await new Promise(resolve => setTimeout(resolve, TIMEOUTS.ACTION_WAIT_MS));

      const observation: Observation = {
        url: window.location.href,
        title: document.title,
        ts: Date.now(),
        focusedRole: 'combobox'
      };

      return { ok: true, data: observation };
      
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Select failed',
        retryable: true,
        code: 'SELECT_ERROR'
      };
    }
  },

  /**
   * Submit a form
   */
  'dom.submit': async (args: { selector: RoleSelector }): Promise<ToolResult<Observation>> => {
    try {
      const elements = resolveRoleSelector(args.selector);
      
      if (elements.length === 0) {
        return {
          ok: false,
          error: 'No elements found matching selector',
          retryable: true,
          code: 'ELEMENT_NOT_FOUND'
        };
      }

      const targetElement = findBestMatch(args.selector, elements);
      if (!targetElement) {
        return {
          ok: false,
          error: 'No suitable element found',
          retryable: true,
          code: 'NO_SUITABLE_ELEMENT'
        };
      }

      const startUrl = window.location.href;

      if (targetElement instanceof HTMLFormElement) {
        // Direct form submission
        targetElement.requestSubmit();
      } else if (targetElement.matches('button[type="submit"], input[type="submit"]')) {
        // Submit button click
        targetElement.click();
      } else {
        // Find parent form
        const form = targetElement.closest('form');
        if (form) {
          form.requestSubmit();
        } else {
          return {
            ok: false,
            error: 'Element is not a form and no parent form found',
            retryable: false,
            code: 'NO_FORM'
          };
        }
      }

      // Wait for submission processing
      await new Promise(resolve => setTimeout(resolve, TIMEOUTS.ACTION_WAIT_MS * 2));

      const observation: Observation = {
        url: window.location.href,
        title: document.title,
        ts: Date.now(),
        urlChanged: window.location.href !== startUrl
      };

      return { ok: true, data: observation };
      
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Submit failed',
        retryable: true,
        code: 'SUBMIT_ERROR'
      };
    }
  },

  /**
   * Scroll the page or to an element
   */
  'dom.scroll': async (args: { 
    y?: number; 
    selector?: RoleSelector 
  }): Promise<ToolResult<Observation>> => {
    try {
      if (args.selector) {
        // Scroll to element
        const elements = resolveRoleSelector(args.selector);
        
        if (elements.length === 0) {
          return {
            ok: false,
            error: 'No elements found matching selector',
            retryable: true,
            code: 'ELEMENT_NOT_FOUND'
          };
        }

        const targetElement = findBestMatch(args.selector, elements);
        if (!targetElement) {
          return {
            ok: false,
            error: 'No suitable element found',
            retryable: true,
            code: 'NO_SUITABLE_ELEMENT'
          };
        }

        targetElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'center'
        });
        
      } else if (args.y !== undefined) {
        // Scroll to Y position
        window.scrollTo({ 
          top: args.y, 
          behavior: 'smooth' 
        });
      } else {
        return {
          ok: false,
          error: 'Either y position or selector must be provided',
          retryable: false,
          code: 'INVALID_ARGS'
        };
      }

      // Wait for scroll to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      const observation: Observation = {
        url: window.location.href,
        title: document.title,
        ts: Date.now()
      };

      return { ok: true, data: observation };
      
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Scroll failed',
        retryable: true,
        code: 'SCROLL_ERROR'
      };
    }
  },

  /**
   * Wait for specific conditions
   */
  'dom.waitFor': async (args: { 
    event: 'urlChange'|'networkIdle'|'selector'|'text'; 
    value?: string; 
    timeoutMs?: number 
  }): Promise<ToolResult<Observation>> => {
    
    const timeout = args.timeoutMs || TIMEOUTS.DEFAULT_WAIT_FOR_MS;
    const startTime = Date.now();
    const startUrl = window.location.href;
    
    try {
      const result = await Promise.race([
        waitForCondition(args.event, args.value),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), timeout)
        )
      ]);

      const observation: Observation = {
        url: window.location.href,
        title: document.title,
        ts: Date.now(),
        urlChanged: window.location.href !== startUrl
      };

      return { ok: true, data: observation };
      
    } catch (error) {
      if (error instanceof Error && error.message === 'Timeout') {
        return {
          ok: false,
          error: `Timeout waiting for ${args.event}${args.value ? ` (${args.value})` : ''} after ${timeout}ms`,
          retryable: true,
          code: 'TIMEOUT'
        };
      }
      
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Wait failed',
        retryable: true,
        code: 'WAIT_ERROR'
      };
    }
  },

  /**
   * Extract data from a collection
   */
  'dom.extract': async (args: { 
    collectionId: string; 
    fields: string[] 
  }): Promise<ToolResult<Array<Record<string, string>>>> => {
    try {
      // Find collection element by PCD ID
      const collectionElement = document.querySelector(`[data-pcd-id="${args.collectionId}"]`);
      
      if (!collectionElement) {
        return {
          ok: false,
          error: `Collection with ID ${args.collectionId} not found`,
          retryable: true,
          code: 'COLLECTION_NOT_FOUND'
        };
      }

      // Extract data from collection items
      const items = Array.from(collectionElement.children);
      const extractedData: Array<Record<string, string>> = [];

      for (const item of items.slice(0, 100)) { // Limit to 100 items
        const itemData: Record<string, string> = {};
        
        for (const field of args.fields) {
          itemData[field] = extractFieldFromItem(item, field);
        }
        
        // Only include items with at least one non-empty field
        if (Object.values(itemData).some(value => value.trim())) {
          extractedData.push(itemData);
        }
      }

      return { ok: true, data: extractedData };
      
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Extract failed',
        retryable: true,
        code: 'EXTRACT_ERROR'
      };
    }
  }
};

/**
 * Helper function to check if element can receive text input
 */
function isTypableElement(element: HTMLElement): boolean {
  if (element instanceof HTMLInputElement) {
    const type = element.type.toLowerCase();
    return ['text', 'email', 'password', 'search', 'tel', 'url', 'number'].includes(type);
  }
  
  if (element instanceof HTMLTextAreaElement) {
    return true;
  }
  
  if (element.isContentEditable) {
    return true;
  }
  
  return false;
}

/**
 * Wait for specific conditions to be met
 */
async function waitForCondition(event: string, value?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let resolved = false;
    
    const cleanup = () => {
      resolved = true;
    };
    
    switch (event) {
      case 'urlChange':
        const originalUrl = window.location.href;
        const checkUrl = () => {
          if (resolved) return;
          if (window.location.href !== originalUrl) {
            cleanup();
            resolve();
          } else {
            setTimeout(checkUrl, 100);
          }
        };
        checkUrl();
        break;
        
      case 'networkIdle':
        let activeRequests = 0;
        let idleTimer: NodeJS.Timeout;
        
        // Monitor fetch requests
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
          activeRequests++;
          try {
            const response = await originalFetch(...args);
            activeRequests--;
            resetIdleTimer();
            return response;
          } catch (error) {
            activeRequests--;
            resetIdleTimer();
            throw error;
          }
        };
        
        const resetIdleTimer = () => {
          if (resolved) return;
          clearTimeout(idleTimer);
          if (activeRequests === 0) {
            idleTimer = setTimeout(() => {
              if (!resolved) {
                window.fetch = originalFetch;
                cleanup();
                resolve();
              }
            }, TIMEOUTS.NETWORK_IDLE_MS);
          }
        };
        
        resetIdleTimer();
        break;
        
      case 'selector':
        if (!value) {
          reject(new Error('Selector value required for selector event'));
          return;
        }
        
        const checkSelector = () => {
          if (resolved) return;
          const element = document.querySelector(value);
          if (element) {
            cleanup();
            resolve();
          } else {
            setTimeout(checkSelector, 100);
          }
        };
        checkSelector();
        break;
        
      case 'text':
        if (!value) {
          reject(new Error('Text value required for text event'));
          return;
        }
        
        const checkText = () => {
          if (resolved) return;
          if (document.body.textContent?.includes(value)) {
            cleanup();
            resolve();
          } else {
            setTimeout(checkText, 100);
          }
        };
        checkText();
        break;
        
      default:
        reject(new Error(`Unknown event type: ${event}`));
    }
  });
}

/**
 * Extract field value from collection item
 */
function extractFieldFromItem(item: Element, field: string): string {
  switch (field.toLowerCase()) {
    case 'title':
    case 'name':
      // Look for headings, titles, or primary text
      const heading = item.querySelector('h1, h2, h3, h4, h5, h6, .title, .name');
      if (heading) return heading.textContent?.trim() || '';
      
      // Fallback to first significant text
      const textElement = item.querySelector('a, span, div');
      return textElement?.textContent?.trim() || '';
      
    case 'link':
    case 'url':
    case 'href':
      const link = item.querySelector('a[href]');
      return link?.getAttribute('href') || '';
      
    case 'image':
    case 'img':
      const img = item.querySelector('img');
      return img?.getAttribute('src') || '';
      
    case 'price':
      // Look for price patterns
      const priceText = item.textContent || '';
      const priceMatch = priceText.match(/\$[\d,]+(?:\.\d{2})?/);
      return priceMatch ? priceMatch[0] : '';
      
    case 'date':
      // Look for date patterns
      const dateText = item.textContent || '';
      const dateMatch = dateText.match(/\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/);
      return dateMatch ? dateMatch[0] : '';
      
    case 'description':
    case 'summary':
      // Look for description elements
      const desc = item.querySelector('.description, .summary, p');
      return desc?.textContent?.trim() || '';
      
    default:
      // Generic field extraction by class or data attribute
      const fieldElement = item.querySelector(`.${field}, [data-field="${field}"]`);
      return fieldElement?.textContent?.trim() || '';
  }
}
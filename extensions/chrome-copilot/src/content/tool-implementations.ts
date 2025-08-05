/**
 * DOM Tool Implementations for the New Architecture
 * Implements the tool surface specified in the rearchitecture document
 */

import { RoleSelector, ToolResult, Observation, MiniPCD } from '../shared/types';
import { TIMEOUTS } from '../shared/constants';
import { resolveRoleSelector, findBestMatch, getAccessibleName } from './roleDsl';
import { getMiniPCD, queryPCD, getDetails, getCollectionElement } from './pcd';

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
  pcd_query: async (args: {
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
  dom_click: async (args: { selector: RoleSelector }): Promise<ToolResult<Observation>> => {
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
  dom_type: async (args: { 
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
  dom_select: async (args: { 
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
  dom_submit: async (args: { selector: RoleSelector }): Promise<ToolResult<Observation>> => {
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
  dom_scroll: async (args: { 
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
  dom_waitFor: async (args: { 
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
   * Find elements by their visible text content
   */
  dom_findByText: async (args: {
    searchText: string;
    elementType?: 'any' | 'clickable' | 'button' | 'link' | 'input';
    exactMatch?: boolean;
  }): Promise<ToolResult<Array<{
    text: string;
    tagName: string;
    clickable: boolean;
    href?: string;
    selector: {
      kind: 'text';
      text: string;
    };
    position: { x: number; y: number; width: number; height: number };
  }>>> => {
    try {
      const searchText = args.searchText.toLowerCase();
      const exactMatch = args.exactMatch !== false;
      const elementType = args.elementType || 'any';
      
      // Find all elements that contain the search text
      let candidates: HTMLElement[] = [];
      
      if (elementType === 'clickable') {
        candidates = Array.from(document.querySelectorAll('a, button, [onclick], [role="button"], input[type="button"], input[type="submit"], [tabindex], *[style*="cursor: pointer"], *[style*="cursor:pointer"]')) as HTMLElement[];
      } else if (elementType === 'button') {
        candidates = Array.from(document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]')) as HTMLElement[];
      } else if (elementType === 'link') {
        candidates = Array.from(document.querySelectorAll('a[href], [role="link"]')) as HTMLElement[];
      } else if (elementType === 'input') {
        candidates = Array.from(document.querySelectorAll('input, textarea, select, [contenteditable]')) as HTMLElement[];
      } else {
        // Search all elements
        candidates = Array.from(document.querySelectorAll('*')) as HTMLElement[];
      }
      
      // Filter by text content
      const matches: Array<{
        text: string;
        tagName: string;
        clickable: boolean;
        href?: string;
        selector: { kind: 'text'; text: string };
        position: { x: number; y: number; width: number; height: number };
      }> = [];
      
      for (const element of candidates) {
        const elementText = element.textContent?.trim() || '';
        const ariaLabel = element.getAttribute('aria-label') || '';
        const title = element.getAttribute('title') || '';
        const allText = `${elementText} ${ariaLabel} ${title}`.toLowerCase();
        
        let isMatch = false;
        if (exactMatch) {
          isMatch = allText === searchText || elementText.toLowerCase() === searchText;
        } else {
          isMatch = allText.includes(searchText);
        }
        
        if (isMatch && elementText.length > 0) {
          try {
            const rect = element.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              const isClickable = element.matches('a, button, [onclick], [role="button"], input[type="button"], input[type="submit"]') ||
                                 window.getComputedStyle(element).cursor === 'pointer' ||
                                 element.hasAttribute('tabindex');
              
              matches.push({
                text: elementText,
                tagName: element.tagName.toLowerCase(),
                clickable: isClickable,
                href: element.getAttribute('href') || undefined,
                selector: {
                  kind: 'text',
                  text: elementText
                },
                position: {
                  x: Math.round(rect.left),
                  y: Math.round(rect.top),
                  width: Math.round(rect.width),
                  height: Math.round(rect.height)
                }
              });
            }
          } catch (error) {
            // Skip elements that can't be measured
          }
        }
      }
      
      // Sort by position (top to bottom, left to right) and deduplicate
      const sortedMatches = matches
        .sort((a, b) => {
          const yDiff = a.position.y - b.position.y;
          if (Math.abs(yDiff) > 10) return yDiff;
          return a.position.x - b.position.x;
        })
        .slice(0, 20); // Limit results
      
      // Remove duplicates with same text and position
      const uniqueMatches = sortedMatches.filter((match, index) => {
        return !sortedMatches.slice(0, index).some(prev => 
          prev.text === match.text && 
          Math.abs(prev.position.x - match.position.x) < 5 &&
          Math.abs(prev.position.y - match.position.y) < 5
        );
      });
      
      console.log(`🔍 Found ${uniqueMatches.length} elements matching "${args.searchText}"`);
      
      return { ok: true, data: uniqueMatches };
      
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Text search failed',
        retryable: true,
        code: 'TEXT_SEARCH_ERROR'
      };
    }
  },

  /**
   * Get page content in a simple, reliable way
   */
  dom_getPageContent: async (args: {
    includeLinks?: boolean;
    includeClickables?: boolean;
  }): Promise<ToolResult<{
    pageTitle: string;
    url: string;
    mainContent: string;
    clickableElements: Array<{
      text: string;
      tag: string;
      href?: string;
      isButton: boolean;
    }>;
    allText: string;
  }>> => {
    try {
      const includeLinks = args.includeLinks !== false;
      const includeClickables = args.includeClickables !== false;
      
      // Get basic page info
      const pageTitle = document.title;
      const url = window.location.href;
      
      // Get main content area text with proper spacing
      let mainContent = '';
      const mainElement = document.querySelector('main, [role="main"], #main, .main-content, .content');
      if (mainElement) {
        mainContent = extractTextWithSpacing(mainElement);
      } else {
        // Fallback to body but exclude nav/header/footer
        const bodyClone = document.body.cloneNode(true) as HTMLElement;
        const excludeSelectors = 'nav, header, footer, [role="navigation"], [role="banner"], [role="contentinfo"], .nav, .header, .footer';
        const excludeElements = bodyClone.querySelectorAll(excludeSelectors);
        excludeElements.forEach(el => el.remove());
        mainContent = extractTextWithSpacing(bodyClone);
      }
      
      // Get clickable elements if requested
      const clickableElements: Array<{
        text: string;
        tag: string;
        href?: string;
        isButton: boolean;
      }> = [];
      
      if (includeClickables) {
        // Find all clickable elements
        const clickables = document.querySelectorAll('a, button, [onclick], [role="button"], input[type="button"], input[type="submit"]');
        
        for (const el of clickables) {
          const element = el as HTMLElement;
          const text = element.textContent?.trim() || element.getAttribute('aria-label') || element.getAttribute('title') || '';
          
          if (text && text.length > 0 && text.length < 200) {
            clickableElements.push({
              text,
              tag: element.tagName.toLowerCase(),
              href: element.getAttribute('href') || undefined,
              isButton: element.matches('button, [role="button"], input[type="button"], input[type="submit"]')
            });
          }
        }
      }
      
      // Get all visible text as fallback with proper spacing
      const allText = extractTextWithSpacing(document.body);
      
      console.log(`📄 Page content extracted: ${mainContent.length} chars main, ${clickableElements.length} clickables, ${allText.length} chars total`);
      
      return {
        ok: true,
        data: {
          pageTitle,
          url,
          mainContent: mainContent.substring(0, 5000), // Limit to prevent huge context
          clickableElements: clickableElements.slice(0, 50), // Limit clickables
          allText: allText.substring(0, 8000) // Larger limit for full text
        }
      };
      
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Page content extraction failed',
        retryable: true,
        code: 'PAGE_CONTENT_ERROR'
      };
    }
  },

  /**
   * Get content blocks from the page (universal extraction)
   */
  dom_getContentBlocks: async (args: {
    region?: 'main' | 'header' | 'nav' | 'footer' | 'aside';
    minTextLength?: number;
    maxBlocks?: number;
  }): Promise<ToolResult<Array<{
    id: string;
    text: string;
    tagName: string;
    position: { x: number; y: number; width: number; height: number };
    clickable: boolean;
    links: Array<{ text: string; href: string }>;
    region: string;
  }>>> => {
    try {
      const minTextLength = args.minTextLength || 20;
      const maxBlocks = args.maxBlocks || 50;
      
      // Find content container based on region
      let container = document.body;
      if (args.region) {
        const regionElement = document.querySelector(
          args.region === 'main' ? 'main, [role="main"]' :
          args.region === 'header' ? 'header, [role="banner"]' :
          args.region === 'nav' ? 'nav, [role="navigation"]' :
          args.region === 'footer' ? 'footer, [role="contentinfo"]' :
          args.region === 'aside' ? 'aside, [role="complementary"]' : 'body'
        );
        if (regionElement) container = regionElement as HTMLElement;
      }
      
      console.log(`🔍 Getting content blocks from ${container.tagName} (region: ${args.region || 'body'})`);
      
      // Find all elements with meaningful text content
      const contentElements = Array.from(container.querySelectorAll('*'))
        .filter(el => {
          const element = el as HTMLElement;
          
          // Skip certain elements
          if (element.matches('script, style, noscript, meta, link, head, title')) {
            return false;
          }
          
          // Skip elements that are just containers for other elements
          if (element.children.length > 3 && element.textContent) {
            const directText = Array.from(element.childNodes)
              .filter(node => node.nodeType === Node.TEXT_NODE)
              .map(node => node.textContent?.trim())
              .join(' ').trim();
            
            if (directText.length < 10) {
              return false; // Mostly a container
            }
          }
          
          const text = element.textContent?.trim() || '';
          return text.length >= minTextLength;
        }) as HTMLElement[];
      
      console.log(`📝 Found ${contentElements.length} content elements`);
      
      // Group elements by visual proximity (simplified approach)
      const contentBlocks: Array<{
        id: string;
        text: string;
        tagName: string;
        position: { x: number; y: number; width: number; height: number };
        clickable: boolean;
        links: Array<{ text: string; href: string }>;
        region: string;
      }> = [];
      
      const processedElements = new Set<HTMLElement>();
      
      for (const element of contentElements.slice(0, maxBlocks)) {
        if (processedElements.has(element)) continue;
        
        try {
          const rect = element.getBoundingClientRect();
          
          // Skip elements that are not visible
          if (rect.width === 0 || rect.height === 0) continue;
          
          // Check if element is clickable
          const computedStyle = window.getComputedStyle(element);
          const isClickable = element.matches('a, button, [onclick], [role="button"]') ||
                             computedStyle.cursor === 'pointer' ||
                             element.hasAttribute('tabindex');
          
          // Extract links within this element
          const links: Array<{ text: string; href: string }> = [];
          const linkElements = element.querySelectorAll('a[href]');
          for (const link of linkElements) {
            const linkText = link.textContent?.trim();
            const href = link.getAttribute('href');
            if (linkText && href && linkText.length <= 100) {
              links.push({ text: linkText, href });
            }
          }
          
          // Determine region
          let region = 'main';
          if (element.closest('nav, [role="navigation"]')) region = 'nav';
          else if (element.closest('header, [role="banner"]')) region = 'header';
          else if (element.closest('footer, [role="contentinfo"]')) region = 'footer';
          else if (element.closest('aside, [role="complementary"]')) region = 'aside';
          
          const blockId = `block_${contentBlocks.length + 1}`;
          
          contentBlocks.push({
            id: blockId,
            text: element.textContent?.trim() || '',
            tagName: element.tagName.toLowerCase(),
            position: {
              x: Math.round(rect.left),
              y: Math.round(rect.top),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            },
            clickable: isClickable,
            links,
            region
          });
          
          processedElements.add(element);
          
        } catch (error) {
          console.warn('Error processing element:', error);
        }
      }
      
      // Sort by position (top to bottom, left to right)
      contentBlocks.sort((a, b) => {
        const yDiff = a.position.y - b.position.y;
        if (Math.abs(yDiff) > 50) return yDiff; // Different rows
        return a.position.x - b.position.x; // Same row, sort by x
      });
      
      console.log(`🎯 Extracted ${contentBlocks.length} content blocks`);
      return { ok: true, data: contentBlocks };
      
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Content blocks extraction failed',
        retryable: true,
        code: 'CONTENT_BLOCKS_ERROR'
      };
    }
  },

  /**
   * Extract data from a collection
   */
  dom_extract: async (args: { 
    collectionId: string; 
    fields: string[] 
  }): Promise<ToolResult<Array<Record<string, string>>>> => {
    try {
      // Primary: Try to get collection element from internal mapping
      let collectionElement = getCollectionElement(args.collectionId);
      
      // Fallback 1: If element is stale (removed from DOM), try re-detection
      if (collectionElement && !document.contains(collectionElement)) {
        console.warn(`Collection element for ${args.collectionId} is stale, trying fallback`);
        collectionElement = null;
      }
      
      // Fallback 2: Re-detect collections using heuristics
      if (!collectionElement) {
        collectionElement = findCollectionFallback(args.collectionId);
        if (collectionElement) {
          console.log(`Found fallback collection for ${args.collectionId}`);
        }
      }
      
      if (!collectionElement) {
        return {
          ok: false,
          error: `Collection with ID ${args.collectionId} not found. Try refreshing the page data.`,
          retryable: true,
          code: 'COLLECTION_NOT_FOUND'
        };
      }

      // Extract data from collection items
      const items = Array.from(collectionElement.children);
      console.log(`🔍 Extracting from collection ${args.collectionId}: found ${items.length} child items`);
      console.log(`📦 Collection element:`, {
        tagName: collectionElement.tagName,
        className: collectionElement.className,
        innerHTML: collectionElement.innerHTML.substring(0, 200) + '...'
      });
      
      const extractedData: Array<Record<string, string>> = [];

      for (const item of items.slice(0, 100)) { // Limit to 100 items
        const itemData: Record<string, string> = {};
        
        for (const field of args.fields) {
          const fieldValue = extractFieldFromItem(item, field);
          itemData[field] = fieldValue;
          console.log(`  📝 Field "${field}": "${fieldValue}"`);
        }
        
        // Only include items with at least one non-empty field
        if (Object.values(itemData).some(value => value.trim())) {
          extractedData.push(itemData);
          console.log(`  ✅ Added item:`, itemData);
        } else {
          console.log(`  ❌ Skipped empty item:`, itemData);
        }
      }

      console.log(`🎯 Final extracted data: ${extractedData.length} items`);
      return { ok: true, data: extractedData };
      
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Extract failed',
        retryable: true,
        code: 'EXTRACT_ERROR'
      };
    }
  },

  /**
   * Navigate to a URL in the current tab
   */
  navigate: async (args: { url: string }): Promise<ToolResult<{ url: string; title: string }>> => {
    try {
      console.log(`🧭 Navigating to: ${args.url}`);
      
      // Navigate to the URL in the current tab
      window.location.href = args.url;
      
      // Wait a moment for navigation to start
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        ok: true,
        data: {
          url: window.location.href,
          title: document.title
        }
      };
    } catch (error) {
      console.error('Navigate tool failed:', error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Navigation failed',
        retryable: true
      };
    }
  }
};

/**
 * Fallback function to find collections when primary lookup fails
 * Uses multiple strategies to find the most likely collection container
 */
function findCollectionFallback(collectionId: string): HTMLElement | null {
  const candidates: { element: HTMLElement; score: number }[] = [];
  
  // Strategy 1: Traditional list/grid patterns (prioritize data tables)
  const traditionalCandidates = document.querySelectorAll(
    'table, tbody, [role="grid"], [role="list"], .grid, .list, .items, .results, ul, ol'
  );
  
  for (const candidate of traditionalCandidates) {
    const element = candidate as HTMLElement;
    if (element.children.length >= 2) {
      // Heavily favor tables and tbody elements over lists
      let score = element.children.length * 5;
      if (element.tagName === 'TABLE' || element.tagName === 'TBODY') {
        score *= 10; // Much higher priority for table elements
      }
      // Penalize navigation-like elements
      if (element.matches('.sidebar, nav, [role="navigation"]') || 
          element.closest('.sidebar, nav, [role="navigation"]')) {
        score *= 0.1; // Heavy penalty for navigation elements
      }
      candidates.push({ element, score });
    }
  }
  
  // Strategy 2: Containers with many clickable children
  const clickableElements = [
    ...Array.from(document.querySelectorAll('a, button, [onclick], [role="button"], [tabindex]')),
    ...Array.from(document.querySelectorAll('div, span, li, section, article')).filter(el => {
      const element = el as HTMLElement;
      try {
        const computedStyle = window.getComputedStyle(element);
        return computedStyle.cursor === 'pointer' && 
               !element.matches('a, button') &&
               element.textContent && element.textContent.trim().length > 0;
      } catch {
        return false;
      }
    })
  ] as HTMLElement[];
  
  const containers = document.querySelectorAll('div, section, article, main');
  for (const container of containers) {
    const element = container as HTMLElement;
    const childClickables = clickableElements.filter(clickable => element.contains(clickable));
    
    if (childClickables.length >= 3) {
      // Prefer containers where clickables are more directly contained
      const directChildren = Array.from(element.children) as HTMLElement[];
      const relevantChildren = directChildren.filter(child => 
        childClickables.some(clickable => child.contains(clickable) || child === clickable)
      );
      
      if (relevantChildren.length >= 2) {
        const score = relevantChildren.length * 5 + childClickables.length;
        candidates.push({ element, score });
      }
    }
  }
  
  // Strategy 3: Find containers with repeated similar content structure
  const allContainers = document.querySelectorAll('div, section');
  for (const container of allContainers) {
    const element = container as HTMLElement;
    const children = Array.from(element.children) as HTMLElement[];
    
    if (children.length >= 3) {
      // Check if children have similar structure (same tag names, similar content lengths)
      const tagNames = children.map(child => child.tagName);
      const uniqueTags = new Set(tagNames);
      
      if (uniqueTags.size <= 2) { // Mostly uniform structure
        const avgTextLength = children.reduce((sum, child) => 
          sum + (child.textContent?.length || 0), 0) / children.length;
        
        if (avgTextLength > 10) { // Has meaningful content
          candidates.push({ element, score: children.length * 3 });
        }
      }
    }
  }
  
  // Return the highest scoring candidate
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].element;
  }
  
  return null;
}

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
 * Extract text content from an element while preserving proper spacing
 */
function extractTextWithSpacing(element: Element): string {
  // Clone the element to avoid modifying the original
  const clone = element.cloneNode(true) as Element;
  
  // Remove script, style, and other non-content elements that can contain code
  const unwantedElements = clone.querySelectorAll('script, style, noscript, meta, link, head');
  unwantedElements.forEach(el => el.remove());
  
  // Add spaces around block elements to prevent text concatenation
  const blockElements = clone.querySelectorAll('div, p, li, tr, td, th, h1, h2, h3, h4, h5, h6, section, article, nav, header, footer, main, aside');
  blockElements.forEach(el => {
    // Add space before and after block elements
    if (el.previousSibling && el.previousSibling.nodeType === Node.TEXT_NODE) {
      if (!el.previousSibling.textContent?.endsWith(' ')) {
        el.insertAdjacentText('beforebegin', ' ');
      }
    }
    if (el.nextSibling && el.nextSibling.nodeType === Node.TEXT_NODE) {
      if (!el.nextSibling.textContent?.startsWith(' ')) {
        el.insertAdjacentText('afterend', ' ');
      }
    }
  });
  
  // Get text content and clean up
  let text = clone.textContent || '';
  
  // Clean up the text more aggressively
  text = text
    .replace(/\s+/g, ' ')  // Normalize all whitespace to single spaces
    .replace(/[^\x20-\x7E]/g, ' ')  // Replace non-printable characters with spaces
    .replace(/\s+/g, ' ')  // Normalize whitespace again after replacements
    .trim();
  
  // Prevent extremely long text that can cause issues
  if (text.length > 5000) {
    console.warn('⚠️ Text content too long, truncating:', text.length);
    text = text.substring(0, 5000) + '... [content truncated for safety]';
  }
  
  return text;
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
      
    case 'text':
      // For table rows, get all cell text
      if (item.tagName === 'TR') {
        const cells = item.querySelectorAll('td');
        const cellTexts = Array.from(cells).map(cell => cell.textContent?.trim()).filter(text => text);
        return cellTexts.join(' | ');
      }
      // For other elements, get all text content
      return item.textContent?.trim() || '';
      
    default:
      // For table rows, try to get cell content by index or pattern
      if (item.tagName === 'TR') {
        const cells = item.querySelectorAll('td');
        // Try to find relevant cell content
        for (const cell of cells) {
          const cellText = cell.textContent?.trim() || '';
          // Look for email patterns for member data
          if (field.toLowerCase().includes('email') && cellText.includes('@')) {
            return cellText;
          }
          // Look for name-like patterns
          if (field.toLowerCase().includes('name') && cellText && !cellText.includes('@') && cellText.length > 2) {
            return cellText;
          }
          // Return first non-empty cell for generic fields
          if (cellText && field === 'text') {
            return cellText;
          }
        }
        // If no specific match, return first non-empty cell
        for (const cell of cells) {
          const cellText = cell.textContent?.trim() || '';
          if (cellText) return cellText;
        }
      }
      
      // Generic field extraction by class or data attribute
      const fieldElement = item.querySelector(`.${field}, [data-field="${field}"]`);
      return fieldElement?.textContent?.trim() || '';
  }
}
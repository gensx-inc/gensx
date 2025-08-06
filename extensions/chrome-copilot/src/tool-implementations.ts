// Chrome Extension Tool Implementations
// Based on examples/copilot/src/components/copilot/tool-implementations.ts

import $ from 'jquery';
import { finder } from '@medv/finder';
import { InferToolParams, InferToolResult } from '@gensx/core';
import Europa from 'europa';

import { toolbox } from '../shared/toolbox';

const europa = new Europa();

type OptionalPromise<T> = T | Promise<T>;

// Tool implementations for Chrome extension context
export const toolImplementations: { [key in keyof typeof toolbox]: (params: InferToolParams<typeof toolbox, key>) => OptionalPromise<InferToolResult<typeof toolbox, key>> } = {
  fetchPageText: () => {
    const markdown = europa.convert(document.querySelector('html')?.cloneNode(true) as HTMLElement);

    return {
      success: true,
      url: window.location.href ?? "unknown",
      content: markdown,
    };
  },

  getCurrentUrl: () => {
    return {
      success: true,
      url: window.location.href ?? "unknown",
    };
  },

  inspectElements: async (params) => {
    try {
      const inspections = params.elements.map((elementParams: any) => {
        try {
          const elements = $(elementParams.selector);
          const count = elements.length;

          if (count === 0) {
            return {
              selector: elementParams.selector,
              success: false,
              count: 0,
              elements: [],
              error: `No elements found with selector: ${elementParams.selector}`,
            };
          }

          const elementData = elements
            .map(function (this: HTMLElement, index: number) {
              const $el = $(this);
              const data: {
                text?: string;
                value?: string;
                attributes?: Record<string, string>;
                css?: Record<string, string>;
                data?: Record<string, string>;
                summary?: string;
                children?: Array<{
                  tag: string;
                  selector: string;
                  text?: string;
                  count?: number;
                }>;
                index: number;
              } = { index };

              // By default, provide concise summary instead of full text/html
              if (!elementParams.properties) {
                // Default behavior: provide useful summary
                const text = $el.text().trim();
                const tagName = this.tagName.toLowerCase();
                const value = $el.val() as string;

                // Create a concise summary
                let summary = `${tagName}`;
                if (value && ['input', 'textarea', 'select'].includes(tagName)) {
                  summary += ` (value: "${value.length > 50 ? value.substring(0, 47) + '...' : value}")`;
                } else if (text) {
                  summary += `: "${text.length > 100 ? text.substring(0, 97) + '...' : text}"`;
                }

                // Add key attributes for context
                const id = $el.attr('id');
                const className = $el.attr('class');
                const role = $el.attr('role');
                const ariaLabel = $el.attr('aria-label');

                if (id) summary += ` #${id}`;
                if (className) {
                  const classes = className.split(' ').slice(0, 3).join(' '); // First 3 classes
                  summary += ` .${classes}${className.split(' ').length > 3 ? '...' : ''}`;
                }
                if (role) summary += ` [role=${role}]`;
                if (ariaLabel) summary += ` [aria-label="${ariaLabel.substring(0, 30)}${ariaLabel.length > 30 ? '...' : ''}"]`;

                data.summary = summary;

                // Add children summary
                const childrenSummary: Array<{
                  tag: string;
                  selector: string;
                  text?: string;
                  count?: number;
                }> = [];

                const childCounts = new Map<string, number>();

                $el.children().each(function(this: HTMLElement) {
                  const childTag = this.tagName.toLowerCase();
                  const currentCount = childCounts.get(childTag) || 0;
                  childCounts.set(childTag, currentCount + 1);

                  // Only include first few of each type to avoid overwhelming output
                  if (currentCount < 3) {
                    const $child = $(this);
                    const childText = $child.text().trim();
                    childrenSummary.push({
                      tag: childTag,
                      selector: getUniqueSelector(this),
                      text: childText.length > 50 ? childText.substring(0, 47) + '...' : childText || undefined,
                    });
                  }
                });

                // Add count summaries for elements with many children
                childCounts.forEach((count, tag) => {
                  if (count > 3) {
                    const existing = childrenSummary.find(c => c.tag === tag && c.count === undefined);
                    if (existing) {
                      existing.count = count;
                    } else {
                      childrenSummary.push({
                        tag,
                        selector: `${elementParams.selector} > ${tag}`,
                        count: count,
                      });
                    }
                  }
                });

                data.children = childrenSummary.length > 0 ? childrenSummary : undefined;

              } else {
                // Specific properties requested (HTML option removed)
                if (elementParams.properties.includes("text")) {
                  data.text = $el.text();
                }
                if (elementParams.properties.includes("value")) {
                  data.value = $el.val() as string | undefined;
                }
                // Note: HTML option has been removed for cleaner output
              }
              if (elementParams.properties?.includes("attr")) {
                if (elementParams.attributeName) {
                  const attrValue = $el.attr(elementParams.attributeName);
                  data.attributes = {
                    [elementParams.attributeName]: (attrValue?.toString() ?? ""),
                  };
                } else {
                  const attrs: Record<string, string> = {};
                  $.each(this.attributes, function (this: Attr) {
                    if (this.specified) {
                      attrs[this.name] = this.value;
                    }
                  });
                  data.attributes = attrs;
                }
              }
              if (elementParams.properties?.includes("css")) {
                if (elementParams.cssProperty) {
                  const cssValue = $el.css(elementParams.cssProperty);
                  data.css = {
                    [elementParams.cssProperty]: (cssValue?.toString() ?? ""),
                  };
                } else {
                  data.css = {};
                }
              }
              if (elementParams.properties?.includes("data")) {
                data.data = $el.data() as Record<string, string>;
              }

              return data;
            })
            .get();

          return {
            selector: elementParams.selector,
            success: true,
            count,
            elements: elementData,
          };
        } catch (error) {
          return {
            selector: elementParams.selector,
            success: false,
            count: 0,
            elements: [],
            error: error instanceof Error ? error.message : String(error),
          };
        }
      });

      const successCount = inspections.filter((i: { success: boolean; }) => i.success).length;
      return {
        success: successCount > 0,
        inspections,
        message: `Inspected ${successCount} of ${params.elements.length} element groups`,
      };
    } catch (error) {
      return {
        success: false,
        inspections: [],
        message: error instanceof Error ? error.message : String(error),
      };
    }
  },

  clickElements: async (params: any) => {
    try {
      const results = [];

      for (let i = 0; i < params.elements.length; i++) {
        const elementParams = params.elements[i];
        try {
          // Apply automatic delay between operations for React state (except first)
          if (i > 0) {
            await new Promise((resolve) => setTimeout(resolve, 150));
          }

          // Apply additional delay if specified
          if (elementParams.delay && elementParams.delay > 0) {
            await new Promise((resolve) =>
              setTimeout(resolve, elementParams.delay),
            );
          }

          const elements = $(elementParams.selector);
          if (elements.length === 0) {
            results.push({
              selector: elementParams.selector,
              clicked: false,
              error: `No elements found with selector: ${elementParams.selector}`,
            });
            continue;
          }

          const index = elementParams.index || 0;
          if (index >= elements.length) {
            results.push({
              selector: elementParams.selector,
              clicked: false,
              error: `Index ${index} out of bounds (found ${elements.length} elements)`,
            });
            continue;
          }

          const element = elements.eq(index);
          const nativeElement = element[0] as HTMLElement;

          // Check if element might not be interactive and add warnings
          const warnings: string[] = [];
          const interactivityCheck = checkElementInteractivity(nativeElement);

          if (!interactivityCheck.isInteractive) {
            warnings.push(`Element may not be interactive: ${interactivityCheck.reason}`);
          }

          // Simple click implementation - native click() works for React and most cases
          nativeElement.click();

          results.push({
            selector: elementParams.selector,
            clicked: true,
            warnings: warnings.length > 0 ? warnings : undefined,
          });
        } catch (error) {
          results.push({
            selector: elementParams.selector,
            clicked: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const clickedCount = results.filter((r) => r.clicked).length;
      const elementsNotFound = results.filter((r) => !r.clicked && r.error?.includes("No elements found")).length;

      // Success only if we clicked at least one element AND no elements were missing
      const success = clickedCount > 0 && elementsNotFound === 0;

      let message = `Clicked ${clickedCount} of ${params.elements.length} elements`;
      if (elementsNotFound > 0) {
        message += `, ${elementsNotFound} elements not found`;
      }

      return {
        success,
        clicks: results,
        message,
      };
    } catch (error) {
      return {
        success: false,
        clicks: [],
        message: error instanceof Error ? error.message : String(error),
      };
    }
  },

  fillTextInputs: async (params: any) => {
    try {
      const results = [];

      for (let i = 0; i < params.inputs.length; i++) {
        const input = params.inputs[i];

        // Apply automatic delay between operations for React state (except first)
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 150));
        }
        try {
          const $el = $(input.selector);
          if ($el.length === 0) {
            results.push({
              selector: input.selector,
              filled: false,
              error: "Element not found",
            });
            continue;
          }

          // Get the native DOM element
          const element = $el[0] as HTMLInputElement | HTMLSelectElement;
          const tagName = element.tagName.toLowerCase();

          // Only handle text inputs and textareas
          if (
            element instanceof HTMLInputElement &&
            (element.type === "checkbox" || element.type === "radio")
          ) {
            results.push({
              selector: input.selector,
              filled: false,
              error:
                "Use toggleCheckboxes for checkboxes and radio buttons",
            });
            continue;
          } else if (tagName === "select") {
            results.push({
              selector: input.selector,
              filled: false,
              error: "Use selectOptions for dropdown/select elements",
            });
            continue;
          } else {
            // For text inputs and textareas only
            const inputElement = element as
              | HTMLInputElement
              | HTMLTextAreaElement;

            // Use native value setter to bypass React's controlled component
            if (inputElement instanceof HTMLInputElement) {
              const nativeInputValueSetter =
                Object.getOwnPropertyDescriptor(
                  window.HTMLInputElement.prototype,
                  "value",
                )?.set;

              if (nativeInputValueSetter) {
                nativeInputValueSetter.call(inputElement, input.value);
              } else {
                inputElement.value = input.value;
              }
            } else if (inputElement instanceof HTMLTextAreaElement) {
              const nativeTextAreaValueSetter =
                Object.getOwnPropertyDescriptor(
                  window.HTMLTextAreaElement.prototype,
                  "value",
                )?.set;

              if (nativeTextAreaValueSetter) {
                nativeTextAreaValueSetter.call(inputElement, input.value);
              } else {
                inputElement.value = input.value;
              }
            } else {
              // Fallback for other elements
              (inputElement as HTMLInputElement).value = input.value;
            }

            // Trigger React's synthetic events
            if (input.triggerEvents !== false) {
              const inputEvent = new Event("input", { bubbles: true });
              inputElement.dispatchEvent(inputEvent);

              const changeEvent = new Event("change", { bubbles: true });
              inputElement.dispatchEvent(changeEvent);
            }
          }

          results.push({
            selector: input.selector,
            filled: true,
          });
        } catch (err) {
          results.push({
            selector: input.selector,
            filled: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      const filledCount = results.filter((r) => r.filled).length;
      return {
        success: filledCount > 0,
        filled: results,
        message: `Filled ${filledCount} of ${params.inputs.length} inputs`,
      };
    } catch (error) {
      return {
        success: false,
        filled: [],
        message: error instanceof Error ? error.message : String(error),
      };
    }
  },

  selectOptions: async (params: any) => {
    try {
      const results = [];

      for (let i = 0; i < params.selects.length; i++) {
        const select = params.selects[i];

        // Apply automatic delay between operations for React state (except first)
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 150));
        }
        try {
          const $el = $(select.selector);
          if ($el.length === 0) {
            results.push({
              selector: select.selector,
              selected: false,
              error: "Element not found",
            });
            continue;
          }

          const element = $el[0];
          if (element.tagName.toLowerCase() !== "select") {
            results.push({
              selector: select.selector,
              selected: false,
              error: "Element is not a select element",
            });
            continue;
          }

          const selectElement = element as HTMLSelectElement;
          selectElement.value = select.value;

          // Trigger React's synthetic events
          if (select.triggerEvents !== false) {
            const changeEvent = new Event("change", { bubbles: true });
            selectElement.dispatchEvent(changeEvent);

            const inputEvent = new Event("input", { bubbles: true });
            selectElement.dispatchEvent(inputEvent);
          }

          results.push({
            selector: select.selector,
            selected: true,
          });
        } catch (err) {
          results.push({
            selector: select.selector,
            selected: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      const selectedCount = results.filter((r) => r.selected).length;
      return {
        success: selectedCount > 0,
        selected: results,
        message: `Selected ${selectedCount} of ${params.selects.length} options`,
      };
    } catch (error) {
      return {
        success: false,
        selected: [],
        message: error instanceof Error ? error.message : String(error),
      };
    }
  },

  toggleCheckboxes: async (params: any) => {
    try {
      const results = [];

      for (let i = 0; i < params.checkboxes.length; i++) {
        const checkbox = params.checkboxes[i];

        // Apply automatic delay between operations for React state (except first)
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 150));
        }
        try {
          const $el = $(checkbox.selector);
          if ($el.length === 0) {
            results.push({
              selector: checkbox.selector,
              toggled: false,
              error: "Element not found",
            });
            continue;
          }

          const element = $el[0];
          if (
            !(element instanceof HTMLInputElement) ||
            (element.type !== "checkbox" && element.type !== "radio")
          ) {
            results.push({
              selector: checkbox.selector,
              toggled: false,
              error: "Element is not a checkbox or radio button",
            });
            continue;
          }

          const currentChecked = element.checked;

          // Only click if we need to change the state
          if (currentChecked !== checkbox.checked) {
            // Use native click to trigger React event handlers
            element.click();
          }

          results.push({
            selector: checkbox.selector,
            toggled: true,
            finalState: element.checked,
          });
        } catch (err) {
          results.push({
            selector: checkbox.selector,
            toggled: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      const toggledCount = results.filter((r) => r.toggled).length;
      return {
        success: toggledCount > 0,
        toggled: results,
        message: `Toggled ${toggledCount} of ${params.checkboxes.length} checkboxes`,
      };
    } catch (error) {
      return {
        success: false,
        toggled: [],
        message: error instanceof Error ? error.message : String(error),
      };
    }
  },

  submitForms: async (params: any) => {
    try {
      const results = [];

      for (const formParams of params.forms) {
        try {
          // Apply delay if specified
          if (formParams.delay && formParams.delay > 0) {
            await new Promise((resolve) =>
              setTimeout(resolve, formParams.delay),
            );
          }

          const forms = $(formParams.selector);
          if (forms.length === 0) {
            results.push({
              selector: formParams.selector,
              submitted: false,
              error: `No forms found with selector: ${formParams.selector}`,
            });
            continue;
          }

          const index = formParams.index || 0;
          if (index >= forms.length) {
            results.push({
              selector: formParams.selector,
              submitted: false,
              error: `Index ${index} out of bounds (found ${forms.length} forms)`,
            });
            continue;
          }

          const form = forms.eq(index);

          // For the todo form, we'll click the submit button which already has proper handlers
          const submitButton = form
            .find(
              'button[type="submit"], input[type="submit"], button:not([type])',
            )
            .first();
          if (submitButton.length > 0) {
            // Simply click the button - let React handle the state update
            submitButton.trigger("click");
            results.push({
              selector: formParams.selector,
              submitted: true,
            });
          } else {
            results.push({
              selector: formParams.selector,
              submitted: false,
              error: `No submit button found in form at index ${index}`,
            });
          }
        } catch (error) {
          results.push({
            selector: formParams.selector,
            submitted: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const submittedCount = results.filter((r) => r.submitted).length;
      return {
        success: submittedCount > 0,
        submissions: results,
        message: `Submitted ${submittedCount} of ${params.forms.length} forms`,
      };
    } catch (error) {
      return {
        success: false,
        submissions: [],
        message: error instanceof Error ? error.message : String(error),
      };
    }
  },

  waitForElements: async (params: any) => {
    try {
      const results = [];

      for (const elementParams of params.elements) {
        try {
          const timeout = elementParams.timeout || 5000;
          const startTime = Date.now();
          let found = false;

          while (Date.now() - startTime < timeout) {
            if ($(elementParams.selector).length > 0) {
              found = true;
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          results.push({
            selector: elementParams.selector,
            found,
            error: found
              ? undefined
              : `Timeout waiting for element: ${elementParams.selector}`,
          });
        } catch (error) {
          results.push({
            selector: elementParams.selector,
            found: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const foundCount = results.filter((r) => r.found).length;
      return {
        success: foundCount > 0,
        waits: results,
        message: `Found ${foundCount} of ${params.elements.length} elements`,
      };
    } catch (error) {
      return {
        success: false,
        waits: [],
        message: error instanceof Error ? error.message : String(error),
      };
    }
  },

  findElementsByText: (params) => {
    const elements = $(`*`).filter((_idx, element) => {
      const $el = $(element);
      const text = $el.text().trim();
      return params.content.some(content => text.includes(content));
    });

    return {
      success: true,
      elements: elements.map((_idx, element) => ({
        selector: getUniqueSelector(element),
      })).toArray(),
    };
  },

  findInteractiveElements: async (params) => {
    try {
      const batchSize = 50; // Process elements in batches to avoid blocking
      const yieldInterval = 10; // Yield every 10 batches
      const startTime = performance.now();

      const processedElements = new Set<HTMLElement>(); // Track processed elements to avoid duplicates
      const elementScores = new Map<HTMLElement, number>(); // Track element "importance" scores

      // Helper function to check if an element has meaningful content (optimized)
      const hasContent = (el: HTMLElement): boolean => {
        const tagName = el.tagName.toLowerCase();

        // Quick checks first
        const text = el.textContent?.trim() || '';
        const ariaLabel = el.getAttribute('aria-label')?.trim() || '';
        const title = el.getAttribute('title')?.trim() || '';
        const alt = el.getAttribute('alt')?.trim() || '';

                // For input elements, check value, placeholder, or aria-label
        if (['input', 'textarea', 'select'].includes(tagName)) {
          const inputEl = el as HTMLInputElement;
          const value = inputEl.value ? String(inputEl.value).trim() : '';
          const placeholder = el.getAttribute('placeholder')?.trim() || '';
          const label = document.querySelector(`label[for="${el.getAttribute('id')}"]`)?.textContent?.trim() || '';

          return !!(value || placeholder || ariaLabel || label);
        }

        // Check for data attributes that might indicate functionality
        const hasDataAttributes = el.getAttribute('data-testid') || el.getAttribute('data-cy') || el.getAttribute('data-action');

        // Check for common icon/visual indicator classes (regex-free check)
        const className = el.getAttribute('class') || '';
        const hasIconClasses = className.includes('icon') || className.includes('fa-') ||
                              className.includes('material-') || className.includes('mdi-') ||
                              className.includes('glyphicon');

        // Check if element itself is an image with alt text
        const isImageWithAlt = tagName === 'img' && alt;

        // Consider element as having content if it has:
        // - Text content, labels, or titles
        // - Is an image with alt text
        // - Has icon classes
        // - Has test/action data attributes
        return !!(text || ariaLabel || title || alt || isImageWithAlt || hasIconClasses || hasDataAttributes);
      };

            // Helper function to calculate element "importance" score
      const calculateScore = (el: HTMLElement): number => {
        let score = 0;
        const tagName = el.tagName.toLowerCase();

        // Higher scores for more interactive elements
        if (['button', 'a', 'input', 'select'].includes(tagName)) score += 10;
        else if (['textarea', 'option'].includes(tagName)) score += 5;
        else score += 1;

        // Bonus for React-style clickable elements
        const className = el.getAttribute('class') || '';
        const hasClickableClasses = className.includes('button') || className.includes('click') ||
                                   className.includes('link') || className.includes('card') ||
                                   className.includes('tile') || className.includes('item');

        if (hasClickableClasses) score += 8;

        // Bonus for elements with click handlers
        if (el.hasAttribute('onclick') || el.hasAttribute('onClick') || el.hasAttribute('data-onclick')) {
          score += 7;
        }

        // Bonus for elements with tabindex (keyboard accessible)
        if (el.hasAttribute('tabindex')) score += 6;

        // Bonus for elements with pointer cursor
        const style = window.getComputedStyle(el);
        if (style.cursor === 'pointer') score += 5;

        // Bonus for visible elements
        if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
          score += 2;
        }

        // Bonus for elements with text content
        if (el.textContent?.trim()) score += 3;

        // Bonus for elements with aria-label or title
        if (el.getAttribute('aria-label') || el.getAttribute('title')) score += 2;

        // Bonus for elements with data attributes
        if (el.getAttribute('data-testid') || el.getAttribute('data-cy')) score += 2;

        return score;
      };

      // Helper function to check if element is a descendant of already processed element
      const isDescendantOfProcessed = (el: HTMLElement): boolean => {
        let parent = el.parentElement;
        while (parent) {
          if (processedElements.has(parent)) {
            return true;
          }
          parent = parent.parentElement;
        }
        return false;
      };

      // Process elements in batches with yielding
      const processElementBatch = async (elements: HTMLElement[], startIndex: number): Promise<void> => {
        const endIndex = Math.min(startIndex + batchSize, elements.length);

        for (let i = startIndex; i < endIndex; i++) {
          const el = elements[i];

          // Skip if already processed or is descendant of processed element
          if (processedElements.has(el) || isDescendantOfProcessed(el)) {
            continue;
          }

          // Quick visibility check
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            continue;
          }

          // Check if element is interactive
          const isInteractive = checkElementInteractivity(el);
          if (!isInteractive.isInteractive) {
            continue;
          }

          // Check if element has content
          if (!hasContent(el)) {
            continue;
          }

          // Calculate score and store element
          const score = calculateScore(el);
          elementScores.set(el, score);
          processedElements.add(el);
        }

        // Yield every few batches to prevent blocking
        if ((startIndex / batchSize) % yieldInterval === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      };

      // Get interactive elements more efficiently
      const interactiveSelectors = "button, input, select, textarea, a, option, datalist, [role='button'], [role='link'], [role='tab'], [role='menuitem'], [role='checkbox'], [role='radio'], [role='option']";
      const interactiveElements = Array.from(document.querySelectorAll(interactiveSelectors)) as HTMLElement[];

            // Get elements with pointer cursor (more targeted approach)
      const clickableElements: HTMLElement[] = [];

      // More efficient approach: target common React patterns
      // Look for divs, spans, and other elements that might be clickable
      const potentialClickableSelectors = [
        'div[onclick]', 'div[onClick]', 'div[data-onclick]',
        'span[onclick]', 'span[onClick]', 'span[data-onclick]',
        'section[onclick]', 'section[onClick]', 'section[data-onclick]',
        'article[onclick]', 'article[onClick]', 'article[data-onclick]',
        'main[onclick]', 'main[onClick]', 'main[data-onclick]',
        'aside[onclick]', 'aside[onClick]', 'aside[data-onclick]',
        // Common React patterns
        '[data-testid*="button"]', '[data-testid*="click"]', '[data-testid*="link"]',
        '[data-cy*="button"]', '[data-cy*="click"]', '[data-cy*="link"]',
        '[class*="button"]', '[class*="clickable"]', '[class*="link"]',
        '[class*="card"]', '[class*="tile"]', '[class*="item"]',
        // Common interactive patterns
        '[tabindex]', '[role="button"]', '[role="link"]', '[role="tab"]',
        '[aria-label*="button"]', '[aria-label*="click"]', '[aria-label*="link"]',
        '[title*="button"]', '[title*="click"]', '[title*="link"]'
      ];

      // Get elements with explicit click handlers or interactive attributes
      for (const selector of potentialClickableSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          for (const el of elements) {
            clickableElements.push(el as HTMLElement);
          }
        } catch (e) {
          // Skip invalid selectors
          continue;
        }
      }

      // For cursor: pointer detection, use a more efficient approach
      // Only check elements that are likely to be interactive based on their context
      const cursorCheckSelectors = [
        'div', 'span', 'section', 'article', 'main', 'aside', 'header', 'footer',
        'li', 'td', 'th', 'figure', 'figcaption'
      ];

      for (const selector of cursorCheckSelectors) {
        const elements = document.querySelectorAll(selector);

        // Process in batches to avoid blocking
        for (let i = 0; i < elements.length; i += batchSize) {
          const batch = Array.from(elements).slice(i, i + batchSize) as HTMLElement[];

          for (const el of batch) {
            // Quick checks before expensive getComputedStyle
            const tagName = el.tagName.toLowerCase();
            const className = el.getAttribute('class') || '';

            // Skip elements that are clearly not interactive
            if (tagName === 'div' && !className.includes('button') &&
                !className.includes('click') && !className.includes('link') &&
                !className.includes('card') && !className.includes('tile') &&
                !className.includes('item') && !el.hasAttribute('onclick') &&
                !el.hasAttribute('onClick') && !el.hasAttribute('tabindex') &&
                !el.hasAttribute('role') && !el.hasAttribute('data-testid') &&
                !el.hasAttribute('data-cy')) {
              continue;
            }

            const style = window.getComputedStyle(el);
            if (style.cursor === 'pointer') {
              clickableElements.push(el);
            }
          }

          // Yield every few batches
          if ((i / batchSize) % yieldInterval === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
      }

      // Combine and deduplicate elements efficiently
      const allCandidates = [...interactiveElements, ...clickableElements];
      const uniqueCandidates = new Set<HTMLElement>();

      for (const el of allCandidates) {
        uniqueCandidates.add(el);
      }

      // Process unique candidates in batches
      const candidatesArray = Array.from(uniqueCandidates);
      for (let i = 0; i < candidatesArray.length; i += batchSize) {
        await processElementBatch(candidatesArray, i);
      }

      // Convert to result format, sorted by score (most important first)
      const sortedElements = Array.from(elementScores.entries())
        .sort((a, b) => b[1] - a[1]) // Sort by score descending
        .map(([el]) => ({
          type: el.tagName.toLowerCase(),
          selector: getUniqueSelector(el),
          text: el.textContent?.trim() ?? "",
          value: (el as HTMLInputElement).value ? String((el as HTMLInputElement).value).trim() : undefined,
          href: (el as HTMLAnchorElement).href,
        }));

      const endTime = performance.now();
      console.log(`findInteractiveElements took ${endTime - startTime}ms to find ${sortedElements.length} elements`);

      return {
        success: true,
        elements: sortedElements,
      };
    } catch (error) {
      return {
        success: false,
        elements: [],
        message: error instanceof Error ? error.message : String(error),
      };
    }
  },

  navigate: async (params) => {
    try {
      const startTime = Date.now();
      const previousUrl = window.location.href;
      const currentOrigin = window.location.origin;

      switch (params.action) {
        case "back":
          if (window.history.length > 1) {
            window.history.back();
          } else {
            return {
              success: false,
              action: params.action,
              currentUrl: previousUrl,
              previousUrl,
              message: "No previous page in history",
              error: "Cannot go back - no previous page available",
            };
          }
          break;

        case "forward":
          window.history.forward();
          break;

        case "path":
          if (!params.path) {
            return {
              success: false,
              action: params.action,
              currentUrl: previousUrl,
              previousUrl,
              message: "No path provided for path navigation",
              error: "Path parameter is required for 'path' action",
            };
          }

          // Validate that path starts with '/'
          if (!params.path.startsWith('/')) {
            return {
              success: false,
              action: params.action,
              currentUrl: previousUrl,
              previousUrl,
              message: "Invalid path format - must start with '/'",
              error: "Path must start with '/' for relative navigation",
            };
          }

          // Construct the full URL with current origin
          const newUrl = currentOrigin + params.path;

          // Use window.location.href for full page navigation to handle different routes
          window.location.href = newUrl;
          break;

        case "url":
          if (!params.url) {
            return {
              success: false,
              action: params.action,
              currentUrl: previousUrl,
              previousUrl,
              message: "No URL provided for URL navigation",
              error: "URL parameter is required for 'url' action",
            };
          }

          // Validate URL format
          try {
            new URL(params.url);
          } catch (urlError) {
            return {
              success: false,
              action: params.action,
              currentUrl: previousUrl,
              previousUrl,
              message: "Invalid URL format",
              error: "URL must be a valid absolute URL with protocol (e.g., https://example.com)",
            };
          }

          // Navigate to the new URL (can be different domain)
          window.location.href = params.url;
          break;

        default:
          return {
            success: false,
            action: params.action,
            currentUrl: previousUrl,
            previousUrl,
            message: `Unknown navigation action: ${params.action}`,
            error: `Invalid action: ${params.action}. Must be 'back', 'forward', 'path', or 'url'`,
          };
      }

      // Wait for navigation to complete if requested
      if (params.waitForLoad) {
        const timeout = params.timeout || 5000;
        const pollInterval = 100;
        let elapsed = 0;

        // For back/forward, wait a bit for the navigation to start
        if (params.action === 'back' || params.action === 'forward') {
          await new Promise((resolve) => setTimeout(resolve, 200));

          // Poll for URL change or timeout
          while (elapsed < timeout) {
            if (window.location.href !== previousUrl) {
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, pollInterval));
            elapsed += pollInterval;
          }
        } else {
          // For path/url navigation, the page will reload so we can't wait here
          // The navigation is asynchronous and the page will change
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      const loadTime = Date.now() - startTime;
      const currentUrl = window.location.href;

      return {
        success: true,
        action: params.action,
        currentUrl,
        previousUrl,
        loadTime,
        message: `Successfully initiated ${params.action} navigation${params.action === 'path' ? ` to ${params.path}` : params.action === 'url' ? ` to ${params.url}` : ''}`,
      };
    } catch (error) {
      return {
        success: false,
        action: params.action,
        currentUrl: window.location.href,
        previousUrl: window.location.href,
        message: `Navigation failed: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  getGeolocation: async (params) => {
    try {
      // Send geolocation request to background script which will use offscreen document
      const response = await chrome.runtime.sendMessage({
        type: 'GET_GEOLOCATION',
        data: params
      });

      if (response.success) {
        return response.data;
      } else {
        return {
          success: false,
          error: response.error || 'Geolocation request failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  },

  openTab: async (params) => {
    // This implementation should never be called as openTab is handled by the background script
    // This is just a placeholder to satisfy TypeScript
    return {
      success: false,
      error: 'openTab should be handled by background script, not content script'
    };
  },
};

// Helper to check if an element is likely to be interactive
const checkElementInteractivity = (element: HTMLElement): { isInteractive: boolean; reason?: string } => {
  if (!element) {
    return { isInteractive: false, reason: "Element is null or undefined" };
  }

  const tagName = element.tagName.toLowerCase();
  const $element = $(element);

  // Obviously interactive elements
  const interactiveTags = ['button', 'a', 'input', 'select', 'textarea', 'option'];
  if (interactiveTags.includes(tagName)) {
    return { isInteractive: true };
  }

  // Check for interactive roles
  const role = element.getAttribute('role');
  const interactiveRoles = ['button', 'link', 'tab', 'menuitem', 'checkbox', 'radio', 'option'];
  if (role && interactiveRoles.includes(role)) {
    return { isInteractive: true };
  }

  // Check for click handlers
  if (element.onclick || element.getAttribute('onclick')) {
    return { isInteractive: true };
  }

  // Check CSS cursor
  const cursor = $element.css('cursor');
  if (cursor === 'pointer') {
    return { isInteractive: true };
  }

  // Check for common data attributes that suggest interactivity
  const interactiveDataAttrs = ['data-testid', 'data-cy', 'data-click', 'data-action', 'data-handler'];
  if (interactiveDataAttrs.some(attr => element.hasAttribute(attr))) {
    return { isInteractive: true };
  }

  // Check if element is disabled
  if (element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true') {
    return { isInteractive: false, reason: "Element is disabled" };
  }

  // Check if element is hidden
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return { isInteractive: false, reason: "Element is hidden" };
  }

  // Check if element has zero dimensions
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    return { isInteractive: false, reason: "Element has zero dimensions" };
  }

  // For generic elements without obvious interactive indicators
  if (['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'section', 'article'].includes(tagName)) {
    return { isInteractive: false, reason: `${tagName} element without clear interactive indicators` };
  }

  // Default to potentially interactive for other elements
  return { isInteractive: true };
};


// Helper to get unique selector using the finder library
const getUniqueSelector = (el: HTMLElement): string => {
  try {
    return finder(el, {
      timeoutMs: 500,
    });
  } catch (error) {
    console.warn('Finder library failed, using fallback selector:', error);
    // Fallback to simple selector if finder fails
    if (el.id) {
      return `#${CSS.escape(el.id)}`;
    }

    // Try data-testid first
    const testId = el.getAttribute('data-testid');
    if (testId) {
      return `[data-testid="${CSS.escape(testId)}"]`;
    }

    // Fall back to tag + nth-child
    const tagName = el.tagName.toLowerCase();
    if (el.parentElement) {
      const siblings = Array.from(el.parentElement.children).filter(child =>
        child.tagName.toLowerCase() === tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(el) + 1;
        return `${tagName}:nth-child(${index})`;
      }
    }

    return tagName;
  }
};

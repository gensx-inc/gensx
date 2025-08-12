// Chrome Extension Tool Implementations
// Based on examples/copilot/src/components/copilot/tool-implementations.ts

import $ from "jquery";
import { finder } from "@medv/finder";
import { InferToolParams, InferToolResult } from "@gensx/core";
import Europa from "europa";
import html2canvas from "html2canvas-pro";

import { toolbox } from "../../shared/toolbox";

const europa = new Europa({
  absolute: true,
  inline: true,
});

type OptionalPromise<T> = T | Promise<T>;

// Tool implementations for Chrome extension context
export const toolImplementations: {
  [key in keyof typeof toolbox]: (
    params: InferToolParams<typeof toolbox, key>,
  ) => OptionalPromise<InferToolResult<typeof toolbox, key>>;
} = {
  // fetchPageText: () => {
  //   // Clone the HTML to avoid modifying the original DOM
  //   const htmlClone = document.querySelector('html')?.cloneNode(true) as HTMLElement;
  //   if (!htmlClone) {
  //     return {
  //       success: false,
  //       url: window.location.href ?? "unknown",
  //       content: "",
  //       error: "Could not access HTML content",
  //     };
  //   }

  //   // Pre-process HTML to reduce content size and noise
  //   preprocessHtmlForMarkdown(htmlClone);

  //   // Convert to markdown
  //   const markdown = europa.convert(htmlClone);

  //   // No content truncation here - let the chunking approach handle large content
  //   return {
  //     success: true,
  //     url: window.location.href ?? "unknown",
  //     content: markdown,
  //   };
  // },

  fetchPageHtml: () => {
    try {
      const bodyEl = document.body;
      if (!bodyEl) {
        return {
          success: false,
          url: window.location.href ?? "unknown",
          content: "",
          error: "Could not access HTML content",
        };
      }

      // Clone to avoid mutating the live DOM
      const bodyClone = bodyEl.cloneNode(true) as HTMLElement;

      // Preprocess for LLM consumption: remove <style> tags, truncate long href/style attributes
      preprocessHtmlForLlm(bodyClone);

      const content = bodyClone.innerHTML;

      return {
        success: true,
        url: window.location.href ?? "unknown",
        content,
      };
    } catch (error) {
      return {
        success: false,
        url: window.location.href ?? "unknown",
        content: "",
        error: error instanceof Error ? error.message : String(error),
      };
    }
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

          let elementData = elements
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
                if (
                  value &&
                  ["input", "textarea", "select"].includes(tagName)
                ) {
                  summary += ` (value: "${value.length > 50 ? value.substring(0, 47) + "..." : value}")`;
                } else if (text) {
                  summary += `: "${text.length > 100 ? text.substring(0, 97) + "..." : text}"`;
                }

                // Add key attributes for context
                const id = $el.attr("id");
                const className = $el.attr("class");
                const role = $el.attr("role");
                const ariaLabel = $el.attr("aria-label");

                if (id) summary += ` #${id}`;
                if (className) {
                  const classes = className.split(" ").slice(0, 3).join(" "); // First 3 classes
                  summary += ` .${classes}${className.split(" ").length > 3 ? "..." : ""}`;
                }
                if (role) summary += ` [role=${role}]`;
                if (ariaLabel)
                  summary += ` [aria-label="${ariaLabel.substring(0, 30)}${ariaLabel.length > 30 ? "..." : ""}"]`;

                data.summary = summary;

                // Add children summary
                const childrenSummary: Array<{
                  tag: string;
                  selector: string;
                  text?: string;
                  count?: number;
                }> = [];

                const childCounts = new Map<string, number>();

                $el.children().each(function (this: HTMLElement) {
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
                      text:
                        childText.length > 50
                          ? childText.substring(0, 47) + "..."
                          : childText || undefined,
                    });
                  }
                });

                // Add count summaries for elements with many children
                childCounts.forEach((count, tag) => {
                  if (count > 3) {
                    const existing = childrenSummary.find(
                      (c) => c.tag === tag && c.count === undefined,
                    );
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

                data.children =
                  childrenSummary.length > 0 ? childrenSummary : undefined;
              } else {
                // Specific properties requested (HTML option removed)
                if (elementParams.properties.includes("text")) {
                  data.text = $el.text().trim();
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
                    [elementParams.attributeName]: attrValue?.toString() ?? "",
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
                    [elementParams.cssProperty]: cssValue?.toString() ?? "",
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

          // Filter out elements with empty requested properties to reduce noise
          if (elementParams.properties && elementParams.properties.length > 0) {
            elementData = elementData.filter((element) => {
              // Check if at least one requested property has meaningful content
              if (
                elementParams.properties.includes("text") &&
                element.text &&
                element.text.length > 0
              ) {
                return true;
              }
              if (
                elementParams.properties.includes("value") &&
                element.value &&
                element.value.length > 0
              ) {
                return true;
              }
              if (
                elementParams.properties.includes("attr") &&
                element.attributes &&
                Object.keys(element.attributes).length > 0
              ) {
                return true;
              }
              if (
                elementParams.properties.includes("css") &&
                element.css &&
                Object.keys(element.css).length > 0
              ) {
                return true;
              }
              if (
                elementParams.properties.includes("data") &&
                element.data &&
                Object.keys(element.data).length > 0
              ) {
                return true;
              }
              return false;
            });
          }

          return {
            selector: elementParams.selector,
            success: elementData.length > 0,
            count: elementData.length,
            elements: elementData,
            originalCount: count > elementData.length ? count : undefined,
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

      const successCount = inspections.filter(
        (i: { success: boolean }) => i.success,
      ).length;
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
            warnings.push(
              `Element may not be interactive: ${interactivityCheck.reason}`,
            );
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
      const elementsNotFound = results.filter(
        (r) => !r.clicked && r.error?.includes("No elements found"),
      ).length;

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
              error: "Use toggleCheckboxes for checkboxes and radio buttons",
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

            // Check if element is disabled or readonly
            if (inputElement.disabled) {
              results.push({
                selector: input.selector,
                filled: false,
                error: "Element is disabled",
              });
              continue;
            }

            if (inputElement.readOnly) {
              results.push({
                selector: input.selector,
                filled: false,
                error: "Element is readonly",
              });
              continue;
            }

            // Check if element is visible and interactable
            if (
              inputElement.offsetParent === null &&
              inputElement.style.position !== "fixed"
            ) {
              results.push({
                selector: input.selector,
                filled: false,
                error: "Element is not visible",
              });
              continue;
            }

            const originalValue = inputElement.value;
            const targetValue = input.value;

            // Use native value setter to bypass React's controlled component
            if (inputElement instanceof HTMLInputElement) {
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                "value",
              )?.set;

              if (nativeInputValueSetter) {
                nativeInputValueSetter.call(inputElement, targetValue);
              } else {
                inputElement.value = targetValue;
              }
            } else if (inputElement instanceof HTMLTextAreaElement) {
              const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype,
                "value",
              )?.set;

              if (nativeTextAreaValueSetter) {
                nativeTextAreaValueSetter.call(inputElement, targetValue);
              } else {
                inputElement.value = targetValue;
              }
            } else {
              // Fallback for other elements
              (inputElement as HTMLInputElement).value = targetValue;
            }

            // Trigger React's synthetic events
            if (input.triggerEvents !== false) {
              const inputEvent = new Event("input", { bubbles: true });
              inputElement.dispatchEvent(inputEvent);

              const changeEvent = new Event("change", { bubbles: true });
              inputElement.dispatchEvent(changeEvent);
            }

            // Wait a moment for events to process and verify the value was actually set
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Verify the value was actually set
            const actualValue = inputElement.value;
            const wasSuccessfullyFilled = actualValue === targetValue;

            results.push({
              selector: input.selector,
              filled: wasSuccessfullyFilled,
              error: wasSuccessfullyFilled
                ? undefined
                : `Value not set correctly. Expected: "${targetValue}", Got: "${actualValue}"`,
            });
          }
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
    const foundElements = new Map<
      HTMLElement,
      { text: string; matchedTerm: string }
    >();
    const maxResults = 30; // Reasonable limit for performance
    const minTextLength = 2; // Skip very short text content

    try {
      // Pre-compile search patterns for better performance
      const searchTerms = params.content.map((text) =>
        text.toLowerCase().trim(),
      );

      // Find all elements that contain text
      const allElements = document.querySelectorAll("*");

      searchTerms.forEach((searchTerm) => {
        if (foundElements.size >= maxResults) return;

        Array.from(allElements).forEach((element) => {
          if (foundElements.size >= maxResults) return;

          const el = element as HTMLElement;

          // Skip elements that are not visible
          if (
            !el.offsetParent &&
            el.style.position !== "fixed" &&
            el.style.display !== "contents"
          ) {
            return;
          }

          // Skip script, style, and other non-content elements
          if (
            ["SCRIPT", "STYLE", "NOSCRIPT", "META", "LINK", "HEAD"].includes(
              el.tagName,
            )
          ) {
            return;
          }

          // Get only the direct text content of this element (not from children)
          const directTextContent = getDirectTextContent(el);

          if (!directTextContent || directTextContent.length < minTextLength) {
            return;
          }

          // Check if the direct text content contains our search term
          if (directTextContent.toLowerCase().includes(searchTerm)) {
            // Make sure we haven't already found this element with a different term
            if (!foundElements.has(el)) {
              foundElements.set(el, {
                text: directTextContent.trim(),
                matchedTerm: searchTerm,
              });
            }
          }
        });
      });

      // Convert to result format
      const elements = Array.from(foundElements.entries()).map(
        ([element, data]) => ({
          selector: getUniqueSelector(element),
          text: data.text,
          matchedTerm: data.matchedTerm,
          elementType: element.tagName.toLowerCase(),
        }),
      );

      return {
        success: true,
        elements,
        totalFound: elements.length,
      };
    } catch (error) {
      console.error("findElementsByText error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        elements: [],
      };
    }

    // Helper function to get only direct text content (not from children)
    function getDirectTextContent(element: HTMLElement): string {
      let textContent = "";

      // Iterate through all child nodes
      for (const node of element.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          // This is a text node - add its content
          textContent += node.textContent || "";
        }
      }

      return textContent.trim();
    }
  },

  findInteractiveElements: async (params) => {
    try {
      // Extract parameters (tabId is not used in content script context, textToFilter is used for post-processing)
      const { tabId, textToFilter } = params;
      console.log(
        "findInteractiveElements called with tabId:",
        tabId,
        "textToFilter:",
        textToFilter,
      );

      const batchSize = 20; // Smaller batches for more responsive UI
      const yieldInterval = 2; // Yield every 2 batches (every 40 elements)
      const maxResults = 100; // Early termination limit
      const startTime = performance.now();

      const foundElements = new Set<HTMLElement>(); // Track found elements to avoid duplicates
      const elementScores = new Map<HTMLElement, number>(); // Track element "importance" scores
      let processedCount = 0;

      // Helper function to yield control back to the browser
      const yieldToBrowser = async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      };

      // Simplified content check for performance
      const hasMinimalContent = (el: HTMLElement): boolean => {
        const tagName = el.tagName.toLowerCase();

        // Always include form elements and links
        if (["button", "a", "input", "select", "textarea"].includes(tagName)) {
          return true;
        }

        // Quick checks for other elements
        const text = el.textContent?.trim();
        if (text && text.length > 0) return true;

        // Check for important attributes
        const hasImportantAttrs =
          el.hasAttribute("onclick") ||
          el.hasAttribute("data-testid") ||
          el.hasAttribute("aria-label") ||
          el.hasAttribute("title") ||
          el.getAttribute("role") === "button";

        return hasImportantAttrs;
      };

      // Simplified scoring system (without expensive getComputedStyle)
      const calculateSimpleScore = (
        el: HTMLElement,
        hasCursorPointer = false,
      ): number => {
        const tagName = el.tagName.toLowerCase();
        let score = 0;

        // Base scores for known interactive elements
        if (tagName === "button") score = 20;
        else if (tagName === "a") score = 15;
        else if (["input", "select", "textarea"].includes(tagName)) score = 12;
        else score = 5; // Default for other elements

        // Bonus for explicit click handlers
        if (el.hasAttribute("onclick") || el.hasAttribute("onClick"))
          score += 10;

        // Bonus for test attributes (likely important for automation)
        if (el.hasAttribute("data-testid") || el.hasAttribute("data-cy"))
          score += 8;

        // Bonus for ARIA attributes (prioritize accessible elements)
        const ariaAttributeCount = Array.from(el.attributes).filter((attr) =>
          attr.name.startsWith("aria-"),
        ).length;
        if (ariaAttributeCount > 0) score += 8; // Higher priority for ARIA attributes

        // Bonus for semantic roles
        const role = el.getAttribute("role");
        if (role) {
          score += 7; // Role attribute indicates semantic purpose

          // Extra bonus for interactive roles
          const interactiveRoles = [
            "button",
            "link",
            "tab",
            "menuitem",
            "option",
            "checkbox",
            "radio",
            "slider",
            "switch",
            "textbox",
          ];
          if (interactiveRoles.includes(role)) {
            score += 5; // These roles clearly indicate interactive elements
          }
        }

        // Bonus for cursor:pointer (passed as parameter to avoid getComputedStyle)
        if (hasCursorPointer) {
          score += 6; // Good indicator of interactivity

          // Extra bonus for cursor:pointer on common React patterns
          const className = el.getAttribute("class") || "";
          if (
            className.includes("card") ||
            className.includes("item") ||
            className.includes("row") ||
            className.includes("tile") ||
            ["div", "span", "li"].includes(tagName)
          ) {
            score += 4; // Likely a React clickable component
          }
        }

        // Bonus for common interactive class patterns
        const className = el.getAttribute("class") || "";
        if (
          className.includes("btn") ||
          className.includes("button") ||
          className.includes("click")
        ) {
          score += 7;
        }
        if (
          className.includes("card") ||
          className.includes("item") ||
          className.includes("tile")
        ) {
          score += 3; // Common React interactive patterns
        }

        return score;
      };

      // Fast element processing without expensive getComputedStyle in most cases
      const processElement = (
        el: HTMLElement,
        hasCursorPointer = false,
      ): boolean => {
        // Quick visibility check (avoid getComputedStyle if possible)
        if (
          el.hidden ||
          el.style.display === "none" ||
          el.style.visibility === "hidden"
        ) {
          return false;
        }

        // Early text filtering - skip processing if element doesn't match any filter text
        if (textToFilter && textToFilter.length > 0) {
          const textContent = el.textContent?.toLowerCase().trim() || "";
          const ariaLabel = el.getAttribute("aria-label")?.toLowerCase() || "";
          const title = el.getAttribute("title")?.toLowerCase() || "";
          const alt = el.getAttribute("alt")?.toLowerCase() || "";

          const matchesFilter = textToFilter.some((filterText) => {
            const lowerFilterText = filterText.toLowerCase();
            return (
              textContent.includes(lowerFilterText) ||
              ariaLabel.includes(lowerFilterText) ||
              title.includes(lowerFilterText) ||
              alt.includes(lowerFilterText)
            );
          });

          if (!matchesFilter) {
            return false; // Skip this element entirely - doesn't match text filter
          }
        }

        // Check basic interactivity
        const interactivity = checkElementInteractivity(el);
        if (!interactivity.isInteractive) {
          return false;
        }

        // Check if element has meaningful content
        if (!hasMinimalContent(el)) {
          return false;
        }

        // Early termination check
        if (foundElements.size >= maxResults) {
          return false;
        }

        const score = calculateSimpleScore(el, hasCursorPointer);
        foundElements.add(el);
        elementScores.set(el, score);
        return true;
      };

      // Process elements in smaller, more frequent batches
      const processBatch = async (elements: HTMLElement[]) => {
        for (let i = 0; i < elements.length; i += batchSize) {
          // Early termination if we have enough results
          if (foundElements.size >= maxResults) {
            console.log(
              `Early termination: found ${foundElements.size} elements`,
            );
            break;
          }

          const batchEnd = Math.min(i + batchSize, elements.length);
          const batch = elements.slice(i, batchEnd);

          // Process batch
          for (const el of batch) {
            if (!processElement(el)) {
              continue;
            }
          }

          processedCount += batch.length;

          // Yield more frequently to keep UI responsive
          if (Math.floor(i / batchSize) % yieldInterval === 0) {
            await yieldToBrowser();
          }
        }
      };

      // Step 1: Get obvious interactive elements (fast)
      const obviousInteractiveSelectors =
        "button, a, input, select, textarea, [role='button'], [role='link'], [onclick], [data-testid*='button'], [data-testid*='click']";
      const obviousElements = Array.from(
        document.querySelectorAll(obviousInteractiveSelectors),
      ) as HTMLElement[];

      console.log(
        `Processing ${obviousElements.length} obvious interactive elements`,
      );
      await processBatch(obviousElements);

      // Step 2: Check cursor:pointer on likely interactive elements (balanced approach)
      if (foundElements.size < maxResults) {
        console.log("Checking cursor:pointer on likely interactive elements");

        // Broader criteria for cursor:pointer candidates - include common React patterns
        const cursorCandidateSelectors = [
          // Elements that commonly use cursor:pointer in React apps
          "div, span, li, section, article",
          // Elements with any interactive hints
          '[class*="card"]',
          '[class*="item"]',
          '[class*="row"]',
          '[class*="tile"]',
          '[class*="button"]',
          '[class*="btn"]',
          '[class*="click"]',
          '[class*="link"]',
          // Elements with data attributes (often used in React)
          "[data-*]",
          "[aria-*]",
          // Elements with tabindex or roles
          "[tabindex]",
          "[role]",
        ];

        const allCursorCandidates = new Set<HTMLElement>();

        // Collect cursor candidates from multiple selectors
        for (const selector of cursorCandidateSelectors) {
          try {
            const elements = document.querySelectorAll(selector);
            elements.forEach((el) =>
              allCursorCandidates.add(el as HTMLElement),
            );
          } catch (e) {
            continue;
          }
        }

        // Filter candidates to focus on those more likely to be interactive
        const filteredCandidates = Array.from(allCursorCandidates).filter(
          (el) => {
            if (foundElements.has(el)) return false;

            const tagName = el.tagName.toLowerCase();
            const className = el.getAttribute("class") || "";

            // Include elements that are commonly interactive in React apps
            return (
              // Has text content (likely a clickable text element)
              (el.textContent?.trim() && el.textContent.trim().length > 0) ||
              // Has any class that might indicate interactivity
              className.length > 0 ||
              // Has data attributes (common in React)
              el.hasAttribute("data-testid") ||
              el.hasAttribute("data-cy") ||
              Array.from(el.attributes).some((attr) =>
                attr.name.startsWith("data-"),
              ) ||
              // Has aria attributes
              Array.from(el.attributes).some((attr) =>
                attr.name.startsWith("aria-"),
              ) ||
              // Has role or tabindex
              el.hasAttribute("role") ||
              el.hasAttribute("tabindex") ||
              // Common interactive containers
              ["li", "section", "article"].includes(tagName)
            );
          },
        );

        console.log(
          `Checking cursor:pointer on ${filteredCandidates.length} candidate elements`,
        );

        // Process cursor candidates in small batches
        const cursorBatchSize = 15; // Smaller batches for expensive operations
        for (
          let i = 0;
          i < filteredCandidates.length && foundElements.size < maxResults;
          i += cursorBatchSize
        ) {
          const batch = filteredCandidates.slice(i, i + cursorBatchSize);

          for (const el of batch) {
            if (foundElements.has(el) || foundElements.size >= maxResults)
              break;

            try {
              const style = window.getComputedStyle(el);
              if (style.cursor === "pointer") {
                processElement(el, true); // Pass hasCursorPointer=true
              }
            } catch (error) {
              // Skip elements that cause getComputedStyle errors
              continue;
            }
          }

          // Yield every batch when doing expensive operations
          await yieldToBrowser();
        }
      }

      // Step 3: If still need more, look for additional common interactive patterns
      if (foundElements.size < Math.min(maxResults, 80)) {
        const additionalSelectors = [
          '[role="tab"]',
          '[role="menuitem"]',
          '[role="option"]',
          '[class*="nav"]',
          '[class*="menu"]',
          '[class*="toggle"]',
          '[class*="expand"]',
          '[class*="collapse"]',
          '[class*="dropdown"]',
        ];

        for (const selector of additionalSelectors) {
          if (foundElements.size >= maxResults) break;

          try {
            const elements = Array.from(
              document.querySelectorAll(selector),
            ) as HTMLElement[];
            await processBatch(elements);
          } catch (e) {
            continue;
          }
        }
      }

      // Convert to result format with optimized selector generation
      const sortedElements = Array.from(elementScores.entries())
        .sort((a, b) => b[1] - a[1]) // Sort by score descending
        .slice(0, maxResults) // Limit results
        .map(([el]) => {
          let selector;
          try {
            // Try fast selector generation first
            if (el.id) {
              selector = `#${CSS.escape(el.id)}`;
            } else if (el.getAttribute("data-testid")) {
              selector = `[data-testid="${CSS.escape(el.getAttribute("data-testid")!)}"]`;
            } else {
              // Use slower but more reliable selector generation
              selector = getUniqueSelector(el);
            }
          } catch (error) {
            // Fallback selector
            selector = el.tagName.toLowerCase();
            console.warn("Selector generation failed for element:", el, error);
          }

          // Collect ARIA attributes
          const ariaAttributes: Record<string, string> = {};
          Array.from(el.attributes).forEach((attr) => {
            if (attr.name.startsWith("aria-")) {
              ariaAttributes[attr.name] = attr.value;
            }
          });

          // Get role attribute
          const role = el.getAttribute("role");

          // Get other useful accessibility attributes
          const title = el.getAttribute("title");
          const altText = el.getAttribute("alt");

          return {
            type: el.tagName.toLowerCase(),
            selector,
            text: (el.textContent?.trim() || "").substring(0, 200), // Limit text length
            value: (el as HTMLInputElement).value
              ? String((el as HTMLInputElement).value)
                  .trim()
                  .substring(0, 100)
              : undefined,
            href: (el as HTMLAnchorElement).href,
            role: role || undefined,
            ariaAttributes:
              Object.keys(ariaAttributes).length > 0
                ? ariaAttributes
                : undefined,
            title: title || undefined,
            alt: altText || undefined,
          };
        });

      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      console.log(
        `findInteractiveElements took ${duration}ms to process ${processedCount} elements and find ${sortedElements.length} interactive elements${textToFilter && textToFilter.length > 0 ? " (with text filtering applied)" : ""}`,
      );

      return {
        success: true,
        elements: sortedElements,
        performance: {
          duration,
          processedCount,
          foundCount: sortedElements.length,
        },
      };
    } catch (error) {
      console.error("findInteractiveElements error:", error);
      return {
        success: false,
        elements: [],
        message: error instanceof Error ? error.message : String(error),
      };
    }
  },

  captureElementScreenshot: async (params) => {
    try {
      const { tabId, selector, scrollIntoView = true } = params;
      console.log(
        "Capturing screenshot for selector:",
        selector,
        "on tab:",
        tabId,
      );

      // Find the element
      const $element = $(selector);
      if ($element.length === 0) {
        return {
          success: false,
          error: `Element not found with selector: ${selector}`,
        };
      }

      const element = $element[0] as HTMLElement;

      // Check if element is visible using jQuery's built-in helper
      if (!$element.is(":visible")) {
        return {
          success: false,
          error: `Element is not visible: ${selector}`,
        };
      }

      // Scroll element into view if requested
      if (scrollIntoView) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });

        // Wait for scroll to complete
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Use html2canvas-pro to capture the element (better CSS support than regular html2canvas)
      console.log("Using html2canvas-pro to capture element");

      let canvas;

      // Smart sizing - automatically scale large elements to reasonable size
      const originalWidth = element.offsetWidth;
      const originalHeight = element.offsetHeight;
      const maxWidth = 800;
      const maxHeight = 600;

      let finalScale = 1;

      // Only scale down if element is larger than max dimensions
      if (originalWidth > maxWidth || originalHeight > maxHeight) {
        const widthScale = maxWidth / originalWidth;
        const heightScale = maxHeight / originalHeight;
        finalScale = Math.min(widthScale, heightScale); // Use smaller scale to fit both dimensions
        console.log(
          `Auto-scaling large element from ${originalWidth}x${originalHeight} (scale: ${finalScale.toFixed(2)})`,
        );
      } else {
        console.log(
          `Element fits within limits: ${originalWidth}x${originalHeight}`,
        );
      }

      // First attempt: Use html2canvas-pro with modern CSS support
      try {
        console.log(
          "Attempting html2canvas-pro with viewport-limited capture...",
        );

        // Get viewport dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        canvas = await html2canvas(element, {
          backgroundColor: null,
          scale: finalScale,
          logging: false,
          useCORS: true,
          allowTaint: false,
          width: originalWidth,
          height: originalHeight,
          // Limit to visible viewport
          windowWidth: viewportWidth,
          windowHeight: viewportHeight,
          // html2canvas-pro should handle modern CSS functions better
          ignoreElements: (el) => {
            // Still ignore problematic elements
            const tagName = el.tagName;
            if (["SCRIPT", "NOSCRIPT"].includes(tagName)) {
              return true;
            }
            // Skip elements with data-html2canvas-ignore attribute
            if (el.hasAttribute("data-html2canvas-ignore")) {
              return true;
            }
            return false;
          },
        });
        console.log("html2canvas-pro full CSS support succeeded");
      } catch (modernError) {
        console.warn(
          "html2canvas-pro with full CSS failed, trying fallback:",
          modernError,
        );

        // Fallback: Use safer configuration
        try {
          canvas = await html2canvas(element, {
            backgroundColor: "#ffffff",
            scale: finalScale, // Use same calculated scale
            logging: false,
            useCORS: false,
            allowTaint: true,
            width: originalWidth,
            height: originalHeight,
            ignoreElements: (el) => {
              const tagName = el.tagName;
              return ["SCRIPT", "NOSCRIPT", "STYLE", "LINK"].includes(tagName);
            },
          });
          console.log("html2canvas-pro fallback succeeded");
        } catch (fallbackError) {
          console.error("html2canvas-pro attempts failed:", fallbackError);
          throw new Error(
            `Screenshot capture failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
          );
        }
      }

      // Convert to data URL with good quality
      const dataUrl = canvas.toDataURL("image/png", 0.8);

      console.log(
        `Successfully captured screenshot: ${canvas.width}x${canvas.height} pixels`,
      );

      return {
        success: true,
        image: dataUrl,
        message: `Screenshot captured for element ${selector}`,
      };
    } catch (error) {
      console.error("captureElementScreenshot error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
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
          if (!params.path.startsWith("/")) {
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
              error:
                "URL must be a valid absolute URL with protocol (e.g., https://example.com)",
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
        if (params.action === "back" || params.action === "forward") {
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
        message: `Successfully initiated ${params.action} navigation${params.action === "path" ? ` to ${params.path}` : params.action === "url" ? ` to ${params.url}` : ""}`,
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
        type: "GET_GEOLOCATION",
        data: params,
      });

      if (response.success) {
        return response.data;
      } else {
        return {
          success: false,
          error: response.error || "Geolocation request failed",
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  openTab: async (params) => {
    // This implementation should never be called as openTab is handled by the background script
    // This is just a placeholder to satisfy TypeScript
    return {
      success: false,
      error:
        "openTab should be handled by background script, not content script",
    };
  },

  closeTab: async (params) => {
    // This implementation should never be called as closeTab is handled by the background script
    // This is just a placeholder to satisfy TypeScript
    return {
      success: false,
      error:
        "closeTab should be handled by background script, not content script",
    };
  },
};

// Helper functions for fetchPageText optimization
const preprocessHtmlForMarkdown = (htmlElement: HTMLElement): void => {
  // Remove elements that don't contribute to meaningful content
  const elementsToRemove = [
    "script",
    "style",
    "noscript",
    "iframe",
    "embed",
    "object",
    "meta",
    'link[rel="stylesheet"]',
    'link[rel="preload"]',
    "svg",
    "canvas",
    "audio",
    "video",
  ];

  elementsToRemove.forEach((selector) => {
    const elements = htmlElement.querySelectorAll(selector);
    elements.forEach((el) => el.remove());
  });

  // Truncate very long href attributes to prevent context bloat
  const links = htmlElement.querySelectorAll("a[href]");
  links.forEach((link: Element) => {
    const href = link.getAttribute("href");
    if (href && href.length > 100) {
      // Keep the domain and first part of the path, truncate the rest
      try {
        const url = new URL(href, window.location.origin);
        const truncatedPath =
          url.pathname.length > 50
            ? url.pathname.substring(0, 47) + "..."
            : url.pathname;
        const truncatedHref =
          url.origin +
          truncatedPath +
          (url.search ? (url.search.length > 20 ? "?..." : url.search) : "");
        link.setAttribute("href", truncatedHref);
      } catch {
        // If URL parsing fails, just truncate the string
        link.setAttribute("href", href.substring(0, 97) + "...");
      }
    }
  });

  // Truncate very long src attributes for images
  const images = htmlElement.querySelectorAll("img[src]");
  images.forEach((img: Element) => {
    const src = img.getAttribute("src");
    if (src && src.length > 150) {
      img.setAttribute("src", src.substring(0, 147) + "...");
    }
  });

  // Remove or truncate very long data attributes that might contain base64 or large JSON
  const allElements = htmlElement.querySelectorAll("*");
  allElements.forEach((el: Element) => {
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name.startsWith("data-") && attr.value.length > 200) {
        if (
          attr.value.startsWith("data:") ||
          attr.value.startsWith("{") ||
          attr.value.startsWith("[")
        ) {
          // Likely base64 data or JSON, truncate heavily
          el.setAttribute(
            attr.name,
            attr.value.substring(0, 50) + "... [truncated]",
          );
        } else if (attr.value.length > 500) {
          // Other long data attributes, moderate truncation
          el.setAttribute(attr.name, attr.value.substring(0, 197) + "...");
        }
      }
    });
  });

  // Light whitespace normalization to prevent excessive whitespace
  // but preserve content structure for chunking
  const textNodes = document.createTreeWalker(
    htmlElement,
    NodeFilter.SHOW_TEXT,
    null,
  );

  const nodesToProcess: Text[] = [];
  let textNode = textNodes.nextNode() as Text;
  while (textNode) {
    nodesToProcess.push(textNode);
    textNode = textNodes.nextNode() as Text;
  }

  nodesToProcess.forEach((node) => {
    if (node.textContent) {
      // Only normalize excessive whitespace, preserve structure
      node.textContent = node.textContent
        .replace(/[ \t]{3,}/g, " ") // Only collapse 3+ spaces/tabs to single space
        .replace(/\n{4,}/g, "\n\n\n"); // Only collapse 4+ line breaks to max 3
    }
  });
};

// Helper for fetchPageHtml: trims DOM for LLM consumption without losing structure/semantics
// - Removes <style> and other purely presentational tags inside the cloned body
// - Truncates long href attributes on anchors while keeping origin + first path segment
// - Truncates verbose inline style attributes to a safe length, preserving accessibility-related styles when possible
const preprocessHtmlForLlm = (rootElement: HTMLElement): void => {
  try {
    const $root = $(rootElement);

    // Remove style/script/noscript tags to reduce noise
    $root.find("style, script, noscript").remove();

    // Truncate href attributes sensibly
    $root.find("a[href]").each((_, el) => {
      const $el = $(el);
      const href = $el.attr("href");
      if (!href || href.length <= 140) return;
      try {
        const url = new URL(href, window.location.origin);
        const truncatedPath =
          url.pathname.length > 60
            ? url.pathname.substring(0, 57) + "..."
            : url.pathname;
        const search = url.search
          ? url.search.length > 24
            ? "?..."
            : url.search
          : "";
        const safeHref = url.origin + truncatedPath + search;
        $el.attr("href", safeHref);
      } catch {
        $el.attr("href", href.substring(0, 137) + "...");
      }
    });

    // Truncate verbose inline style attributes with priority for key properties
    $root.find("[style]").each((_, el) => {
      const $el = $(el);
      const styleAttr = $el.attr("style");
      if (!styleAttr) return;

      const importantProps = [
        "display",
        "visibility",
        "opacity",
        "pointer-events",
        "cursor",
      ];
      const parts = styleAttr
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean);
      const prioritized: string[] = [];
      const others: string[] = [];
      for (const part of parts) {
        const [prop] = part.split(":");
        if (prop && importantProps.includes(prop.trim().toLowerCase())) {
          prioritized.push(part);
        } else {
          others.push(part);
        }
      }
      const reconstructed = [...prioritized, ...others].join("; ");
      const maxStyleLen = 180;
      $el.attr(
        "style",
        reconstructed.length > maxStyleLen
          ? reconstructed.substring(0, maxStyleLen - 3) + "..."
          : reconstructed,
      );
    });

    // Keep ARIA and role attributes intact
  } catch (e) {
    // Fail-soft: ignore errors in preprocessing
  }
};

// Helper to check if an element is likely to be interactive (optimized and more permissive)
const checkElementInteractivity = (
  element: HTMLElement,
): { isInteractive: boolean; reason?: string } => {
  if (!element) {
    return { isInteractive: false, reason: "Element is null or undefined" };
  }

  const tagName = element.tagName.toLowerCase();

  // Obviously interactive elements
  const interactiveTags = [
    "button",
    "a",
    "input",
    "select",
    "textarea",
    "option",
  ];
  if (interactiveTags.includes(tagName)) {
    return { isInteractive: true };
  }

  // Check for interactive roles
  const role = element.getAttribute("role");
  const interactiveRoles = [
    "button",
    "link",
    "tab",
    "menuitem",
    "checkbox",
    "radio",
    "option",
  ];
  if (role && interactiveRoles.includes(role)) {
    return { isInteractive: true };
  }

  // Check for click handlers
  if (
    element.onclick ||
    element.getAttribute("onclick") ||
    element.getAttribute("onClick")
  ) {
    return { isInteractive: true };
  }

  // Check for common data attributes that suggest interactivity
  const interactiveDataAttrs = [
    "data-testid",
    "data-cy",
    "data-click",
    "data-action",
    "data-handler",
  ];
  if (interactiveDataAttrs.some((attr) => element.hasAttribute(attr))) {
    return { isInteractive: true };
  }

  // Check for tabindex (keyboard accessible)
  if (element.hasAttribute("tabindex")) {
    return { isInteractive: true };
  }

  // Check if element is disabled
  if (
    element.hasAttribute("disabled") ||
    element.getAttribute("aria-disabled") === "true"
  ) {
    return { isInteractive: false, reason: "Element is disabled" };
  }

  // Quick visibility checks (avoid getComputedStyle)
  if (
    element.hidden ||
    element.style.display === "none" ||
    element.style.visibility === "hidden"
  ) {
    return { isInteractive: false, reason: "Element is hidden" };
  }

  // For React components and common patterns, be more permissive
  const className = element.getAttribute("class") || "";

  // Common interactive class patterns
  const interactiveClassPatterns = [
    "button",
    "btn",
    "click",
    "link",
    "card",
    "item",
    "tile",
    "row",
  ];
  if (interactiveClassPatterns.some((pattern) => className.includes(pattern))) {
    return { isInteractive: true };
  }

  // Elements that commonly have cursor:pointer in React apps
  if (["div", "span", "li", "section", "article"].includes(tagName)) {
    // Be more permissive for these elements - they might have cursor:pointer
    // We'll let the cursor:pointer check in the main function determine final interactivity
    if (
      element.textContent?.trim() ||
      className.length > 0 ||
      Array.from(element.attributes).some(
        (attr) =>
          attr.name.startsWith("data-") || attr.name.startsWith("aria-"),
      )
    ) {
      return { isInteractive: true };
    }
  }

  // For generic elements without obvious interactive indicators, check more carefully
  if (
    ["p", "h1", "h2", "h3", "h4", "h5", "h6"].includes(tagName) &&
    !className &&
    !element.textContent?.trim()
  ) {
    return {
      isInteractive: false,
      reason: `${tagName} element without content or interactive indicators`,
    };
  }

  // Default to potentially interactive for other elements (err on the side of inclusion)
  return { isInteractive: true };
};

// Helper to get unique selector using the finder library
const getUniqueSelector = (el: HTMLElement): string => {
  try {
    return finder(el, {
      timeoutMs: 500,
    });
  } catch (error) {
    console.warn("Finder library failed, using fallback selector:", error);
    // Fallback to simple selector if finder fails
    if (el.id) {
      return `#${CSS.escape(el.id)}`;
    }

    // Try data-testid first
    const testId = el.getAttribute("data-testid");
    if (testId) {
      return `[data-testid="${CSS.escape(testId)}"]`;
    }

    // Fall back to tag + nth-child
    const tagName = el.tagName.toLowerCase();
    if (el.parentElement) {
      const siblings = Array.from(el.parentElement.children).filter(
        (child) => child.tagName.toLowerCase() === tagName,
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(el) + 1;
        return `${tagName}:nth-child(${index})`;
      }
    }

    return tagName;
  }
};

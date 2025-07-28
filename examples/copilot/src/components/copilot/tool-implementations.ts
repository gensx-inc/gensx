import $ from 'jquery';
import { useMemo } from "react";
import { createToolImplementations } from "@gensx/react";

import { ToolBox } from "../../../gensx/tools/toolbox";

export const useToolImplementations = () => {

  const toolImplementations = useMemo(() => {
    return createToolImplementations<ToolBox>({
      fetchPageContent: async () => {
        // Fetch the current page HTML using window.document.documentElement.outerHTML
        const pageContent = window.document.documentElement.outerHTML;
        return {
          success: true,
          url: window.location.href ?? "unknown",
          content: pageContent,
        };
      },
      inspectElements: (params) => {
        try {
          const inspections = params.elements.map((elementParams) => {
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
                    html?: string;
                    attributes?: Record<string, string>;
                    css?: Record<string, string>;
                    data?: Record<string, unknown>;
                    index: number;
                  } = { index };

                  if (
                    !elementParams.properties ||
                    elementParams.properties.includes("text")
                  ) {
                    data.text = $el.text();
                  }
                  if (
                    !elementParams.properties ||
                    elementParams.properties.includes("value")
                  ) {
                    data.value = $el.val() as string | undefined;
                  }
                  if (
                    !elementParams.properties ||
                    elementParams.properties.includes("html")
                  ) {
                    data.html = $el.html();
                  }
                  if (elementParams.properties?.includes("attr")) {
                    if (elementParams.attributeName) {
                      data.attributes = {
                        [elementParams.attributeName]: $el.attr(
                          elementParams.attributeName,
                        ) ?? "",
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
                      data.css = {
                        [elementParams.cssProperty]: $el.css(
                          elementParams.cssProperty,
                        ),
                      };
                    } else {
                      data.css = {};
                    }
                  }
                  if (elementParams.properties?.includes("data")) {
                    data.data = $el.data();
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

          const successCount = inspections.filter((i) => i.success).length;
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

      clickElements: async (params) => {
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

              // Check if it's a link that might cause navigation
              if (
                element.is("a") &&
                element.attr("href") &&
                !element.attr("href")?.startsWith("#")
              ) {
                // For links, prevent default to avoid navigation
                const clickEvent = $.Event("click");
                element.trigger(clickEvent);
                if (!clickEvent.isDefaultPrevented()) {
                  console.warn(
                    `Clicking link with href: ${element.attr("href")} - navigation prevented`,
                  );
                }
              } else {
                // For other elements, trigger click normally
                // For React components, use native click to ensure proper event propagation
                const nativeElement = element[0];
                if (nativeElement) {
                  nativeElement.click();
                } else {
                  element.trigger("click");
                }
              }

              results.push({
                selector: elementParams.selector,
                clicked: true,
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
          return {
            success: clickedCount > 0,
            clicks: results,
            message: `Clicked ${clickedCount} of ${params.elements.length} elements`,
          };
        } catch (error) {
          return {
            success: false,
            clicks: [],
            message: error instanceof Error ? error.message : String(error),
          };
        }
      },

      fillTextInputs: async (params) => {
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

      selectOptions: async (params) => {
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

      toggleCheckboxes: async (params) => {
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

      submitForms: async (params) => {
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

      highlightElements: (params) => {
        try {
          const results = params.elements.map((elementParams) => {
            try {
              const elements = $(elementParams.selector);
              if (elements.length === 0) {
                return {
                  selector: elementParams.selector,
                  highlighted: 0,
                  error: `No elements found with selector: ${elementParams.selector}`,
                };
              }

              const color = elementParams.color || "#ff0000";
              const duration = elementParams.duration || 3000;

              // Store original styles
              elements.each(function (this: HTMLElement) {
                const $el = $(this);
                $el.data("original-outline", $el.css("outline"));
                $el.css("outline", `3px solid ${color}`);
              });

              // Remove highlight after duration
              setTimeout(() => {
                elements.each(function (this: HTMLElement) {
                  const $el = $(this);
                  const originalOutline = $el.data("original-outline");
                  $el.css("outline", originalOutline || "");
                });
              }, duration);

              return {
                selector: elementParams.selector,
                highlighted: elements.length,
              };
            } catch (error) {
              return {
                selector: elementParams.selector,
                highlighted: 0,
                error: error instanceof Error ? error.message : String(error),
              };
            }
          });

          const totalHighlighted = results.reduce(
            (sum, r) => sum + r.highlighted,
            0,
          );
          return {
            success: totalHighlighted > 0,
            highlights: results,
            message: `Highlighted ${totalHighlighted} elements across ${params.elements.length} selectors`,
          };
        } catch (error) {
          return {
            success: false,
            highlights: [],
            message: error instanceof Error ? error.message : String(error),
          };
        }
      },

      waitForElements: async (params) => {
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

      findInteractiveElements: async () => {
        try {
          const interactiveElements = $("button, input, select, textarea, a, option, datalist");

          // Find all elements that are clickable. This is a hack since React manages its own click handlers.
          const clickableElements = $("*").filter(function() {
            const $el = $(this);
            return $el.css("cursor") === "pointer";
          });

          return {
            success: true,
            elements: [...interactiveElements, ...clickableElements]
              .map((el) => ({
                type: el.tagName.toLowerCase(),
                selector: getUniqueSelector(el),
                text: el.textContent?.trim() ?? "",
                value: (el as HTMLInputElement).value?.trim(),
                href: (el as HTMLAnchorElement).href,
              }))
          };
        } catch (error) {
          return {
            success: false,
            elements: [],
            message: error instanceof Error ? error.message : String(error),
          };
        }
      },

      getPageOverview: async (params) => {
        try {
          // Helper to check if element is visible
          const isVisible = (el: HTMLElement) => {
            if (!params.visibleOnly) return true;
            const rect = el.getBoundingClientRect();
            return (
              rect.height > 0 &&
              rect.width > 0 &&
              rect.top < window.innerHeight &&
              rect.bottom > 0
            );
          };

          // Helper to truncate text
          const truncateText = (text: string, maxLength: number) => {
            if (!text || text.length <= maxLength) return text;
            return text.substring(0, maxLength) + "...";
          };

          // Get page title
          const title = $("title").text() || $("h1").first().text() || "";

          // Determine which headings to include
          const headingSelector =
            params.includeHeadings === "h1"
              ? "h1"
              : params.includeHeadings === "h1-h2"
                ? "h1, h2"
                : params.includeHeadings === "h1-h3"
                  ? "h1, h2, h3"
                  : "h1, h2, h3, h4, h5, h6";

          // Build sections based on headings and major containers
          const sections: {
            heading: string;
            level: number;
            selector: string;
            bounds: {
              top: number;
              left: number;
              width: number;
              height: number;
            };
            metrics?: {
              forms: number;
              buttons: number;
              links: number;
              inputs: number;
              images: number;
              lists: number;
            };
            textPreview?: string;
            interactiveElements?: {
              type: string;
              selector: string;
              label?: string;
              text?: string;
            }[];
          }[] = [];
          const processedElements = new Set<HTMLElement>();

          // Process headings and their associated content
          $(headingSelector).each(function (this: HTMLElement) {
            const heading = this as HTMLElement;
            if (!isVisible(heading) || processedElements.has(heading)) return;

            const $heading = $(heading);
            const level = parseInt(heading.tagName.substring(1));
            const headingText = $heading.text().trim();
            const selector = getUniqueSelector(heading);

            // Find the section container (parent that contains content)
            let $section = $heading.parent();
            while (
              $section.length > 0 &&
              $section[0].tagName.toLowerCase() === "span"
            ) {
              $section = $section.parent();
            }

            const sectionEl = $section[0] as HTMLElement;
            const bounds = sectionEl.getBoundingClientRect();

            // Get metrics for this section
            const metrics = params.includeMetrics
              ? {
                  forms: $section.find("form").length,
                  buttons: $section.find(
                    'button, input[type="button"], input[type="submit"]',
                  ).length,
                  links: $section.find("a").length,
                  inputs: $section.find("input, textarea, select").length,
                  images: $section.find("img").length,
                  lists: $section.find("ul, ol").length,
                }
              : undefined;

            // Get text preview
            const textPreview = params.includeText
              ? truncateText(
                  $section.text().trim(),
                  params.maxTextLength || 100,
                )
              : undefined;

            // Get interactive elements
            const interactiveElements: {
              type: string;
              selector: string;
              label?: string;
              text?: string;
            }[] = [];
            if (params.includeMetrics) {
              $section
                .find("button, input, select, textarea, a")
                .each(function (this: HTMLElement) {
                  const el = this as HTMLElement;
                  if (!isVisible(el)) return;

                  const $el = $(el);
                  const type = el.tagName.toLowerCase();
                  const elemSelector = getUniqueSelector(el);

                  interactiveElements.push({
                    type,
                    selector: elemSelector,
                    text: truncateText(
                      $el.text().trim() || ($el.val() as string) || "",
                      50,
                    ),
                    label:
                      $el.attr("aria-label") ||
                      $el.attr("placeholder") ||
                      $(`label[for="${$el.attr("id")}"]`).text() ||
                      undefined,
                  });
                });
            }

            sections.push({
              heading: headingText,
              level,
              selector,
              bounds: {
                top: Math.round(bounds.top),
                left: Math.round(bounds.left),
                width: Math.round(bounds.width),
                height: Math.round(bounds.height),
              },
              metrics,
              textPreview,
              interactiveElements: interactiveElements.slice(0, 10), // Limit to 10
            });

            processedElements.add(sectionEl);
          });

          // Add major containers without headings
          $('main, article, section, [role="main"], .container, .content').each(
            function (this: HTMLElement) {
              const container = this as HTMLElement;
              if (!isVisible(container) || processedElements.has(container))
                return;

              const $container = $(container);
              if ($container.find(headingSelector).length > 0) return; // Skip if has headings

              const selector = getUniqueSelector(container);
              const bounds = container.getBoundingClientRect();

              const metrics = params.includeMetrics
                ? {
                    forms: $container.find("form").length,
                    buttons: $container.find(
                      'button, input[type="button"], input[type="submit"]',
                    ).length,
                    links: $container.find("a").length,
                    inputs: $container.find("input, textarea, select").length,
                    images: $container.find("img").length,
                    lists: $container.find("ul, ol").length,
                  }
                : undefined;

              if (metrics && Object.values(metrics).some((v) => v > 0)) {
                sections.push({
                  heading:
                    container.getAttribute("aria-label") ||
                    container.className ||
                    container.tagName,
                  level: 0,
                  selector,
                  bounds: {
                    top: Math.round(bounds.top),
                    left: Math.round(bounds.left),
                    width: Math.round(bounds.width),
                    height: Math.round(bounds.height),
                  },
                  metrics,
                  textPreview: params.includeText
                    ? truncateText(
                        $container.text().trim(),
                        params.maxTextLength || 100,
                      )
                    : undefined,
                });
              }
            },
          );

          // Get global elements
          const globalElements = {
            navigation: (() => {
              const $nav = $('nav, [role="navigation"]').first();
              if ($nav.length > 0) {
                return {
                  present: true,
                  selector: getUniqueSelector($nav[0] as HTMLElement),
                  itemCount: $nav.find("a").length,
                };
              }
              return undefined;
            })(),
            forms: $("form")
              .map(function (this: HTMLElement) {
                const form = this as HTMLElement;
                const $form = $(form);
                const purpose =
                  $form.attr("aria-label") ||
                  $form.find("h1, h2, h3").first().text() ||
                  ($form.find('input[type="search"]').length > 0
                    ? "search"
                    : "input");

                return {
                  selector: getUniqueSelector(form),
                  purpose: purpose || undefined,
                };
              })
              .get(),
            modals: (() => {
              const $modal = $(
                '[role="dialog"], .modal:visible, .dialog:visible',
              ).first();
              if ($modal.length > 0) {
                return {
                  open: true,
                  selector: getUniqueSelector($modal[0] as HTMLElement),
                };
              }
              return undefined;
            })(),
          };

          return {
            success: true,
            url: window.location.href ?? "unknown",
            title: title || undefined,
            sections,
            globalElements,
          };
        } catch (error) {
          console.error("Error getting page overview", error);
          return {
            success: false,
            url: window.location.href ?? "unknown",
            title: undefined,
            sections: [],
            globalElements: { forms: [] },
          };
        }
      },

      inspectSection: async (params) => {
        try {
          const $element = $(params.selector);
          if ($element.length === 0) {
            return {
              success: false,
              element: undefined,
              error: `No element found with selector: ${params.selector}`,
            };
          }

          const element = $element[0] as HTMLElement;
          const bounds = element.getBoundingClientRect();

          // Helper to get text content based on setting
          const getText = (el: HTMLElement) => {
            const fullText = $(el).text().trim();
            if (params.textLength === "full") return fullText;
            if (params.textLength === "summary")
              return (
                fullText.substring(0, 50) + (fullText.length > 50 ? "..." : "")
              );
            return (
              fullText.substring(0, 200) + (fullText.length > 200 ? "..." : "")
            );
          };

          // Helper to process children
          const processChildren = (el: HTMLElement, depth: number): Record<string, unknown>[] => {
            if (!params.includeChildren || depth >= (params.maxDepth || 3))
              return [];

            const children: Record<string, unknown>[] = [];
            $(el)
              .children()
              .each(function (this: HTMLElement) {
                const child = this as HTMLElement;
                // const $child = $(child);

                children.push({
                  tag: child.tagName.toLowerCase(),
                  id: child.id || undefined,
                  classes: child.className.split(" ").filter((c) => c.trim()),
                  text: getText(child),
                  children:
                    params.depth === "deep"
                      ? processChildren(child, depth + 1)
                      : undefined,
                });
              });

            return children;
          };

          // Get interactive elements within
          const interactiveElements: {
            type: string;
            selector: string;
            label?: string;
            text?: string;
            state?: Record<string, unknown>;
          }[] = [];
          $element.find("button, input, select, textarea, a").each(function (
            this: HTMLElement,
          ) {
            const el = this as HTMLElement;
            const $el = $(el);

            const state: Record<string, string | boolean | number | undefined> = {};
            if (el.tagName.toLowerCase() === "input") {
              state.value = $el.val() as string | number | boolean | undefined;
              state.checked = $el.prop("checked");
              state.disabled = $el.prop("disabled");
            }

            interactiveElements.push({
              type: el.tagName.toLowerCase(),
              selector: `${params.selector} ${el.tagName.toLowerCase()}:eq(${$element.find(el.tagName).index(el)})`,
              label:
                $el.attr("aria-label") ||
                $el.attr("placeholder") ||
                $(`label[for="${$el.attr("id")}"]`).text() ||
                undefined,
              text: $el.text().trim() || undefined,
              state: Object.keys(state).length > 0 ? state : undefined,
            });
          });

          return {
            success: true,
            element: {
              tag: element.tagName.toLowerCase(),
              selector: params.selector,
              id: element.id || undefined,
              classes: element.className.split(" ").filter((c) => c.trim()),
              text: getText(element),
              attributes: (() => {
                const attrs: Record<string, string> = {};
                for (let i = 0; i < element.attributes.length; i++) {
                  const attr = element.attributes[i];
                  if (attr.name !== "class" && attr.name !== "id") {
                    attrs[attr.name] = attr.value;
                  }
                }
                return Object.keys(attrs).length > 0 ? attrs : undefined;
              })(),
              bounds: {
                top: Math.round(bounds.top),
                left: Math.round(bounds.left),
                width: Math.round(bounds.width),
                height: Math.round(bounds.height),
                visible: bounds.height > 0 && bounds.width > 0,
              },
              children: processChildren(element, 0),
              interactiveElements,
            },
            error: undefined,
          };
        } catch (error) {
          return {
            success: false,
            element: undefined,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },

      navigate: async (params) => {
        try {
          const startTime = Date.now();
          const previousUrl = window.location.href;

          switch (params.action) {
            case "back":
              if (window.history.length > 1) {
                // Use browser History API instead of Next.js router to preserve state
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
              // Use browser History API instead of Next.js router to preserve state
              window.history.forward();
              break;

            case "path":
              if (!params.path) {
                return {
                  success: false,
                  action: params.action,
                  currentUrl: previousUrl,
                  previousUrl,
                  message: "No path provided",
                  error: "No path provided",
                };
              }
              // Use browser History API to change URL without full page reload
              // This preserves React component state unlike Next.js router
              window.history.pushState(null, '', params.path);

              // Trigger a popstate event to notify React of the URL change
              window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
              break;

            default:
              return {
                success: false,
                action: params.action,
                currentUrl: previousUrl,
                previousUrl,
                message: `Unknown navigation action: ${params.action}`,
                error: `Invalid action: ${params.action}`,
              };
          }

          // Wait for navigation to complete if requested
          if (params.waitForLoad) {
            const timeout = params.timeout || 5000;
            const pollInterval = 100;
            let elapsed = 0;

            // For History API navigation, wait for URL change
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Poll for URL change or timeout
            while (elapsed < timeout) {
              if (window.location.href !== previousUrl) {
                break;
              }
              await new Promise((resolve) => setTimeout(resolve, pollInterval));
              elapsed += pollInterval;
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
            message: `Successfully navigated using ${params.action}`,
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
    });
  }, []);

  return toolImplementations;
}



// Helper to escape CSS class names for jQuery selectors
const escapeCSSClass = (className: string): string => {
  // Escape characters that have special meaning in CSS selectors
  return className.replace(/([!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g, "\\$1");
};

// Helper to get unique selector
const getUniqueSelector = (el: HTMLElement): string => {
  if (el.id) return `#${CSS.escape(el.id)}`;

  let selector = el.tagName.toLowerCase();
  if (el.className) {
    const classes = el.className.split(" ").filter((c) => c.trim());
    if (classes.length > 0) {
      selector += "." + classes.map(escapeCSSClass).join(".");
    }
  }

  if (!el.parentElement) {
    return selector;
  }

  // Make it unique by adding index if needed
  try {
    const siblings = $(el.parentElement).children(selector);
    if (siblings.length > 1) {
      const index = siblings.index(el);
      selector += `:eq(${index})`;
    }

    // Add parent context if still not unique
    if ($(selector).length > 1 && el.parentElement) {
      const parentSelector = getUniqueSelector(el.parentElement);
      selector = `${parentSelector} > ${selector}`;
    }
  } catch (error) {
    console.error("Error getting unique selector", error);
    // If selector parsing fails, fall back to tag name with index
    const allSiblings = $(el.parentElement).children(el.tagName.toLowerCase());
    const index = allSiblings.index(el);
    selector = `${el.tagName.toLowerCase()}:eq(${index})`;
  }

  return selector;
};

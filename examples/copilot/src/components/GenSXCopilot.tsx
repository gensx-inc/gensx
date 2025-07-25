/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { createToolImplementations } from "@gensx/react";
import { CoreAssistantMessage, CoreMessage, CoreUserMessage } from "ai";

import { useChat } from "../hooks/useChat";
import type { ToolBox } from "../../gensx/tools/toolbox";
import { useSearchParams } from "next/navigation";
import { getUserId } from "@/lib/get-user-id";

declare global {
  interface Window {
    jQuery: any;
    $: any;
  }
}

export default function GenSXCopilot() {
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string | null>(null);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);

  // Load jQuery dynamically
  useEffect(() => {
    if (!window.jQuery) {
      const script = document.createElement("script");
      script.src = "https://code.jquery.com/jquery-3.7.1.min.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const toolImplementations = useMemo(() => {
    return createToolImplementations<ToolBox>({
      inspectElement: (params) => {
        try {
          const $ = window.$;
          if (!$) {
            return {
              success: false,
              count: 0,
              elements: [],
              error: "jQuery not loaded",
            };
          }

          const elements = $(params.selector);
          const count = elements.length;

          if (count === 0) {
            return {
              success: false,
              count: 0,
              elements: [],
              error: `No elements found with selector: ${params.selector}`,
            };
          }

          const elementData = elements
            .map(function (this: any, index: number) {
              const $el = $(this);
              const data: any = { index };

              if (!params.properties || params.properties.includes("text")) {
                data.text = $el.text();
              }
              if (!params.properties || params.properties.includes("value")) {
                data.value = $el.val();
              }
              if (!params.properties || params.properties.includes("html")) {
                data.html = $el.html();
              }
              if (params.properties?.includes("attr")) {
                if (params.attributeName) {
                  data.attributes = {
                    [params.attributeName]: $el.attr(params.attributeName),
                  };
                } else {
                  const attrs: Record<string, string> = {};
                  $.each(this.attributes, function (this: any) {
                    if (this.specified) {
                      attrs[this.name] = this.value;
                    }
                  });
                  data.attributes = attrs;
                }
              }
              if (params.properties?.includes("css")) {
                if (params.cssProperty) {
                  data.css = {
                    [params.cssProperty]: $el.css(params.cssProperty),
                  };
                } else {
                  data.css = {};
                }
              }
              if (params.properties?.includes("data")) {
                data.data = $el.data();
              }

              return data;
            })
            .get();

          return {
            success: true,
            count,
            elements: elementData,
          };
        } catch (error) {
          return {
            success: false,
            count: 0,
            elements: [],
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },

      clickElement: (params) => {
        try {
          const $ = window.$;
          if (!$) {
            return {
              success: false,
              message: "jQuery not loaded",
              clicked: false,
            };
          }

          const elements = $(params.selector);
          if (elements.length === 0) {
            return {
              success: false,
              message: `No elements found with selector: ${params.selector}`,
              clicked: false,
            };
          }

          const index = params.index || 0;
          if (index >= elements.length) {
            return {
              success: false,
              message: `Index ${index} out of bounds (found ${elements.length} elements)`,
              clicked: false,
            };
          }

          const element = elements.eq(index);

          // Check if it's a link that might cause navigation
          if (
            element.is("a") &&
            element.attr("href") &&
            !element.attr("href").startsWith("#")
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
            element.trigger("click");
          }

          return {
            success: true,
            message: `Clicked element at index ${index}`,
            clicked: true,
          };
        } catch (error) {
          return {
            success: false,
            message: error instanceof Error ? error.message : String(error),
            clicked: false,
          };
        }
      },

      fillForm: (params) => {
        try {
          const $ = window.$;
          if (!$) {
            return {
              success: false,
              filled: [],
              message: "jQuery not loaded",
            };
          }

          const results = params.inputs.map((input) => {
            try {
              const $el = $(input.selector);
              if ($el.length === 0) {
                return {
                  selector: input.selector,
                  filled: false,
                  error: "Element not found",
                };
              }

              // Get the native DOM element
              const element = $el[0] as HTMLInputElement;

              // Use native value setter to bypass React's controlled component
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                "value",
              )?.set;

              if (nativeInputValueSetter) {
                nativeInputValueSetter.call(element, input.value);
              } else {
                element.value = input.value;
              }

              // Trigger React's synthetic events
              if (input.triggerEvents !== false) {
                // Create and dispatch input event for React
                const inputEvent = new Event("input", { bubbles: true });
                element.dispatchEvent(inputEvent);

                // Also trigger change event
                const changeEvent = new Event("change", { bubbles: true });
                element.dispatchEvent(changeEvent);
              }

              return {
                selector: input.selector,
                filled: true,
              };
            } catch (err) {
              return {
                selector: input.selector,
                filled: false,
                error: err instanceof Error ? err.message : String(err),
              };
            }
          });

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

      submitForm: (params) => {
        try {
          const $ = window.$;
          if (!$) {
            return {
              success: false,
              message: "jQuery not loaded",
              submitted: false,
            };
          }

          const forms = $(params.selector);
          if (forms.length === 0) {
            return {
              success: false,
              message: `No forms found with selector: ${params.selector}`,
              submitted: false,
            };
          }

          const index = params.index || 0;
          if (index >= forms.length) {
            return {
              success: false,
              message: `Index ${index} out of bounds (found ${forms.length} forms)`,
              submitted: false,
            };
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
            return {
              success: true,
              message: `Clicked submit button to submit form at index ${index}`,
              submitted: true,
            };
          }

          return {
            success: false,
            message: `No submit button found in form at index ${index}`,
            submitted: false,
          };
        } catch (error) {
          return {
            success: false,
            message: error instanceof Error ? error.message : String(error),
            submitted: false,
          };
        }
      },

      getPageStructure: (params) => {
        try {
          const $ = window.$;
          if (!$) {
            return {
              success: false,
              structure: { forms: [], buttons: [], links: [] },
            };
          }

          // Get forms
          const forms = $("form")
            .map(function (this: any, index: number) {
              const $form = $(this);
              const formSelector = `form:eq(${index})`;

              const fields = $form
                .find("input, textarea, select")
                .map(function (this: any) {
                  const $field = $(this);
                  return {
                    type:
                      $field.attr("type") ||
                      $field.prop("tagName").toLowerCase(),
                    name: $field.attr("name"),
                    id: $field.attr("id"),
                    placeholder: $field.attr("placeholder"),
                    value: params.includeText ? $field.val() : undefined,
                  };
                })
                .get();

              const buttons = $form
                .find('button, input[type="submit"], input[type="button"]')
                .map(function (this: any, idx: number) {
                  const $btn = $(this);
                  return {
                    type: $btn.attr("type") || "button",
                    text: params.includeText
                      ? $btn.text() || $btn.val()
                      : undefined,
                    selector: `${formSelector} button:eq(${idx})`,
                  };
                })
                .get();

              return {
                selector: formSelector,
                fields,
                buttons,
              };
            })
            .get();

          // Get standalone buttons
          const buttons = $(
            'button:not(form button), input[type="button"]:not(form input), input[type="submit"]:not(form input)',
          )
            .map(function (this: any, index: number) {
              const $btn = $(this);
              return {
                selector: `button:eq(${index})`,
                text: params.includeText
                  ? $btn.text() || $btn.val()
                  : undefined,
                type: $btn.attr("type") || "button",
              };
            })
            .get();

          // Get links
          const links = $("a")
            .map(function (this: any, index: number) {
              const $link = $(this);
              return {
                selector: `a:eq(${index})`,
                text: params.includeText ? $link.text() : undefined,
                href: $link.attr("href"),
              };
            })
            .get();

          return {
            success: true,
            structure: { forms, buttons, links },
          };
        } catch {
          return {
            success: false,
            structure: { forms: [], buttons: [], links: [] },
          };
        }
      },

      highlightElement: (params) => {
        try {
          const $ = window.$;
          if (!$) {
            return {
              success: false,
              message: "jQuery not loaded",
              highlighted: 0,
            };
          }

          const elements = $(params.selector);
          if (elements.length === 0) {
            return {
              success: false,
              message: `No elements found with selector: ${params.selector}`,
              highlighted: 0,
            };
          }

          // Store original styles
          elements.each(function (this: any) {
            const $el = $(this);
            $el.data("original-outline", $el.css("outline"));
            $el.css("outline", `3px solid ${params.color || "#ff0000"}`);
          });

          // Remove highlight after duration
          setTimeout(() => {
            elements.each(function (this: any) {
              const $el = $(this);
              const originalOutline = $el.data("original-outline");
              $el.css("outline", originalOutline || "");
            });
          }, params.duration || 3000);

          return {
            success: true,
            message: `Highlighted ${elements.length} element(s)`,
            highlighted: elements.length,
          };
        } catch (error) {
          return {
            success: false,
            message: error instanceof Error ? error.message : String(error),
            highlighted: 0,
          };
        }
      },

      waitForElement: async (params) => {
        try {
          const $ = window.$;
          if (!$) {
            return {
              success: false,
              found: false,
              message: "jQuery not loaded",
            };
          }

          const timeout = params.timeout || 5000;
          const startTime = Date.now();

          while (Date.now() - startTime < timeout) {
            if ($(params.selector).length > 0) {
              return {
                success: true,
                found: true,
                message: `Element found: ${params.selector}`,
              };
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          return {
            success: false,
            found: false,
            message: `Timeout waiting for element: ${params.selector}`,
          };
        } catch (error) {
          return {
            success: false,
            found: false,
            message: error instanceof Error ? error.message : String(error),
          };
        }
      },

      getPageOverview: (params) => {
        try {
          const $ = window.$;
          if (!$) {
            return {
              success: false,
              title: undefined,
              sections: [],
              globalElements: { forms: [] },
            };
          }

          // Helper to check if element is visible
          const isVisible = (el: HTMLElement) => {
            if (!params.visibleOnly) return true;
            const rect = el.getBoundingClientRect();
            return rect.height > 0 && rect.width > 0 && 
                   rect.top < window.innerHeight && 
                   rect.bottom > 0;
          };

          // Helper to get unique selector
          const getUniqueSelector = (el: HTMLElement): string => {
            if (el.id) return `#${el.id}`;
            
            let selector = el.tagName.toLowerCase();
            if (el.className) {
              const classes = el.className.split(' ').filter(c => c.trim());
              if (classes.length > 0) {
                selector += '.' + classes.join('.');
              }
            }
            
            // Make it unique by adding index if needed
            const siblings = $(el.parentElement).children(selector);
            if (siblings.length > 1) {
              const index = siblings.index(el);
              selector += `:eq(${index})`;
            }
            
            // Add parent context if still not unique
            if ($(selector).length > 1 && el.parentElement) {
              const parentSelector = getUniqueSelector(el.parentElement as HTMLElement);
              selector = `${parentSelector} > ${selector}`;
            }
            
            return selector;
          };

          // Helper to truncate text
          const truncateText = (text: string, maxLength: number) => {
            if (!text || text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
          };

          // Get page title
          const title = $('title').text() || $('h1').first().text() || '';

          // Determine which headings to include
          const headingSelector = 
            params.includeHeadings === 'h1' ? 'h1' :
            params.includeHeadings === 'h1-h2' ? 'h1, h2' :
            params.includeHeadings === 'h1-h3' ? 'h1, h2, h3' :
            'h1, h2, h3, h4, h5, h6';

          // Build sections based on headings and major containers
          const sections: any[] = [];
          const processedElements = new Set<HTMLElement>();

          // Process headings and their associated content
          $(headingSelector).each(function(this: any) {
            const heading = this as HTMLElement;
            if (!isVisible(heading) || processedElements.has(heading)) return;
            
            const $heading = $(heading);
            const level = parseInt(heading.tagName.substring(1));
            const headingText = $heading.text().trim();
            const selector = getUniqueSelector(heading);
            
            // Find the section container (parent that contains content)
            let $section = $heading.parent();
            while ($section.length > 0 && $section[0].tagName.toLowerCase() === 'span') {
              $section = $section.parent();
            }
            
            const sectionEl = $section[0] as HTMLElement;
            const bounds = sectionEl.getBoundingClientRect();
            
            // Get metrics for this section
            const metrics = params.includeMetrics ? {
              forms: $section.find('form').length,
              buttons: $section.find('button, input[type="button"], input[type="submit"]').length,
              links: $section.find('a').length,
              inputs: $section.find('input, textarea, select').length,
              images: $section.find('img').length,
              lists: $section.find('ul, ol').length,
            } : undefined;
            
            // Get text preview
            const textPreview = params.includeText ? 
              truncateText($section.text().trim(), params.maxTextLength || 100) : 
              undefined;
            
            // Get interactive elements
            const interactiveElements: any[] = [];
            if (params.includeMetrics) {
              $section.find('button, input, select, textarea, a').each(function(this: any) {
                const el = this as HTMLElement;
                if (!isVisible(el)) return;
                
                const $el = $(el);
                const type = el.tagName.toLowerCase();
                const elemSelector = getUniqueSelector(el);
                
                interactiveElements.push({
                  type,
                  selector: elemSelector,
                  text: truncateText($el.text().trim() || $el.val() as string || '', 50),
                  label: $el.attr('aria-label') || $el.attr('placeholder') || 
                         $(`label[for="${$el.attr('id')}"]`).text() || undefined,
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
          $('main, article, section, [role="main"], .container, .content').each(function(this: any) {
            const container = this as HTMLElement;
            if (!isVisible(container) || processedElements.has(container)) return;
            
            const $container = $(container);
            if ($container.find(headingSelector).length > 0) return; // Skip if has headings
            
            const selector = getUniqueSelector(container);
            const bounds = container.getBoundingClientRect();
            
            const metrics = params.includeMetrics ? {
              forms: $container.find('form').length,
              buttons: $container.find('button, input[type="button"], input[type="submit"]').length,
              links: $container.find('a').length,
              inputs: $container.find('input, textarea, select').length,
              images: $container.find('img').length,
              lists: $container.find('ul, ol').length,
            } : undefined;
            
            if (metrics && Object.values(metrics).some(v => v > 0)) {
              sections.push({
                heading: container.getAttribute('aria-label') || container.className || container.tagName,
                level: 0,
                selector,
                bounds: {
                  top: Math.round(bounds.top),
                  left: Math.round(bounds.left),
                  width: Math.round(bounds.width),
                  height: Math.round(bounds.height),
                },
                metrics,
                textPreview: params.includeText ? 
                  truncateText($container.text().trim(), params.maxTextLength || 100) : 
                  undefined,
              });
            }
          });

          // Get global elements
          const globalElements = {
            navigation: (() => {
              const $nav = $('nav, [role="navigation"]').first();
              if ($nav.length > 0) {
                return {
                  present: true,
                  selector: getUniqueSelector($nav[0] as HTMLElement),
                  itemCount: $nav.find('a').length,
                };
              }
              return undefined;
            })(),
            forms: $('form').map(function(this: any) {
              const form = this as HTMLElement;
              const $form = $(form);
              const purpose = 
                $form.attr('aria-label') || 
                $form.find('h1, h2, h3').first().text() ||
                ($form.find('input[type="search"]').length > 0 ? 'search' : 'input');
              
              return {
                selector: getUniqueSelector(form),
                purpose: purpose || undefined,
              };
            }).get(),
            modals: (() => {
              const $modal = $('[role="dialog"], .modal:visible, .dialog:visible').first();
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
            title: title || undefined,
            sections,
            globalElements,
          };
        } catch (error) {
          return {
            success: false,
            title: undefined,
            sections: [],
            globalElements: { forms: [] },
          };
        }
      },

      inspectSection: (params) => {
        try {
          const $ = window.$;
          if (!$) {
            return {
              success: false,
              element: undefined,
              error: "jQuery not loaded",
            };
          }

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
            if (params.textLength === 'full') return fullText;
            if (params.textLength === 'summary') return fullText.substring(0, 50) + (fullText.length > 50 ? '...' : '');
            return fullText.substring(0, 200) + (fullText.length > 200 ? '...' : '');
          };

          // Helper to process children
          const processChildren = (el: HTMLElement, depth: number): any[] => {
            if (!params.includeChildren || depth >= (params.maxDepth || 3)) return [];
            
            const children: any[] = [];
            $(el).children().each(function(this: any) {
              const child = this as HTMLElement;
              const $child = $(child);
              
              children.push({
                tag: child.tagName.toLowerCase(),
                id: child.id || undefined,
                classes: child.className.split(' ').filter(c => c.trim()),
                text: getText(child),
                children: params.depth === 'deep' ? processChildren(child, depth + 1) : undefined,
              });
            });
            
            return children;
          };

          // Get interactive elements within
          const interactiveElements: any[] = [];
          $element.find('button, input, select, textarea, a').each(function(this: any) {
            const el = this as HTMLElement;
            const $el = $(el);
            
            const state: any = {};
            if (el.tagName.toLowerCase() === 'input') {
              state.value = $el.val();
              state.checked = $el.prop('checked');
              state.disabled = $el.prop('disabled');
            }
            
            interactiveElements.push({
              type: el.tagName.toLowerCase(),
              selector: `${params.selector} ${el.tagName.toLowerCase()}:eq(${$element.find(el.tagName).index(el)})`,
              label: $el.attr('aria-label') || $el.attr('placeholder') || 
                     $(`label[for="${$el.attr('id')}"]`).text() || undefined,
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
              classes: element.className.split(' ').filter(c => c.trim()),
              text: getText(element),
              attributes: (() => {
                const attrs: Record<string, string> = {};
                for (let i = 0; i < element.attributes.length; i++) {
                  const attr = element.attributes[i];
                  if (attr.name !== 'class' && attr.name !== 'id') {
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
    });
  }, []);

  const { messages, sendMessage, status, error, loadHistory, clear } =
    useChat(toolImplementations);

  // Get thread ID from URL
  const threadId = searchParams.get("copilotThreadId");

  // Initialize user ID, and load chat history on mount
  useEffect(() => {
    const userId = getUserId();
    const threadId = searchParams.get("copilotThreadId");
    setUserId(userId);
    if (userId && threadId) {
      loadHistory(threadId, userId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (threadId && threadId !== currentThreadId) {
      setCurrentThreadId(threadId);
      if (!threadId) {
        clear();
      }
    }
  }, [threadId, currentThreadId, clear]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status === "streaming") return;

    const userMessage = input;
    setInput("");
    await sendMessage(
      userMessage,
      currentThreadId ?? undefined,
      userId ?? undefined,
    );
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 z-50 flex items-center justify-center"
        aria-label="Toggle Copilot"
      >
        {isOpen ? (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        )}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-96 h-[600px] bg-white rounded-lg shadow-2xl z-50 flex flex-col">
          <div className="bg-blue-600 text-white p-4 rounded-t-lg">
            <h3 className="font-semibold">GenSX Copilot</h3>
            <p className="text-sm opacity-90">
              I can help you interact with this page
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) =>
              formatMessageContent(
                index,
                message,
                messages,
                expandedTools,
                setExpandedTools,
              ),
            )}
            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded-lg">
                {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="p-4 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me to interact with the page..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={status === "streaming"}
              />
              <button
                type="submit"
                disabled={status === "streaming"}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "streaming" ? "..." : "Send"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function formatMessageContent(
  index: number,
  message: CoreMessage,
  messages: CoreMessage[],
  expandedTools: Set<string>,
  setExpandedTools: React.Dispatch<React.SetStateAction<Set<string>>>,
) {
  if (message.role === "system" || message.role === "tool") {
    return null;
  }

  if (message.role === "user") {
    return formatUserContent(index, message);
  }
  return formatAssistantContent(
    index,
    message,
    messages,
    expandedTools,
    setExpandedTools,
  );
}

function formatUserContent(index: number, message: CoreUserMessage) {
  const content =
    typeof message.content === "string"
      ? message.content
      : message.content
          .map((part) => {
            if ("text" in part) {
              return part.text;
            }
            if (typeof part === "string") {
              return part;
            }
            return "";
          })
          .join("");

  return (
    <div key={index} className="flex justify-end">
      <div className="max-w-[80%] p-3 rounded-lg bg-blue-600 text-white">
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

function formatAssistantContent(
  index: number,
  message: CoreAssistantMessage,
  messages: CoreMessage[],
  expandedTools: Set<string>,
  setExpandedTools: React.Dispatch<React.SetStateAction<Set<string>>>,
) {
  if (typeof message.content === "string") {
    return <div key={index}>{message.content}</div>;
  }
  const toolResults = messages.flatMap((m) => {
    if (m.role === "tool") {
      return m.content;
    }
    return [];
  });

  let textContent = "";
  const toolCalls: {
    toolCallId: string;
    toolName: string;
    args: unknown;
    result?: unknown;
  }[] = [];
  for (const part of message.content) {
    if ("text" in part) {
      textContent += part.text;
    } else if (typeof part === "string") {
      textContent += part;
    } else if (part.type === "tool-call") {
      const result = toolResults.find((r) => r.toolCallId === part.toolCallId);

      toolCalls.push({
        toolCallId: part.toolCallId,
        toolName: part.toolName,
        args: part.args,
        result: result?.result,
      });
    }
  }
  const toggleTool = (toolCallId: string) => {
    setExpandedTools((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(toolCallId)) {
        newSet.delete(toolCallId);
      } else {
        newSet.add(toolCallId);
      }
      return newSet;
    });
  };

  return (
    <div key={index} className="flex justify-start">
      <div className="max-w-[80%] p-3 rounded-lg bg-gray-100 text-gray-800">
        {textContent && (
          <p className="whitespace-pre-wrap mb-2">{textContent}</p>
        )}
        {toolCalls.length > 0 && (
          <div className="space-y-2">
            {toolCalls.map((call) => {
              const isExpanded = expandedTools.has(call.toolCallId);
              return (
                <div
                  key={call.toolCallId}
                  className="border border-gray-300 rounded-md overflow-hidden"
                >
                  <button
                    onClick={() => toggleTool(call.toolCallId)}
                    className="w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-sm"
                  >
                    <span className="font-medium">{call.toolName}</span>
                    <svg
                      className={`w-4 h-4 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {isExpanded && (
                    <div className="p-3 bg-white border-t border-gray-300">
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-1">
                            Input:
                          </p>
                          <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(call.args, null, 2)}
                          </pre>
                        </div>
                        {call.result !== undefined && (
                          <div>
                            <p className="text-xs font-semibold text-gray-600 mb-1">
                              Output:
                            </p>
                            <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                              {JSON.stringify(call.result, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

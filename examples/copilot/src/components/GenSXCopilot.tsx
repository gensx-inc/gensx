/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { createToolImplementations } from "@gensx/react";
import { CoreAssistantMessage, CoreMessage, CoreUserMessage } from "ai";

import { useChat } from "../hooks/useChat";
import type { ToolBox } from "../../gensx/tools/toolbox";

declare global {
  interface Window {
    jQuery: any;
    $: any;
  }
}

export default function GenSXCopilot() {
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
          if (element.is("a") && element.attr("href") && !element.attr("href").startsWith("#")) {
            // For links, prevent default to avoid navigation
            const clickEvent = $.Event("click");
            element.trigger(clickEvent);
            if (!clickEvent.isDefaultPrevented()) {
              console.warn(`Clicking link with href: ${element.attr("href")} - navigation prevented`);
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

              $el.val(input.value);
              if (input.triggerEvents !== false) {
                $el.trigger("change").trigger("input");
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
          const submitButton = form.find('button[type="submit"], input[type="submit"], button:not([type])').first();
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
    });
  }, []);

  const { messages, sendMessage, status, error } = useChat(toolImplementations);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status === "streaming") return;

    const userMessage = input;
    setInput("");
    await sendMessage(userMessage);
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
              formatMessageContent(index, message, messages),
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
) {
  if (message.role === "system" || message.role === "tool") {
    return null;
  }

  if (message.role === "user") {
    return formatUserContent(index, message);
  }
  return formatAssistantContent(index, message, messages);
}

function formatUserContent(index: number, message: CoreUserMessage) {
  if (typeof message.content === "string") {
    return <div key={index}>{message.content}</div>;
  }
  return (
    <div key={index}>
      {message.content
        .map((part) => {
          if ("text" in part) {
            return part.text;
          }
          if (typeof part === "string") {
            return part;
          }
          return "";
        })
        .join("")}
    </div>
  );
}

function formatAssistantContent(
  index: number,
  message: CoreAssistantMessage,
  messages: CoreMessage[],
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
  return (
    <div key={index}>
      <p>{textContent}</p>
      <div>
        {/** todo: expandable to show args and result */}
        {toolCalls.map((call) => (
          <div key={call.toolCallId}>{call.toolName}</div>
        ))}
      </div>
    </div>
  );
}

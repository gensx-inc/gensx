import { createToolBox } from "@gensx/core";
import { z } from "zod";

export const toolbox = createToolBox({
  fetchPageContent: {
    description: "Fetch the html content of the current page",
    params: z
      .object({
        dummy: z
          .string()
          .optional()
          .describe("This is a dummy parameter to pass through to the tool."),
      })
      .passthrough()
      .optional(),
    result: z.object({
      success: z.boolean(),
      url: z.string().describe("The url of the current page"),
      content: z.string().describe("The html content of the current page"),
    }),
  },

  findInteractiveElements: {
    description:
      "Show interactive elements on the page (buttons, links, inputs, etc.)",
    params: z.object({
      dummy: z
        .string()
        .optional()
        .describe("This is a dummy parameter to pass through to the tool."),
    }),
    result: z.object({
      success: z.boolean(),
      elements: z
        .array(
          z.object({
            selector: z.string(),
            type: z.string(),
            text: z.string(),
            href: z.string().optional(),
            value: z.string().optional(),
          }),
        )
        .describe("The interactive elements on the page"),
    }),
  },

  inspectElements: {
    description:
      "Inspect multiple elements on the page using jQuery selectors and get their properties",
    params: z.object({
      elements: z
        .array(
          z.object({
            selector: z.string().describe("jQuery selector to find elements"),
            properties: z
              .array(z.string())
              .optional()
              .describe(
                "List of properties to retrieve from the element. Valid values are: text, value, html, attr, css, data.",
              ),
            attributeName: z
              .string()
              .optional()
              .describe(
                "Specific attribute name when properties includes 'attr'",
              ),
            cssProperty: z
              .string()
              .optional()
              .describe("Specific CSS property when properties includes 'css'"),
            dataKey: z
              .string()
              .optional()
              .describe("Specific data key when properties includes 'data'"),
          }),
        )
        .describe("Array of elements to inspect"),
    }),
    result: z.object({
      success: z.boolean(),
      inspections: z.array(
        z.object({
          selector: z.string(),
          success: z.boolean(),
          count: z.number().describe("Number of elements found"),
          elements: z.array(
            z.object({
              index: z.number(),
              text: z.string().optional(),
              value: z.string().optional(),
              html: z.string().optional(),
              attributes: z.record(z.string()).optional(),
              css: z.record(z.string()).optional(),
              data: z.record(z.any()).optional(),
            }),
          ),
          error: z.string().optional(),
        }),
      ),
      message: z.string(),
    }),
  },

  clickElements: {
    description:
      "Click on multiple elements using jQuery selectors in sequence with automatic delays for React state updates",
    params: z.object({
      elements: z
        .array(
          z.object({
            selector: z
              .string()
              .describe("jQuery selector to find the element"),
            index: z
              .number()
              .optional()
              .default(0)
              .describe("Index of element if multiple match (0-based)"),
            delay: z
              .number()
              .optional()
              .default(0)
              .describe("Delay in milliseconds before clicking this element"),
          }),
        )
        .describe("Array of elements to click"),
    }),
    result: z.object({
      success: z.boolean(),
      clicks: z.array(
        z.object({
          selector: z.string(),
          clicked: z.boolean(),
          error: z.string().optional(),
        }),
      ),
      message: z.string(),
    }),
  },

  fillTextInputs: {
    description:
      "Fill multiple text inputs and textareas with values, with automatic delays for React state updates",
    params: z.object({
      inputs: z
        .array(
          z.object({
            selector: z
              .string()
              .describe("jQuery selector for the text input or textarea"),
            value: z.string().describe("Text value to enter"),
            triggerEvents: z
              .boolean()
              .optional()
              .default(true)
              .describe("Whether to trigger change/input events for React"),
          }),
        )
        .describe("Array of text inputs to fill"),
    }),
    result: z.object({
      success: z.boolean(),
      filled: z.array(
        z.object({
          selector: z.string(),
          filled: z.boolean(),
          error: z.string().optional(),
        }),
      ),
      message: z.string(),
    }),
  },

  selectOptions: {
    description:
      "Select options from multiple dropdown/select elements, with automatic delays for React state updates",
    params: z.object({
      selects: z
        .array(
          z.object({
            selector: z
              .string()
              .describe("jQuery selector for the select element"),
            value: z
              .string()
              .describe("Option value to select (not display text)"),
            triggerEvents: z
              .boolean()
              .optional()
              .default(true)
              .describe("Whether to trigger change events for React"),
          }),
        )
        .describe("Array of select elements to update"),
    }),
    result: z.object({
      success: z.boolean(),
      selected: z.array(
        z.object({
          selector: z.string(),
          selected: z.boolean(),
          error: z.string().optional(),
        }),
      ),
      message: z.string(),
    }),
  },

  toggleCheckboxes: {
    description:
      "Check or uncheck multiple checkbox and radio button elements, with automatic delays for React state updates",
    params: z.object({
      checkboxes: z
        .array(
          z.object({
            selector: z
              .string()
              .describe("jQuery selector for the checkbox/radio"),
            checked: z
              .boolean()
              .describe("Whether to check (true) or uncheck (false)"),
          }),
        )
        .describe("Array of checkboxes to toggle"),
    }),
    result: z.object({
      success: z.boolean(),
      toggled: z.array(
        z.object({
          selector: z.string(),
          toggled: z.boolean(),
          finalState: z.boolean().optional().describe("Final checked state"),
          error: z.string().optional(),
        }),
      ),
      message: z.string(),
    }),
  },

  submitForms: {
    description:
      "Submit multiple forms using jQuery selectors with optional delays",
    params: z.object({
      forms: z
        .array(
          z.object({
            selector: z.string().describe("jQuery selector for the form"),
            index: z
              .number()
              .optional()
              .default(0)
              .describe("Index of form if multiple match (0-based)"),
            delay: z
              .number()
              .optional()
              .default(0)
              .describe("Delay in milliseconds before submitting this form"),
          }),
        )
        .describe("Array of forms to submit"),
    }),
    result: z.object({
      success: z.boolean(),
      submissions: z.array(
        z.object({
          selector: z.string(),
          submitted: z.boolean(),
          error: z.string().optional(),
        }),
      ),
      message: z.string(),
    }),
  },

  highlightElements: {
    description:
      "Highlight multiple elements on the page to show the user what you're looking at",
    params: z.object({
      elements: z
        .array(
          z.object({
            selector: z.string().describe("jQuery selector for the element"),
            color: z
              .string()
              .optional()
              .default("#ff0000")
              .describe("Highlight color (hex or color name)"),
            duration: z
              .number()
              .optional()
              .default(3000)
              .describe("Duration in milliseconds to show highlight"),
          }),
        )
        .describe("Array of elements to highlight"),
    }),
    result: z.object({
      success: z.boolean(),
      highlights: z.array(
        z.object({
          selector: z.string(),
          highlighted: z.number().describe("Number of elements highlighted"),
          error: z.string().optional(),
        }),
      ),
      message: z.string(),
    }),
  },

  waitForElements: {
    description: "Wait for multiple elements to appear on the page",
    params: z.object({
      elements: z
        .array(
          z.object({
            selector: z.string().describe("jQuery selector to wait for"),
            timeout: z
              .number()
              .optional()
              .default(5000)
              .describe("Maximum time to wait in milliseconds"),
          }),
        )
        .describe("Array of elements to wait for"),
    }),
    result: z.object({
      success: z.boolean(),
      waits: z.array(
        z.object({
          selector: z.string(),
          found: z.boolean(),
          error: z.string().optional(),
        }),
      ),
      message: z.string(),
    }),
  },

  getPageOverview: {
    description:
      "Get a hierarchical overview of the page structure with reliable selectors for each section",
    params: z
      .object({
        includeHeadings: z
          .enum(["h1", "h1-h2", "h1-h3", "all"])
          .optional()
          .default("h1-h2")
          .describe("Which heading levels to include in the overview"),
        includeText: z
          .boolean()
          .optional()
          .default(true)
          .describe("Include text snippets from elements"),
        includeMetrics: z
          .boolean()
          .optional()
          .default(true)
          .describe("Include counts of interactive elements"),
        visibleOnly: z
          .boolean()
          .optional()
          .default(true)
          .describe("Only include visible elements"),
        maxTextLength: z
          .number()
          .optional()
          .default(100)
          .describe("Maximum length of text snippets"),
      })
      .passthrough(),
    result: z.object({
      success: z.boolean(),
      url: z.string(),
      title: z.string().optional(),
      sections: z.array(
        z.object({
          heading: z.string().optional(),
          level: z.number().optional(),
          selector: z.string().describe("Unique selector for this section"),
          bounds: z
            .object({
              top: z.number(),
              left: z.number(),
              width: z.number(),
              height: z.number(),
            })
            .optional(),
          metrics: z
            .object({
              forms: z.number(),
              buttons: z.number(),
              links: z.number(),
              inputs: z.number(),
              images: z.number(),
              lists: z.number(),
            })
            .optional(),
          textPreview: z.string().optional(),
          subsections: z.array(z.any()).optional(),
          interactiveElements: z
            .array(
              z.object({
                type: z.string(),
                selector: z.string(),
                text: z.string().optional(),
                label: z.string().optional(),
              }),
            )
            .optional(),
        }),
      ),
      globalElements: z.object({
        navigation: z
          .object({
            present: z.boolean(),
            selector: z.string().optional(),
            itemCount: z.number(),
          })
          .optional(),
        forms: z.array(
          z.object({
            selector: z.string(),
            purpose: z.string().optional(),
          }),
        ),
        modals: z
          .object({
            open: z.boolean(),
            selector: z.string().optional(),
          })
          .optional(),
      }),
    }),
  },

  inspectSection: {
    description:
      "Get detailed information about a specific section or element on the page",
    params: z.object({
      selector: z
        .string()
        .describe("jQuery selector from getPageOverview or custom"),
      depth: z
        .enum(["shallow", "deep"])
        .optional()
        .default("shallow")
        .describe("How deep to traverse child elements"),
      includeChildren: z
        .boolean()
        .optional()
        .default(true)
        .describe("Include information about child elements"),
      textLength: z
        .enum(["full", "truncated", "summary"])
        .optional()
        .default("truncated")
        .describe("How much text content to include"),
      maxDepth: z
        .number()
        .optional()
        .default(3)
        .describe("Maximum depth to traverse"),
    }),
    result: z.object({
      success: z.boolean(),
      element: z
        .object({
          tag: z.string(),
          selector: z.string(),
          id: z.string().optional(),
          classes: z.array(z.string()),
          text: z.string().optional(),
          attributes: z.record(z.string()).optional(),
          bounds: z.object({
            top: z.number(),
            left: z.number(),
            width: z.number(),
            height: z.number(),
            visible: z.boolean(),
          }),
          children: z.array(z.any()).optional(),
          interactiveElements: z.array(
            z.object({
              type: z.string(),
              selector: z.string(),
              label: z.string().optional(),
              text: z.string().optional(),
              state: z.record(z.any()).optional(),
            }),
          ),
        })
        .optional(),
      error: z.string().optional(),
    }),
  },

  navigate: {
    description:
      "Navigate the browser using browser navigation (back, forward) or to a specific path",
    params: z.object({
      action: z
        .enum(["back", "forward", "path"])
        .describe(
          "Navigation action to perform. 'path' is used to navigate to a specific path.",
        ),
      path: z
        .string()
        .optional()
        .describe(
          "The path to navigate to. This is used when action is 'path'.",
        ),
      waitForLoad: z
        .boolean()
        .optional()
        .default(true)
        .describe(
          "Whether to wait for the page to load after navigation. Default is true.",
        ),
      timeout: z
        .number()
        .optional()
        .default(5000)
        .describe(
          "Maximum time to wait for page load in milliseconds. Default is 5000.",
        ),
    }),
    result: z.object({
      success: z.boolean(),
      action: z.string(),
      currentUrl: z
        .string()
        .optional()
        .describe("Current URL after navigation"),
      previousUrl: z.string().optional().describe("URL before navigation"),
      loadTime: z
        .number()
        .optional()
        .describe("Time taken for navigation in milliseconds"),
      message: z.string(),
      error: z.string().optional(),
    }),
  },
});

export type ToolBox = typeof toolbox;

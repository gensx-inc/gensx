import { createToolBox } from "@gensx/core";
import { z } from "zod";

export const toolbox = createToolBox({
  inspectElement: {
    description: "Inspect elements on the page using jQuery selector and get their properties",
    params: z.object({
      selector: z.string().describe("jQuery selector to find elements"),
      properties: z
        .array(z.enum(["text", "value", "html", "attr", "css", "data"]))
        .optional()
        .describe("Properties to retrieve from the element"),
      attributeName: z
        .string()
        .optional()
        .describe("Specific attribute name when properties includes 'attr'"),
      cssProperty: z
        .string()
        .optional()
        .describe("Specific CSS property when properties includes 'css'"),
      dataKey: z
        .string()
        .optional()
        .describe("Specific data key when properties includes 'data'"),
    }),
    result: z.object({
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
        })
      ),
      error: z.string().optional(),
    }),
  },

  clickElement: {
    description: "Click on an element using jQuery selector",
    params: z.object({
      selector: z.string().describe("jQuery selector to find the element"),
      index: z
        .number()
        .optional()
        .default(0)
        .describe("Index of element if multiple match (0-based)"),
    }),
    result: z.object({
      success: z.boolean(),
      message: z.string(),
      clicked: z.boolean(),
    }),
  },

  fillForm: {
    description: "Fill form inputs with values using jQuery selectors",
    params: z.object({
      inputs: z
        .array(
          z.object({
            selector: z.string().describe("jQuery selector for the input"),
            value: z.string().describe("Value to set"),
            triggerEvents: z
              .boolean()
              .optional()
              .default(true)
              .describe("Whether to trigger change/input events"),
          })
        )
        .describe("Array of inputs to fill"),
    }),
    result: z.object({
      success: z.boolean(),
      filled: z.array(
        z.object({
          selector: z.string(),
          filled: z.boolean(),
          error: z.string().optional(),
        })
      ),
      message: z.string(),
    }),
  },

  submitForm: {
    description: "Submit a form using jQuery selector",
    params: z.object({
      selector: z.string().describe("jQuery selector for the form"),
      index: z
        .number()
        .optional()
        .default(0)
        .describe("Index of form if multiple match (0-based)"),
    }),
    result: z.object({
      success: z.boolean(),
      message: z.string(),
      submitted: z.boolean(),
    }),
  },

  getPageStructure: {
    description: "Get a high-level structure of the page including forms, buttons, and interactive elements",
    params: z.object({
      includeText: z
        .boolean()
        .optional()
        .default(false)
        .describe("Include text content of elements"),
    }),
    result: z.object({
      success: z.boolean(),
      structure: z.object({
        forms: z.array(
          z.object({
            selector: z.string(),
            fields: z.array(
              z.object({
                type: z.string(),
                name: z.string().optional(),
                id: z.string().optional(),
                placeholder: z.string().optional(),
                value: z.string().optional(),
              })
            ),
            buttons: z.array(
              z.object({
                type: z.string(),
                text: z.string().optional(),
                selector: z.string(),
              })
            ),
          })
        ),
        buttons: z.array(
          z.object({
            selector: z.string(),
            text: z.string().optional(),
            type: z.string().optional(),
          })
        ),
        links: z.array(
          z.object({
            selector: z.string(),
            text: z.string().optional(),
            href: z.string().optional(),
          })
        ),
      }),
    }),
  },

  highlightElement: {
    description: "Highlight an element on the page to show the user what you're looking at",
    params: z.object({
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
    result: z.object({
      success: z.boolean(),
      message: z.string(),
      highlighted: z.number().describe("Number of elements highlighted"),
    }),
  },

  waitForElement: {
    description: "Wait for an element to appear on the page",
    params: z.object({
      selector: z.string().describe("jQuery selector to wait for"),
      timeout: z
        .number()
        .optional()
        .default(5000)
        .describe("Maximum time to wait in milliseconds"),
    }),
    result: z.object({
      success: z.boolean(),
      found: z.boolean(),
      message: z.string(),
    }),
  },

  getPageOverview: {
    description: "Get a hierarchical overview of the page structure with reliable selectors for each section",
    params: z.object({
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
    }),
    result: z.object({
      success: z.boolean(),
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
              })
            )
            .optional(),
        })
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
          })
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
    description: "Get detailed information about a specific section or element on the page",
    params: z.object({
      selector: z.string().describe("jQuery selector from getPageOverview or custom"),
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
            })
          ),
        })
        .optional(),
      error: z.string().optional(),
    }),
  },
});

export type ToolBox = typeof toolbox;
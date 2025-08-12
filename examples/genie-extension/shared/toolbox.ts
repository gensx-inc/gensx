import { createToolBox } from "@gensx/core";
import { z } from "zod";

export const toolbox = createToolBox({
  fetchPageHtml: {
    description: "Fetch the HTML content of a page from a specific tab.",
    params: z.object({
      tabId: z.number().describe("The ID of the tab to fetch content from."),
    }),
    result: z.object({
      success: z.boolean(),
      url: z.string().optional().describe("The url of the page"),
      content: z.string().optional().describe("The HTML content of the page"),
      error: z.string().optional().describe("Error message if operation failed"),
    }),
  },

  getCurrentUrl: {
    description: "Get the current url of a specific tab.",
    params: z.object({
      tabId: z.number().describe("The ID of the tab to get URL from."),
    }),
    result: z.object({
      success: z.boolean(),
      url: z.string().optional().describe("The url of the page"),
      error: z.string().optional().describe("Error message if operation failed"),
    }),
  },

  findInteractiveElements: {
    description:
      "Show interactive elements on a specific tab (buttons, links, inputs, etc.).",
    params: z.object({
      tabId: z.number().describe("The ID of the tab to search in."),
      textToFilter: z.array(z.string()).describe("Return only elements that contain any of the text in this array.").optional(),
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
            role: z.string().optional().describe("ARIA role attribute indicating element purpose"),
            ariaAttributes: z.record(z.string()).optional().describe("ARIA attributes for accessibility (aria-label, aria-describedby, etc.)"),
            title: z.string().optional().describe("Title attribute for additional context"),
            alt: z.string().optional().describe("Alt text for images"),
          }),
        )
        .describe("The interactive elements on the page with ARIA and accessibility information").optional(),
      error: z.string().optional().describe("Error message if operation failed"),
    }),
  },

  inspectElements: {
    description:
      "Get detailed properties from specific elements using jQuery selectors. Returns only elements that contain the requested data (filters out empty results). Use this when you need specific property values from known elements, not for discovery.",
    params: z.object({
      tabId: z.number().describe("The ID of the tab to inspect elements in."),
      elements: z
        .array(
          z.object({
            selector: z.string().describe("jQuery selector to find elements"),
            properties: z
              .array(z.string())
              .optional()
              .describe(
                "Properties to retrieve. Options: 'text' (text content), 'value' (form values), 'attr' (attributes), 'css' (styles), 'data' (data attributes). If not specified, returns a summary. Results are filtered to only include elements with non-empty requested properties.",
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
          count: z.number().describe("Number of elements returned (after filtering empty results)"),
          originalCount: z.number().optional().describe("Original number of elements found before filtering (only shown if different from count)"),
          elements: z.array(
            z.object({
              index: z.number(),
              text: z.string().optional(),
              value: z.string().optional(),
              summary: z.string().optional().describe("Element summary (when no properties specified)"),
              children: z.array(z.object({
                tag: z.string(),
                selector: z.string(),
                text: z.string().optional(),
                count: z.number().optional()
              })).optional().describe("Child elements summary"),
              attributes: z.record(z.string()).optional(),
              css: z.record(z.string()).optional(),
              data: z.record(z.any()).optional(),
            }),
          ),
          error: z.string().optional(),
        }),
      ).optional(),
      message: z.string().optional(),
      error: z.string().optional().describe("Error message if operation failed"),
    }),
  },

  clickElements: {
    description:
      "Click on multiple elements using jQuery selectors in sequence with automatic delays for React state updates on a specific tab.",
    params: z.object({
      tabId: z.number().describe("The ID of the tab to perform clicks in."),
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
      ).optional(),
      message: z.string().optional(),
      error: z.string().optional().describe("Error message if operation failed"),
    }),
  },

  fillTextInputs: {
    description:
      "Fill multiple text inputs and textareas with values, with automatic delays for React state updates. Requires a tabId to specify which browser tab to interact with.",
    params: z.object({
      tabId: z
        .number()
        .describe("REQUIRED: The ID of the browser tab containing the input elements to fill."),
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
      "Select options from multiple dropdown/select elements, with automatic delays for React state updates. Requires a tabId to specify which browser tab to interact with.",
    params: z.object({
      tabId: z
        .number()
        .describe("REQUIRED: The ID of the browser tab containing the select elements."),
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
      "Check or uncheck multiple checkbox and radio button elements, with automatic delays for React state updates. Requires a tabId to specify which browser tab to interact with.",
    params: z.object({
      tabId: z
        .number()
        .describe("REQUIRED: The ID of the browser tab containing the checkbox elements."),
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
      "Submit multiple forms using jQuery selectors with optional delays. Requires a tabId to specify which browser tab to interact with.",
    params: z.object({
      tabId: z
        .number()
        .describe("REQUIRED: The ID of the browser tab containing the form elements."),
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

  waitForElements: {
    description: "Wait for multiple elements to appear on the page. Requires a tabId to specify which browser tab to monitor.",
    params: z.object({
      tabId: z
        .number()
        .describe("REQUIRED: The ID of the browser tab to wait for elements in."),
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

  findElementsByText: {
    description: "Find specific elements containing text content. Returns only the deepest elements that directly contain the text, not their parent containers.",
    params: z.object({
      tabId: z.number().describe("The ID of the tab to search in."),
      content: z.array(z.string()).describe("The text content to search for in elements"),
    }),
    result: z.object({
      success: z.boolean(),
      elements: z.array(z.object({
        selector: z.string().describe("CSS selector to uniquely identify the element"),
        text: z.string().describe("The actual text content found in the element"),
        matchedTerm: z.string().describe("Which search term matched this element"),
        elementType: z.string().describe("HTML tag name of the element"),
      })).optional().describe("Array of specific elements containing the search text"),
      totalFound: z.number().optional().describe("Total number of elements found (before any limits)"),
      error: z.string().optional().describe("Error message if operation failed"),
    }),
  },

  navigate: {
    description:
      "Navigate an existing browser tab to a specific page using a url or a relative path. Requires a tabId to specify which tab to navigate. Alternative: use openTab tool instead to open a new tab directly to the destination URL.",
    params: z.object({
      tabId: z
        .number()
        .describe("REQUIRED: The ID of the existing browser tab to navigate. If you need a new tab, use openTab tool instead."),
      action: z
        .enum(["back", "forward", "path", "url"])
        .describe(
          "Navigation action: 'back' for browser back, 'forward' for browser forward, 'path' for relative path on same domain (/foo/bar), 'url' for absolute URL including different domains",
        ),
      path: z
        .string()
        .optional()
        .describe(
          "Relative path for 'path' action (e.g., '/dashboard', '/users/123'). Must start with '/'.",
        ),
      url: z
        .string()
        .optional()
        .describe(
          "Full URL for 'url' action (e.g., 'https://app.gensx.com', 'https://example.com/page'). Must include protocol.",
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

  getGeolocation: {
    description: "Get the user's current geolocation (latitude and longitude)",
    params: z.object({
      enableHighAccuracy: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to use high accuracy mode for geolocation"),
      timeout: z
        .number()
        .optional()
        .default(10000)
        .describe("Maximum time to wait for geolocation in milliseconds"),
      maximumAge: z
        .number()
        .optional()
        .default(300000)
        .describe("Maximum age of cached position in milliseconds (5 minutes default)"),
    }),
    result: z.object({
      success: z.boolean(),
      latitude: z.number().optional().describe("Latitude in decimal degrees"),
      longitude: z.number().optional().describe("Longitude in decimal degrees"),
      accuracy: z.number().optional().describe("Accuracy in meters"),
      altitude: z.number().optional().describe("Altitude in meters above sea level"),
      altitudeAccuracy: z.number().optional().describe("Altitude accuracy in meters"),
      heading: z.number().optional().describe("Heading in degrees from true north"),
      speed: z.number().optional().describe("Speed in meters per second"),
      timestamp: z.number().optional().describe("Timestamp when position was obtained"),
      error: z.string().optional().describe("Error message if geolocation failed"),
    }),
  },

  openTab: {
    description: "Open a new browser tab with a specified URL. Use this to show information or results to the user. You can also use this when you need to access a specific application that is not available in the selected tabs.",
    params: z.object({
      url: z
        .string()
        .describe("The URL to open in the new tab. Must be a valid HTTP/HTTPS URL."),
      active: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to make the new tab active (focused). Default is true."),
    }),
    result: z.object({
      success: z.boolean(),
      tabId: z.number().optional().describe("The ID of the newly created tab"),
      url: z.string().optional().describe("The URL that was opened"),
      title: z.string().optional().describe("The title of the new tab"),
      domain: z.string().optional().describe("The domain of the new tab"),
      message: z.string().optional().describe("Success or error message"),
      error: z.string().optional().describe("Error message if tab creation failed"),
    }),
  },

  closeTab: {
    description: "Close one or more browser tabs that were previously opened by the openTab tool. For security, this tool can ONLY close tabs that were created by the extension itself, not user's existing tabs.",
    params: z.object({
      tabIds: z
        .array(z.number())
        .min(1)
        .describe("Array of tab IDs to close. Pass a single-element array [tabId] to close one tab, or multiple IDs [tabId1, tabId2, ...] to close multiple tabs. All tabs must have been opened by the openTab tool."),
    }),
    result: z.object({
      success: z.boolean().describe("True if all tabs were successfully closed"),
      closedTabs: z.array(z.number()).optional().describe("Array of tab IDs that were successfully closed"),
      failedTabs: z.array(z.object({
        tabId: z.number(),
        error: z.string()
      })).optional().describe("Array of tabs that failed to close with error messages"),
      message: z.string().optional().describe("Summary message"),
      error: z.string().optional().describe("Error message if all tabs failed to close"),
    }),
  },

  captureElementScreenshot: {
    description: "Take a screenshot of a specific element on the page. Returns the image for visual analysis. Useful for understanding element appearance, layout, styling, or troubleshooting visual issues.",
    params: z.object({
      tabId: z.number().describe("The ID of the tab containing the element"),
      selector: z.string().describe("CSS selector of the element to capture"),
      scrollIntoView: z.boolean().optional().default(true).describe("Whether to scroll the element into view before capturing"),
    }),
    result: z.object({
      success: z.boolean(),
      image: z.string().optional().describe("Base64 data URL of the screenshot image"),
      message: z.string().optional().describe("Success message or additional info"),
      error: z.string().optional().describe("Error message if screenshot failed"),
    }),
  },
});

export type ToolBox = typeof toolbox;

const readonlyTools: (keyof ToolBox)[] = ["fetchPageHtml", "getCurrentUrl", "getGeolocation", "inspectElements", "findInteractiveElements", "findElementsByText", "captureElementScreenshot"];

export function getReadonlyTools() {
  return Object.fromEntries(Object.entries(toolbox).filter(([key]) => readonlyTools.includes(key as keyof ToolBox)));
}

export function getFilteredTools(toolsToRemove: (keyof ToolBox)[]) {
  return Object.fromEntries(Object.entries(toolbox).filter(([key]) => !toolsToRemove.includes(key as keyof ToolBox)));
}

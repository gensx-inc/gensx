/**
 * Toolbox definitions for the new architecture
 * Matches the tool surface specification from the rearchitecture document
 */

import { createToolBox } from "@gensx/core";
import { z } from "zod";

// Schema for RoleSelector
const RoleSelectorSchema = z.union([
  z.object({
    kind: z.literal('role'),
    role: z.string(),
    name: z.string().optional(),
    nameMode: z.enum(['exact', 'includes', 'regex']).optional(),
    pressed: z.boolean().optional(),
    disabled: z.boolean().optional(),
    withinLandmark: z.enum(['main', 'header', 'nav', 'footer', 'aside']).optional(),
    nth: z.number().optional(),
    framePath: z.array(z.string()).optional()
  }),
  z.object({
    kind: z.literal('text'),
    text: z.string(),
    withinLandmark: z.enum(['main', 'header', 'nav', 'footer', 'aside']).optional(),
    nth: z.number().optional(),
    framePath: z.array(z.string()).optional()
  }),
  z.object({
    kind: z.literal('css'),
    css: z.string(),
    framePath: z.array(z.string()).optional()
  })
]);

// Schema for MiniPCD
const MiniPCDSchema = z.object({
  url: z.string(),
  origin: z.string(),
  title: z.string(),
  loginState: z.enum(['unknown', 'in', 'out']),
  ts: z.number(),
  landmarks: z.array(z.enum(['main', 'header', 'nav', 'footer', 'aside'])),
  actions: z.array(z.object({
    id: z.string(),
    label: z.string(),
    role: z.enum(['button', 'link', 'menuitem', 'tab', 'checkbox', 'radio', 'other']),
    kind: z.string().optional(),
    landmark: z.enum(['main', 'header', 'nav', 'footer', 'aside']).optional(),
    aboveFold: z.boolean().optional(),
    clusterId: z.string().optional(),
    appliesToCollectionId: z.string().optional()
  })),
  forms: z.array(z.object({
    id: z.string(),
    purpose: z.string().optional(),
    landmark: z.enum(['main', 'header', 'nav', 'footer', 'aside']).optional(),
    fieldSummaries: z.array(z.object({
      name: z.string().optional(),
      label: z.string(),
      type: z.string(),
      required: z.boolean().optional()
    })),
    submitLabel: z.string().optional()
  })),
  collections: z.array(z.object({
    id: z.string(),
    name: z.string(),
    itemFields: z.array(z.string()),
    landmark: z.enum(['main', 'header', 'nav', 'footer', 'aside']).optional(),
    approxCount: z.number().optional()
  })),
  metrics: z.object({
    ariaCoverage: z.number().optional(),
    viewportH: z.number().optional(),
    viewportW: z.number().optional()
  }).optional()
});

// Schema for Observation
const ObservationSchema = z.object({
  url: z.string(),
  title: z.string(),
  ts: z.number(),
  urlChanged: z.boolean().optional(),
  collectionSummary: z.array(z.object({
    id: z.string(),
    count: z.number()
  })).optional(),
  focusedRole: z.string().optional()
});

// Schema for PCDActionDetail
const PCDActionDetailSchema = z.object({
  id: z.string(),
  selector: RoleSelectorSchema,
  altSelectors: z.array(RoleSelectorSchema).optional(),
  landmark: z.enum(['main', 'header', 'nav', 'footer', 'aside']).optional(),
  framePath: z.array(z.string()).optional()
});

/**
 * New toolbox matching the specification
 */
export const toolbox = createToolBox({
  
  // Read Tools
  getMiniPCD: {
    description: "Get current MiniPCD (Page Capability Description) - compact summary of page affordances",
    params: z.object({}),
    result: z.object({
      ok: z.boolean(),
      data: MiniPCDSchema.optional(),
      error: z.string().optional(),
      retryable: z.boolean().optional(),
      code: z.string().optional()
    })
  },

  'pcd.query': {
    description: "Query MiniPCD for specific elements using text search and filters",
    params: z.object({
      kind: z.enum(['action', 'form', 'collection']).optional().describe("Filter by element type"),
      text: z.string().optional().describe("Search text for relevance matching"),
      topK: z.number().optional().default(10).describe("Maximum number of results to return")
    }),
    result: z.object({
      ok: z.boolean(),
      data: z.array(z.object({
        id: z.string(),
        label: z.string(),
        kind: z.string().optional(),
        landmark: z.string().optional(),
        score: z.number()
      })).optional(),
      error: z.string().optional(),
      retryable: z.boolean().optional(),
      code: z.string().optional()
    })
  },

  getDetails: {
    description: "Get detailed selectors for specific element IDs from MiniPCD",
    params: z.object({
      ids: z.array(z.string()).describe("Array of element IDs to get details for")
    }),
    result: z.object({
      ok: z.boolean(),
      data: z.array(PCDActionDetailSchema).optional(),
      error: z.string().optional(),
      retryable: z.boolean().optional(),
      code: z.string().optional()
    })
  },

  // Action Tools
  'dom.click': {
    description: "Click on an element using role-based selector",
    params: z.object({
      selector: RoleSelectorSchema.describe("Role-based selector to target the element")
    }),
    result: z.object({
      ok: z.boolean(),
      data: ObservationSchema.optional(),
      error: z.string().optional(),
      retryable: z.boolean().optional(),
      code: z.string().optional()
    })
  },

  'dom.type': {
    description: "Type text into an input element using role-based selector",
    params: z.object({
      selector: RoleSelectorSchema.describe("Role-based selector to target the input element"),
      text: z.string().describe("Text to type into the element"),
      replace: z.boolean().optional().default(false).describe("Whether to replace existing text or append")
    }),
    result: z.object({
      ok: z.boolean(),
      data: ObservationSchema.optional(),
      error: z.string().optional(),
      retryable: z.boolean().optional(),
      code: z.string().optional()
    })
  },

  'dom.select': {
    description: "Select an option from a dropdown using role-based selector",
    params: z.object({
      selector: RoleSelectorSchema.describe("Role-based selector to target the select element"),
      value: z.string().describe("Value, text, or label of the option to select")
    }),
    result: z.object({
      ok: z.boolean(),
      data: ObservationSchema.optional(),
      error: z.string().optional(),
      retryable: z.boolean().optional(),
      code: z.string().optional()
    })
  },

  'dom.submit': {
    description: "Submit a form using role-based selector",
    params: z.object({
      selector: RoleSelectorSchema.describe("Role-based selector to target the form or submit button")
    }),
    result: z.object({
      ok: z.boolean(),
      data: ObservationSchema.optional(),
      error: z.string().optional(),
      retryable: z.boolean().optional(),
      code: z.string().optional()
    })
  },

  'dom.scroll': {
    description: "Scroll the page to a specific position or element",
    params: z.object({
      y: z.number().optional().describe("Y position to scroll to (pixels from top)"),
      selector: RoleSelectorSchema.optional().describe("Element to scroll to (alternative to y position)")
    }),
    result: z.object({
      ok: z.boolean(),
      data: ObservationSchema.optional(),
      error: z.string().optional(),
      retryable: z.boolean().optional(),
      code: z.string().optional()
    })
  },

  'dom.waitFor': {
    description: "Wait for specific conditions to be met before continuing",
    params: z.object({
      event: z.enum(['urlChange', 'networkIdle', 'selector', 'text']).describe("Type of event to wait for"),
      value: z.string().optional().describe("Value to wait for (required for selector and text events)"),
      timeoutMs: z.number().optional().default(5000).describe("Timeout in milliseconds")
    }),
    result: z.object({
      ok: z.boolean(),
      data: ObservationSchema.optional(),
      error: z.string().optional(),
      retryable: z.boolean().optional(),
      code: z.string().optional()
    })
  },

  'dom.extract': {
    description: "Extract structured data from a collection (list, grid, table)",
    params: z.object({
      collectionId: z.string().describe("ID of the collection from MiniPCD"),
      fields: z.array(z.string()).describe("Fields to extract from each item (e.g., ['title', 'price', 'link'])")
    }),
    result: z.object({
      ok: z.boolean(),
      data: z.array(z.record(z.string(), z.string())).optional(),
      error: z.string().optional(),
      retryable: z.boolean().optional(),
      code: z.string().optional()
    })
  },

  // Tab Management Tools (handled by background)
  'tabs.open': {
    description: "Open a new tab with the specified URL",
    params: z.object({
      url: z.string().url().describe("URL to open in new tab")
    }),
    result: z.object({
      ok: z.boolean(),
      data: z.object({
        tabId: z.number()
      }).optional(),
      error: z.string().optional(),
      retryable: z.boolean().optional(),
      code: z.string().optional()
    })
  },

  'tabs.switch': {
    description: "Switch to an existing tab",
    params: z.object({
      tabId: z.number().describe("ID of the tab to switch to")
    }),
    result: z.object({
      ok: z.boolean(),
      data: z.object({}).optional(),
      error: z.string().optional(),
      retryable: z.boolean().optional(),
      code: z.string().optional()
    })
  },

  'tabs.close': {
    description: "Close a tab",
    params: z.object({
      tabId: z.number().describe("ID of the tab to close")
    }),
    result: z.object({
      ok: z.boolean(),
      data: z.object({}).optional(),
      error: z.string().optional(),
      retryable: z.boolean().optional(),
      code: z.string().optional()
    })
  },

  // Capture Tools (rarely used)
  'capture.candidates': {
    description: "Capture screenshot with highlighted candidate elements (use sparingly)",
    params: z.object({
      ids: z.array(z.string()).describe("Element IDs to highlight in the screenshot")
    }),
    result: z.object({
      ok: z.boolean(),
      data: z.object({
        screenshotBase64: z.string(),
        boxes: z.array(z.object({
          id: z.string(),
          x: z.number(),
          y: z.number(),
          w: z.number(),
          h: z.number(),
          label: z.string()
        }))
      }).optional(),
      error: z.string().optional(),
      retryable: z.boolean().optional(),
      code: z.string().optional()
    })
  }
});

export type ToolBox = typeof toolbox;
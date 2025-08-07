import { tool } from "ai";
import * as gensx from "@gensx/core";
import { toolbox } from "../../shared/toolbox";
import z from "zod";

type ScreenshotResult = {
  type: 'error';
  error: string;
  message: string;
} | {
  type: 'image';
  data: string;
  width?: number;
  height?: number;
  message: string;
};

export const captureElementScreenshotTool = tool({
  description: "Take a screenshot of a specific element on the page. Returns the image for visual analysis.",
  
  parameters: z.object({
    tabId: z.number().describe("The ID of the tab containing the element"),
    selector: z.string().describe("CSS selector of the element to capture"),
    scrollIntoView: z.boolean().optional().default(true).describe("Whether to scroll the element into view before capturing"),
  }),
  
  execute: async ({ tabId, selector, scrollIntoView = true }): Promise<ScreenshotResult> => {
    const result = await gensx.executeExternalTool(toolbox, "captureElementScreenshot", {
      tabId,
      selector, 
      scrollIntoView
    });
    
    if (!result.success) {
      return {
        type: 'error',
        error: result.error || 'Screenshot failed',
        message: result.error || 'Failed to capture element screenshot'
      };
    }
    
    // Return the image data in the format expected by toModelOutput
    return {
      type: 'image',
      data: result.image?.replace(/^data:image\/[^;]+;base64,/, '') || '', // Strip data URL prefix
      width: result.width,
      height: result.height,
      message: result.message || 'Screenshot captured successfully'
    };
  },
  
  // Convert tool result to model content for multi-modal processing
  experimental_toToolResultContent(result: ScreenshotResult) {
    if (result.type === 'error') {
      return [{ 
        type: 'text' as const, 
        text: `Screenshot failed: ${result.error}` 
      }];
    }
    
    return [
      { 
        type: 'text' as const, 
        text: result.message || 'Screenshot captured' 
      },
      { 
        type: 'image' as const, 
        data: result.data, 
        mimeType: 'image/png' as const 
      }
    ];
  }
});
import { ResponseComputerToolCall } from "openai/resources/responses/responses";
import { Page } from "playwright";

// Union type for all possible actions
type BrowserAction =
  | ResponseComputerToolCall.Click
  | ResponseComputerToolCall.DoubleClick
  | ResponseComputerToolCall.Drag
  | ResponseComputerToolCall.Move
  | ResponseComputerToolCall.Scroll
  | ResponseComputerToolCall.Keypress
  | ResponseComputerToolCall.Type
  | ResponseComputerToolCall.Wait
  | ResponseComputerToolCall.Screenshot;

// Map OpenAI button types to Playwright button types
function mapButtonType(
  openaiButton: string | undefined,
): "left" | "right" | "middle" {
  if (!openaiButton) return "left";

  switch (openaiButton) {
    case "left":
      return "left";
    case "right":
      return "right";
    case "wheel":
      return "middle"; // map wheel to middle
    case "back":
      return "left"; // default to left for unsupported types
    case "forward":
      return "left"; // default to left for unsupported types
    default:
      return "left"; // default fallback
  }
}

export async function handleModelAction(
  page: Page,
  action: BrowserAction,
): Promise<Page> {
  // Given a computer action (e.g., click, double_click, scroll, etc.),
  // execute the corresponding operation on the Playwright page.

  const actionType = action.type;

  try {
    switch (actionType) {
      case "click": {
        const { x, y, button } = action;
        const mappedButton = mapButtonType(button);
        console.log(
          `💻 Action: click at (${x}, ${y}) with button '${mappedButton}'`,
        );
        // Set up a listener for new tabs
        const popupPromise = page
          .waitForEvent("popup", { timeout: 2000 })
          .catch(() => null);
        // Click the element
        await page.mouse.click(x, y, { button: mappedButton });

        // Check if a new tab was opened
        const newPage = await popupPromise;
        if (newPage) {
          console.log("💻 New tab opened");
          return newPage;
        }
        break;
      }

      case "scroll": {
        const { x, y, scroll_x: scrollX, scroll_y: scrollY } = action;
        console.log(
          `💻 Action: scroll at (${x}, ${y}) with offsets (scrollX=${scrollX}, scrollY=${scrollY})`,
        );
        await page.mouse.move(x, y);
        await page.evaluate(`window.scrollBy(${scrollX}, ${scrollY})`);
        break;
      }

      case "keypress": {
        const { keys } = action;
        for (const k of keys) {
          console.log(`💻 Action: keypress '${k}'`);
          // A simple mapping for common keys; expand as needed.
          if (k.includes("ENTER")) {
            await page.keyboard.press("Enter");
          } else if (k.includes("SPACE")) {
            await page.keyboard.press(" ");
          } else {
            await page.keyboard.press(k);
          }
        }
        break;
      }

      case "type": {
        const { text } = action;
        console.log(`💻 Action: type text '${text}'`);
        await page.keyboard.type(text);
        break;
      }

      case "wait": {
        console.log(`💻 Action: wait`);
        await page.waitForTimeout(2000);
        break;
      }

      case "screenshot": {
        // Nothing to do as screenshot is taken at each turn
        console.log(`💻 Action: screenshot`);
        break;
      }

      // TODO:Handle other actions here

      default: {
        console.log("Unrecognized action:", action);
      }
    }
  } catch (e) {
    console.error("Error handling action", action, ":", e);
  }

  return page;
}

export async function getScreenshot(page: Page) {
  // Take a full-page screenshot using Playwright and return the image bytes.
  return await page.screenshot();
}

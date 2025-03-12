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
): Promise<void> {
  // Given a computer action (e.g., click, double_click, scroll, etc.),
  // execute the corresponding operation on the Playwright page.

  console.log("Handling action!!!!!!!!!!!!!!!!!:", action);
  const actionType = action.type;

  try {
    switch (actionType) {
      case "click": {
        const { x, y, button } = action;
        const mappedButton = mapButtonType(button);
        console.log(
          `Action: click at (${x}, ${y}) with button '${mappedButton}'`,
        );
        await page.mouse.click(x, y, { button: mappedButton });
        break;
      }

      case "scroll": {
        const { x, y, scroll_x: scrollX, scroll_y: scrollY } = action;
        console.log(
          `Action: scroll at (${x}, ${y}) with offsets (scrollX=${scrollX}, scrollY=${scrollY})`,
        );
        await page.mouse.move(x, y);
        await page.evaluate(`window.scrollBy(${scrollX}, ${scrollY})`);
        break;
      }

      case "keypress": {
        const { keys } = action;
        for (const k of keys) {
          console.log(`Action: keypress '${k}'`);
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
        console.log(`Action: type text '${text}'`);
        await page.keyboard.type(text);
        break;
      }

      case "wait": {
        console.log(`Action: wait`);
        await page.waitForTimeout(2000);
        break;
      }

      case "screenshot": {
        // Nothing to do as screenshot is taken at each turn
        console.log(`Action: screenshot`);
        break;
      }

      // Handle other actions here

      default: {
        //const _unknownAction: never = actionType;
        console.log("Unrecognized action:", action);
      }
    }
  } catch (e) {
    console.error("Error handling action", action, ":", e);
  }
}

export async function getScreenshot(page: Page) {
  // Take a full-page screenshot using Playwright and return the image bytes.
  return await page.screenshot();
}

import * as gensx from "@gensx/core";
import { chromium, Page } from "playwright";

interface Browser {
  page?: Page;
}

// Create a context with a default value
export const BrowserContext = gensx.createContext<Browser>({
  page: undefined,
});

interface BrowserProviderProps {
  initialUrl: string;
}

// Export the provider component
export const BrowserProvider = gensx.Component<BrowserProviderProps, never>(
  "BrowserProvider",
  async ({ initialUrl }) => {
    const browser = await chromium.launch({
      headless: false,
      chromiumSandbox: true,
      env: {},
      args: ["--disable-extensions", "--disable-file-system"],
    });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(initialUrl);

    return <BrowserContext.Provider value={{ page }} />;
  },
);

// Export a hook-like function to use the browser context
export const useBrowser = () => gensx.useContext(BrowserContext);

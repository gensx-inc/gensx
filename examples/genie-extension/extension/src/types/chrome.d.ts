// Chrome Extension API type augmentations

interface ChromeMessage {
  type: string;
  [key: string]: any;
}

interface ChromeTab {
  id?: number;
  url?: string;
  title?: string;
}

interface ChromeRuntime {
  onMessage: {
    addListener: (callback: (message: ChromeMessage, sender: any, sendResponse: (response: any) => void) => boolean | void) => void;
  };
  onInstalled: {
    addListener: (callback: () => void) => void;
  };
  openOptionsPage: () => void;
}

interface ChromeTabs {
  query: (queryInfo: { active?: boolean; currentWindow?: boolean }, callback: (tabs: ChromeTab[]) => void) => void;
  sendMessage: (tabId: number, message: ChromeMessage) => Promise<void>;
  onUpdated: {
    addListener: (callback: (tabId: number, changeInfo: any, tab: ChromeTab) => void) => void;
  };
}

interface ChromeAction {
  onClicked: {
    addListener: (callback: (tab: ChromeTab) => void) => void;
  };
}

interface ChromeScripting {
  executeScript: (injection: { target: { tabId: number }; files: string[] }) => Promise<void>;
}

interface ChromeStorage {
  sync: {
    get: (keys?: string | string[] | { [key: string]: any }) => Promise<{ [key: string]: any }>;
    set: (items: { [key: string]: any }) => Promise<void>;
  };
}

declare global {
  const chrome: {
    runtime: ChromeRuntime;
    tabs: ChromeTabs;
    action: ChromeAction;
    scripting: ChromeScripting;
    storage: ChromeStorage;
  };
}
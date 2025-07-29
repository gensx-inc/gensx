// GenSX Copilot Popup Script

import { ExtensionMessage, TabInfo } from './types/copilot';

interface PopupElements {
  toggleButton: HTMLButtonElement;
  optionsButton: HTMLButtonElement;
  statusElement: HTMLElement;
}

document.addEventListener('DOMContentLoaded', () => {
  const elements: PopupElements = {
    toggleButton: document.getElementById('toggleCopilot') as HTMLButtonElement,
    optionsButton: document.getElementById('openOptions') as HTMLButtonElement,
    statusElement: document.getElementById('status') as HTMLElement
  };

  if (!elements.toggleButton || !elements.optionsButton || !elements.statusElement) {
    console.error('Required popup elements not found');
    return;
  }

  // Handle toggle copilot button
  elements.toggleButton.addEventListener('click', async () => {
    try {
      // Get current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.id) {
        throw new Error('No active tab found');
      }

      // Check if tab URL is valid for content scripts
      if (!tab.url || (!tab.url.startsWith('http://') && !tab.url.startsWith('https://'))) {
        throw new Error('Content scripts cannot run on this page type');
      }

      console.log('Sending toggle message to tab:', tab.id, 'URL:', tab.url);
      
      // Send message to content script to toggle copilot
      const message: ExtensionMessage = { type: 'TOGGLE_COPILOT' };
      
      // Add a timeout to the sendMessage call
      const messagePromise = chrome.tabs.sendMessage(tab.id, message);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Message timeout - content script may not be loaded')), 5000)
      );
      
      await Promise.race([messagePromise, timeoutPromise]);
      
      elements.statusElement.textContent = 'Copilot toggled on current page';
      elements.statusElement.className = 'status active';
      
      // Close popup after a short delay
      setTimeout(() => {
        window.close();
      }, 1000);
      
    } catch (error) {
      console.error('Error toggling copilot:', error);
      
      // More specific error messages
      let errorMessage = 'Error: ';
      if (error instanceof Error) {
        if (error.message.includes('Could not establish connection')) {
          errorMessage += 'Content script not loaded. Try refreshing the page.';
        } else if (error.message.includes('timeout')) {
          errorMessage += 'Content script not responding. Try refreshing the page.';
        } else if (error.message.includes('Content scripts cannot run')) {
          errorMessage += 'Cannot run on this page type. Try a regular website.';
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += 'Make sure you\'re on a web page and refresh if needed';
      }
      
      elements.statusElement.textContent = errorMessage;
      elements.statusElement.className = 'status';
    }
  });

  // Handle options button
  elements.optionsButton.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Check if we're on a valid page
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab && tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
      elements.statusElement.textContent = 'Ready to assist on this page';
      elements.statusElement.className = 'status active';
    } else {
      elements.statusElement.textContent = 'Navigate to a web page to use GenSX Copilot';
      elements.statusElement.className = 'status';
      elements.toggleButton.disabled = true;
      elements.toggleButton.textContent = 'Not Available';
    }
  });
});
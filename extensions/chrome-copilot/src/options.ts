// GenSX Copilot Options Script

import { CopilotSettings } from './types/copilot';

const DEFAULT_SETTINGS: CopilotSettings = {
  apiEndpoint: 'http://localhost:3000/api/gensx',
  apiKey: '',
  autoOpen: false,
  enableShortcuts: true,
  defaultWidth: 30,
  userName: '',
  userContext: '',
  org: 'gensx',
  project: 'chrome-copilot',
  environment: 'default'
};

interface OptionsElements {
  form: HTMLFormElement;
  resetBtn: HTMLButtonElement;
  savedAlert: HTMLElement;
  apiEndpoint: HTMLInputElement;
  apiKey: HTMLInputElement;
  org: HTMLInputElement;
  project: HTMLInputElement;
  environment: HTMLInputElement;
  autoOpen: HTMLInputElement;
  enableShortcuts: HTMLInputElement;
  defaultWidth: HTMLInputElement;
  userName: HTMLInputElement;
  userContext: HTMLTextAreaElement;
}

document.addEventListener('DOMContentLoaded', async () => {
  const elements: OptionsElements = {
    form: document.getElementById('settings-form') as HTMLFormElement,
    resetBtn: document.getElementById('reset-btn') as HTMLButtonElement,
    savedAlert: document.getElementById('saved-alert') as HTMLElement,
    apiEndpoint: document.getElementById('apiEndpoint') as HTMLInputElement,
    apiKey: document.getElementById('apiKey') as HTMLInputElement,
    org: document.getElementById('org') as HTMLInputElement,
    project: document.getElementById('project') as HTMLInputElement,
    environment: document.getElementById('environment') as HTMLInputElement,
    autoOpen: document.getElementById('autoOpen') as HTMLInputElement,
    enableShortcuts: document.getElementById('enableShortcuts') as HTMLInputElement,
    defaultWidth: document.getElementById('defaultWidth') as HTMLInputElement,
    userName: document.getElementById('userName') as HTMLInputElement,
    userContext: document.getElementById('userContext') as HTMLTextAreaElement
  };

  // Verify all elements exist
  const missingElements = Object.entries(elements).filter(([key, element]) => !element);
  if (missingElements.length > 0) {
    console.error('Missing elements:', missingElements.map(([key]) => key));
    return;
  }

  // Load current settings
  await loadSettings();

  // Handle form submission
  elements.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveSettings();
    showSavedAlert();
  });

  // Handle reset button
  elements.resetBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      await resetSettings();
      await loadSettings();
      showSavedAlert();
    }
  });

  async function loadSettings(): Promise<void> {
    try {
      const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS) as CopilotSettings;

      elements.apiEndpoint.value = settings.apiEndpoint;
      elements.apiKey.value = settings.apiKey;
      elements.org.value = settings.org;
      elements.project.value = settings.project;
      elements.environment.value = settings.environment;
      elements.autoOpen.checked = settings.autoOpen;
      elements.enableShortcuts.checked = settings.enableShortcuts;
      elements.defaultWidth.value = settings.defaultWidth.toString();
      elements.userName.value = settings.userName;
      elements.userContext.value = settings.userContext;

      // Update range display
      updateRangeDisplay();
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  async function saveSettings(): Promise<void> {
    try {
      const settings: CopilotSettings = {
        apiEndpoint: elements.apiEndpoint.value || DEFAULT_SETTINGS.apiEndpoint,
        apiKey: elements.apiKey.value,
        org: elements.org.value || DEFAULT_SETTINGS.org,
        project: elements.project.value || DEFAULT_SETTINGS.project,
        environment: elements.environment.value || DEFAULT_SETTINGS.environment,
        autoOpen: elements.autoOpen.checked,
        enableShortcuts: elements.enableShortcuts.checked,
        defaultWidth: parseInt(elements.defaultWidth.value),
        userName: elements.userName.value,
        userContext: elements.userContext.value
      };

      await chrome.storage.sync.set(settings);
      console.log('Settings saved:', settings);
    } catch (error) {
      console.error('Error saving settings:', error);
      showErrorAlert(error instanceof Error ? error.message : 'Failed to save settings');
    }
  }

  async function resetSettings(): Promise<void> {
    try {
      await chrome.storage.sync.set(DEFAULT_SETTINGS);
      console.log('Settings reset to defaults');
    } catch (error) {
      console.error('Error resetting settings:', error);
    }
  }

  function showSavedAlert(): void {
    elements.savedAlert.style.display = 'block';
    setTimeout(() => {
      elements.savedAlert.style.display = 'none';
    }, 3000);
  }

  function showErrorAlert(message: string): void {
    // Create error alert if it doesn't exist
    let errorAlert = document.getElementById('error-alert');
    if (!errorAlert) {
      errorAlert = document.createElement('div');
      errorAlert.id = 'error-alert';
      errorAlert.className = 'alert alert-error';
      errorAlert.style.cssText = `
        background: #fef2f2;
        color: #dc2626;
        border: 1px solid #fecaca;
        padding: 12px 16px;
        border-radius: 6px;
        margin-bottom: 20px;
        font-size: 14px;
        display: none;
      `;
      elements.savedAlert.parentNode!.insertBefore(errorAlert, elements.savedAlert.nextSibling);
    }

    errorAlert.textContent = message;
    errorAlert.style.display = 'block';
    setTimeout(() => {
      errorAlert.style.display = 'none';
    }, 5000);
  }

  function updateRangeDisplay(): void {
    const range = elements.defaultWidth;
    const value = range.value;
    const helpText = range.parentElement?.querySelector('.help-text');
    if (helpText) {
      helpText.textContent = `How much of the screen width the copilot should take up by default (${value}%)`;
    }
  }

  // Update range display when changed
  elements.defaultWidth.addEventListener('input', updateRangeDisplay);
});

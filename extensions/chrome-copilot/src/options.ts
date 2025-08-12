// Genie Options Script

import { CopilotSettings } from './types/copilot';

const DEFAULT_SETTINGS: CopilotSettings = {
  apiEndpoint: 'https://api.gensx.com',
  scopedTokenEndpoint: 'https://genie.gensx.com/api/scoped-tokens',
  userName: '',
  userContext: '',
  org: 'gensx',
  project: 'genie',
  environment: 'prod'
};

interface OptionsElements {
  form: HTMLFormElement;
  resetBtn: HTMLButtonElement;
  clearTokenBtn?: HTMLButtonElement;
  savedAlert: HTMLElement;
  apiEndpoint: HTMLInputElement;
  scopedTokenEndpoint: HTMLInputElement;
  org: HTMLInputElement;
  project: HTMLInputElement;
  environment: HTMLInputElement;
  userName: HTMLInputElement;
  userContext: HTMLTextAreaElement;
  developerToggleBtn?: HTMLButtonElement;
  developerSection?: HTMLElement;
}

document.addEventListener('DOMContentLoaded', async () => {
  const elements: OptionsElements = {
    form: document.getElementById('settings-form') as HTMLFormElement,
    resetBtn: document.getElementById('reset-btn') as HTMLButtonElement,
    clearTokenBtn: document.getElementById('clear-token-btn') as HTMLButtonElement,
    savedAlert: document.getElementById('saved-alert') as HTMLElement,
    apiEndpoint: document.getElementById('apiEndpoint') as HTMLInputElement,
    scopedTokenEndpoint: document.getElementById('scopedTokenEndpoint') as HTMLInputElement,
    org: document.getElementById('org') as HTMLInputElement,
    project: document.getElementById('project') as HTMLInputElement,
    environment: document.getElementById('environment') as HTMLInputElement,
    userName: document.getElementById('userName') as HTMLInputElement,
    userContext: document.getElementById('userContext') as HTMLTextAreaElement,
    developerToggleBtn: document.getElementById('developer-toggle-btn') as HTMLButtonElement,
    developerSection: document.getElementById('developer-section') as HTMLElement
  };

  // Verify required elements exist (developer elements are optional)
  const requiredElements = ['form', 'resetBtn', 'savedAlert', 'apiEndpoint', 'org', 'project', 'environment', 'userName', 'userContext'];
  const missingElements = requiredElements.filter(key => !elements[key as keyof OptionsElements]);
  if (missingElements.length > 0) {
    console.error('Missing required elements:', missingElements);
    return;
  }

  // Set up developer section toggle
  if (elements.developerToggleBtn && elements.developerSection) {
    elements.developerToggleBtn.addEventListener('click', () => {
      if (elements.developerSection!.classList.contains('visible')) {
        elements.developerSection!.classList.remove('visible');
        elements.developerToggleBtn!.textContent = 'Developer Settings';
      } else {
        elements.developerSection!.classList.add('visible');
        elements.developerToggleBtn!.textContent = 'Hide Developer Settings';
      }
    });
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

  // Handle clear access token button
  if (elements.clearTokenBtn) {
    elements.clearTokenBtn.addEventListener('click', async () => {
      try {
        await chrome.storage.local.remove('scopedToken');
        showSavedAlert();
      } catch (error) {
        console.error('Error clearing scoped token:', error);
      }
    });
  }

  async function loadSettings(): Promise<void> {
    try {
      const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS) as CopilotSettings;

      elements.apiEndpoint.value = settings.apiEndpoint;
      if (elements.scopedTokenEndpoint) {
        elements.scopedTokenEndpoint.value = settings.scopedTokenEndpoint || DEFAULT_SETTINGS.scopedTokenEndpoint;
      }
      elements.org.value = settings.org;
      elements.project.value = settings.project;
      elements.environment.value = settings.environment;
      elements.userName.value = settings.userName;
      elements.userContext.value = settings.userContext;
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  async function saveSettings(): Promise<void> {
    try {
      const settings: CopilotSettings = {
        apiEndpoint: elements.apiEndpoint.value || DEFAULT_SETTINGS.apiEndpoint,
        scopedTokenEndpoint: (elements.scopedTokenEndpoint?.value || DEFAULT_SETTINGS.scopedTokenEndpoint),
        org: elements.org.value || DEFAULT_SETTINGS.org,
        project: elements.project.value || DEFAULT_SETTINGS.project,
        environment: elements.environment.value || DEFAULT_SETTINGS.environment,
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

});

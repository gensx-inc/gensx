# Chrome Extension Settings

This document describes the settings system implemented for the Genie Chrome Extension.

## Settings Interface

The extension now supports the following configurable settings:

### API Configuration
- **GenSX API Endpoint**: The base URL for your GenSX workflow server (default: `http://localhost:3000/api/gensx`)
- **API Key**: Optional authentication key for secured GenSX deployments

### Copilot Behavior
- **Auto-open on page load**: Automatically opens the copilot pane when visiting pages
- **Enable keyboard shortcuts**: Allow Ctrl+Shift+G (Cmd+Shift+G on Mac) to toggle the copilot
- **Default pane width**: Percentage of screen width (20-60%, default: 30%)

### User Preferences
- **Your Name**: Personalizes AI interactions
- **Additional Context**: Helps the AI provide better assistance based on your role/preferences

## Accessing Settings

1. **Extension Options Page**: Right-click the extension icon → "Options"
2. **Extension Management**: Chrome Extensions page → Genie → "Extension options"

## Technical Implementation

### Settings Storage
- Uses Chrome's `chrome.storage.sync` API for cross-device synchronization
- Settings are validated before saving with proper error handling
- Automatic fallback to defaults for invalid values

### Settings Manager
- `SettingsManager` class in `src/types/copilot.ts` provides:
  - `get()`: Retrieve current settings with defaults
  - `set(settings)`: Save settings with validation
  - `reset()`: Reset to factory defaults
  - `validate(settings)`: Input validation and sanitization

### Integration Points

**Content Script (`src/content.ts`):**
- Loads settings on initialization
- Uses API endpoint and key for workflow requests
- Respects auto-open and keyboard shortcut preferences
- Applies default pane width

**GenSX Workflows (`gensx/workflows.ts`):**
- Receives user name and context in workflow requests
- Incorporates user information into system prompts for personalized responses

**Options Page (`src/options.ts` + `src/options.html`):**
- Full settings interface with real-time validation
- Success/error feedback for save operations
- Reset to defaults functionality

## Validation Rules

- **API Endpoint**: Must be valid URL format, defaults to localhost if empty
- **Pane Width**: Must be number between 20-60%, defaults to 30%
- **User Name**: Limited to 100 characters, trimmed
- **User Context**: Limited to 1000 characters, trimmed
- **API Key**: Trimmed of whitespace

## Error Handling

- Invalid settings show error alerts in options page
- API call failures display helpful error messages in chat
- Graceful fallback to defaults for corrupted settings
- All validation errors logged to console for debugging

## Security Considerations

- API keys stored in Chrome's secure storage (encrypted)
- Input sanitization prevents XSS attacks
- URL validation prevents invalid endpoint injection
- No sensitive data logged to console

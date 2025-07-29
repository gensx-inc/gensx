# GenSX Copilot Chrome Extension

A Chrome extension that brings the power of GenSX AI workflows directly to any webpage. This extension creates a right-hand pane that allows you to interact with web pages using AI-powered tools, similar to the GenSX Copilot example but as a browser extension.

## Features

- **Right-hand pane interface** - Non-intrusive sidebar that doesn't interfere with the webpage
- **AI-powered web interaction** - Uses GenSX workflows to understand and interact with web pages
- **jQuery-based tools** - Comprehensive set of tools for clicking, filling forms, navigation, and more
- **Persistent memory** - Remembers application details and user preferences across sessions
- **Slash commands** - Use `/init` to automatically discover page features
- **Resizable interface** - Adjust the width of the copilot pane to your preference

## Installation

### Development Installation

1. **Install dependencies**:
   ```bash
   cd extensions/chrome-copilot/
   pnpm install
   ```

2. **Start the GenSX workflow server**:
   ```bash
   pnpm dev
   ```
   This starts the GenSX workflow server that the extension communicates with.

3. **Build the extension** (in a separate terminal):
   ```bash
   pnpm build:dev
   ```

4. **Load in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `dist/` folder (not the root folder)

### Production Installation

1. **Package the extension**:
   ```bash
   cd extensions/chrome-copilot/
   pnpm package
   ```
   This creates a `gensx-copilot-extension.zip` file ready for distribution.

2. **Install from Chrome Web Store** (when published):
   - Search for "GenSX Copilot" in the Chrome Web Store
   - Click "Add to Chrome"

## Usage

### Getting Started

1. **Open the extension**: Click the GenSX Copilot icon in your browser toolbar or use the keyboard shortcut `Ctrl+Shift+G` (or `Cmd+Shift+G` on Mac)

2. **Initialize page discovery**: Click "Try /init now" or type `/init` to have the AI explore and understand the current webpage

3. **Start interacting**: Ask the copilot to help you with tasks like:
   - "Fill out this form with test data"
   - "Find all the buttons on this page"
   - "Navigate to the settings page"
   - "Click the submit button"
   - "What can I do on this page?"

### Available Tools

The copilot has access to a comprehensive set of web interaction tools:

- **Page Analysis**: `getPageOverview`, `inspectSection`, `inspectElements`
- **Element Interaction**: `clickElements`, `fillTextInputs`, `selectOptions`, `toggleCheckboxes`
- **Form Handling**: `submitForms`
- **Navigation**: `navigate` (back, forward, or to specific paths)
- **Visual Feedback**: `highlightElements`
- **Waiting**: `waitForElements`
- **Memory Management**: `updateApplicationWorkingMemory`, `updateUserPreferencesWorkingMemory`

### Slash Commands

- `/init` - Automatically explore and discover the current webpage's features

### Tabs

- **Chat** - Main interaction interface with the AI
- **App Details** - View discovered application knowledge and working memory
- **Preferences** - View and modify user preferences and settings

## Configuration

### Extension Settings

Access settings by clicking the extension icon and selecting "Settings", or right-click the extension icon and choose "Options".

**API Configuration:**
- **GenSX API Endpoint** - Where your GenSX workflow server is running (default: `http://localhost:3000/api/gensx`)
- **API Key** - Optional authentication key if your server requires it

**Copilot Behavior:**
- **Auto-open on page load** - Automatically show the copilot when visiting new pages
- **Enable keyboard shortcuts** - Use `Ctrl+Shift+G` to toggle the copilot
- **Default pane width** - How much screen space the copilot takes up (20-60%)

**User Preferences:**
- **Your Name** - Personalizes AI interactions
- **Additional Context** - Tell the AI about your role, preferences, or context

### GenSX Workflow Server

The extension requires a GenSX workflow server to function. You can either:

1. **Use the extension's built-in workflows**:
   ```bash
   cd extensions/chrome-copilot/
   pnpm dev
   ```

2. **Deploy your own server** using the workflows in `gensx/` directory

3. **Connect to a remote GenSX Console deployment**

## Architecture

The extension consists of several components:

- **`manifest.json`** - Extension configuration and permissions
- **`content.js`** - Main content script that creates the UI and handles interactions
- **`content.css`** - Styles for the copilot interface
- **`background.js`** - Service worker for extension lifecycle management
- **`popup.html/js`** - Extension popup interface
- **`options.html/js`** - Settings page
- **`gensx/`** - GenSX workflows and tools (copied from examples/copilot)

### Content Script Architecture

The content script creates a completely isolated UI that doesn't interfere with the host webpage:

1. **Injection Prevention** - Prevents multiple injections on the same page
2. **jQuery Integration** - Loads jQuery if not already present for tool compatibility
3. **Isolated Styles** - All styles are scoped to prevent conflicts
4. **State Management** - Manages UI state, messages, and user preferences
5. **API Communication** - Communicates with GenSX workflow server via fetch

## Development

### File Structure

```
extensions/chrome-copilot/
├── manifest.json          # Extension manifest
├── content.js            # Main content script
├── content.css           # Copilot interface styles
├── background.js         # Service worker
├── popup.html            # Extension popup
├── popup.js              # Popup functionality
├── options.html          # Settings page
├── options.js            # Settings functionality
├── gensx/                # GenSX workflows (copied from examples)
│   ├── workflows.ts      # Main copilot workflow
│   ├── agent.ts          # AI agent implementation
│   ├── tools/            # Web interaction tools
│   └── slashcommands/    # Slash command implementations
└── README.md             # This file
```

### Customization

**Adding New Tools:**
1. Add tool definitions to `gensx/tools/toolbox.ts`
2. Implement tool logic in the workflow server
3. The extension will automatically have access to new tools

**Modifying UI:**
1. Update styles in `content.css`
2. Modify rendering logic in `content.js`
3. Ensure all styles are scoped with `!important` to prevent conflicts

**Custom Workflows:**
1. Modify `gensx/workflows.ts` to add new workflow logic
2. Update the content script to call new workflow endpoints

## Troubleshooting

**Extension not working:**
1. Check that the GenSX workflow server is running
2. Verify the API endpoint in extension settings
3. Check the browser console for error messages
4. Ensure you're on an HTTP/HTTPS page (not chrome:// pages)

**Copilot not responding:**
1. Verify network connectivity to the workflow server
2. Check API endpoint configuration
3. Look for CORS issues in the browser console
4. Ensure required environment variables are set in the workflow server

**UI conflicts:**
1. All styles are scoped with high specificity and `!important`
2. The extension uses a high z-index (2147483647) to stay on top
3. If conflicts occur, check for CSS override issues

**Memory/Performance:**
1. The extension cleans up properly when pages change
2. Message history is managed to prevent memory leaks
3. UI updates are optimized to prevent excessive re-renders

## Contributing

1. **Fork the repository**
2. **Make your changes** in the `extensions/chrome-copilot/` directory
3. **Test thoroughly** on various websites
4. **Submit a pull request** with a clear description of changes

## License

This extension is part of the GenSX project and follows the same license terms.

## Privacy

The extension:
- Only communicates with your configured GenSX workflow server
- Stores settings locally using Chrome's storage API
- Does not track or collect personal data
- Requires explicit permission to access webpage content
- All AI processing happens on your configured server, not in the cloud
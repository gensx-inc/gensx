# Genie Chrome Extension

A Chrome extension that brings the power of AI directly to any webpage. This extension creates a right-hand pane that allows you to interact with web pages using AI-powered tools, using a workflow that is running on the GenSX platform.

## Features

- **Right-hand pane interface** - Non-intrusive sidebar that doesn't interfere with the webpage
- **AI-powered web interaction** - Uses GenSX workflows to understand and interact with web pages
- **Frontend Tools** - The framework leverages browser side tools to interact with the page, such as clicking, filling forms, navigation, and more
- **Server-side tools** - The framework leverages server-side tools for web search, page analysis, and more

## Installation

### Build and install the extension

1. **Clone the repository**:

   ```bash
   git clone https://github.com/gensx-inc/gensx.git
   cd gensx/examples/genie-extension
   ```

2. **Install dependencies**:

   ```bash
   pnpm install
   ```

3. **Build the extension**:

   ```bash
   pnpm build:extension
   ```

4. **Install the extension**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `gensx/examples/genie-extension/extension/dist/` folder

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
   - Click "Load unpacked" and select the `gensx/examples/genie-extension/extension/dist/` folder

## Usage

### Getting Started

1. **Open the extension**: Click the Genie icon in your browser toolbar or use the keyboard shortcut `Ctrl+Shift+G` (or `Cmd+Shift+G` on Mac)

2. **Initialize page discovery**: Click "Try /init now" or type `/init` to have the AI explore and understand the current webpage

3. **Start interacting**: Ask the copilot to help you with tasks like:
   - "Fill out this form"
   - "Find all the buttons on this page"
   - "Navigate to the settings page"
   - "Click the submit button"
   - "What can I do on this page?"

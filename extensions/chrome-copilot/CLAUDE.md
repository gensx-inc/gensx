# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the GenSX Chrome Copilot extension.

## Project Overview

**GenSX Chrome Copilot** is a Chrome extension that brings AI-powered web page interaction capabilities to the browser. It integrates GenSX workflows with Chrome's extension APIs to provide intelligent assistance for web automation and content interaction.

## Key Commands

### Development
```bash
# Start GenSX workflow development server
npm run dev
# or
pnpm dev

# Build for development (with source maps)
npm run build:dev

# Build for production
npm run build

# Watch mode for development
npm run watch

# Type checking
npm run type-check
```

### Distribution
```bash
# Create distribution package
npm run package

# Generate extension icons
npm run generate-icons

# Clean build artifacts
npm run clean
```

## Architecture Overview

### Extension Structure
- **`/src/`** - TypeScript source files for extension components
  - `background.ts` - Service worker (Manifest V3)
  - `content.ts` - Content script injected into web pages
  - `popup.ts` - Extension popup interface
  - `options.ts` - Extension options page
  - `types/` - TypeScript type definitions
  - `utils/` - Utility functions and helpers
- **`/gensx/`** - GenSX workflows and components
  - `workflows.ts` - Main workflow definitions
  - `agent.ts` - AI agent configuration
  - `tools/` - Custom tools and integrations
  - `slashcommands/` - Slash command implementations
- **`/dist/`** - Built extension files (auto-generated)
- **`/icons/`** - Extension icons and assets

### Extension Components
- **Background Script**: Service worker handling extension lifecycle and API communications
- **Content Script**: Injected into web pages for DOM interaction and GenSX workflow execution
- **Popup**: User interface for extension controls and workflow triggers
- **Options Page**: Configuration interface for extension settings

### GenSX Integration
- Uses GenSX workflows for AI-powered web page analysis and interaction
- Integrates with OpenAI and Anthropic APIs through GenSX providers
- Custom tools for Chrome extension APIs (tabs, storage, etc.)

## Development Patterns

### Extension Script Communication
```typescript
// Background to content script messaging
chrome.tabs.sendMessage(tabId, {
  type: "EXECUTE_WORKFLOW",
  payload: workflowData
});

// Content script to background messaging
chrome.runtime.sendMessage({
  type: "WORKFLOW_RESULT",
  payload: result
});
```

### GenSX Workflow Integration
```typescript
const WebAnalysisWorkflow = gensx.Component(
  "WebAnalysisWorkflow",
  async (input: { url: string; task: string }) => {
    // Workflow logic using GenSX components
    return analysisResult;
  }
);
```

### Chrome API Integration
```typescript
// Storage API usage
await chrome.storage.local.set({ key: value });
const data = await chrome.storage.local.get(['key']);

// Tabs API usage
const activeTab = await chrome.tabs.query({ 
  active: true, 
  currentWindow: true 
});
```

## Code Style Guidelines

### TypeScript Standards
- **Strict TypeScript** - no `any` types
- Use Chrome extension type definitions from `@types/chrome`
- Proper async/await patterns for Chrome APIs
- JSDoc comments for exported functions

### Extension-Specific Patterns
- Use Chrome's Promise-based APIs (Manifest V3 style)
- Proper error handling for extension API calls
- Security-conscious coding (no eval, proper CSP compliance)
- Message passing between extension contexts

### GenSX Integration Patterns
- Follow GenSX component patterns for workflows
- Use GenSX providers for AI model integration
- Implement custom tools for Chrome-specific functionality

## Build System

### Webpack Configuration
- **Entry points**: `background.ts`, `content.ts`, `popup.ts`, `options.ts`
- **TypeScript compilation** with ts-loader
- **Asset copying** for manifest, HTML, CSS, and icons
- **Node.js polyfill fallbacks** disabled for browser compatibility
- **Source maps** in development mode

### Chrome Extension Manifest (V3)
- Service worker background script
- Content script injection for all URLs
- Required permissions: `activeTab`, `storage`, `tabs`
- Host permissions for all HTTP/HTTPS sites

## Development Guidelines

### Extension Development Best Practices
- **Manifest V3 compliance** - use service workers, not background pages
- **Minimal permissions** - only request necessary permissions
- **Content Security Policy** compliance
- **Cross-origin communication** through proper messaging APIs
- **Storage management** using Chrome storage APIs

### GenSX Workflow Development
- Workflows should be stateless and handle browser context properly
- Use Chrome APIs through content scripts, not directly in workflows
- Implement proper error handling for network failures
- Consider user privacy when processing web page content

### Security Considerations
- Never inject untrusted code into web pages
- Sanitize user inputs before processing
- Use Chrome's built-in APIs for secure operations
- Implement proper CORS handling for external API calls

## Testing and Debugging

### Development Testing
```bash
# Load unpacked extension in Chrome
# 1. Run `npm run build:dev`
# 2. Open chrome://extensions/
# 3. Enable "Developer mode"
# 4. Click "Load unpacked" and select `dist/` folder
```

### Debugging Techniques
- **Background script**: Debug in Chrome DevTools > Extensions
- **Content script**: Debug in page DevTools console
- **Popup**: Right-click extension icon > "Inspect popup"
- **Workflow logs**: Check GenSX workflow execution logs

### Common Issues
- **CORS errors**: Use Chrome extension permissions instead of direct fetch
- **CSP violations**: Ensure all scripts comply with Content Security Policy
- **Permission errors**: Verify manifest permissions match API usage
- **Message passing failures**: Check message format and listener setup

## File Organization

### Source Code Structure
```
src/
├── background.ts      # Service worker
├── content.ts         # Content script
├── popup.ts          # Popup interface
├── options.ts        # Options page
├── content.css       # Content script styles
├── popup.html        # Popup HTML
├── options.html      # Options HTML
├── types/            # TypeScript definitions
└── utils/            # Utility functions
```

### GenSX Structure
```
gensx/
├── workflows.ts      # Main workflows
├── agent.ts         # AI agent config
├── tools/           # Custom tools
└── slashcommands/   # Slash commands
```

## Key Dependencies

### Core Dependencies
- **@gensx/core** - GenSX framework core
- **@gensx/client** - GenSX client SDK
- **@ai-sdk/openai** - OpenAI integration
- **@ai-sdk/anthropic** - Anthropic integration
- **jquery** - DOM manipulation utilities

### Development Dependencies
- **@types/chrome** - Chrome extension type definitions
- **webpack** - Build system and bundling
- **typescript** - TypeScript compiler
- **ts-loader** - TypeScript webpack loader

## Environment Setup

### Prerequisites
- Node.js 18+ and pnpm
- Chrome browser for testing
- GenSX development environment set up

### Development Workflow
1. Make changes to source files in `src/` or `gensx/`
2. Run `npm run build:dev` to build with source maps
3. Reload extension in Chrome DevTools
4. Test functionality in browser
5. Use `npm run type-check` to validate TypeScript

### Production Deployment
1. Run `npm run build` for optimized production build
2. Run `npm run package` to create distribution ZIP
3. Upload to Chrome Web Store or distribute manually

## Important Reminders

- **Always test in actual Chrome browser** - extension APIs behave differently than Node.js
- **Respect user privacy** - be transparent about data processing
- **Handle offline scenarios** - extension should gracefully handle network failures
- **Follow Chrome Web Store policies** - ensure compliance for distribution
- **Use proper error boundaries** - prevent extension crashes from affecting browser
- **Implement proper logging** - use console methods appropriate for each context
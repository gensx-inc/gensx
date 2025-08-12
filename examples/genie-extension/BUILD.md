# Build Instructions

This Chrome extension is built using TypeScript and Webpack for proper bundling and type safety.

## Prerequisites

1. **Node.js** (v18 or higher)
2. **pnpm** (preferred) or npm
3. **GenSX monorepo setup** - This extension depends on GenSX packages

## Development Setup

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Start the GenSX workflow server**:
   ```bash
   pnpm dev
   ```
   This runs `npx gensx start gensx/workflows.ts` which starts the GenSX workflow server for the extension to communicate with.

3. **Build the extension** (in a separate terminal):
   ```bash
   pnpm build:dev
   ```
   Or for production:
   ```bash
   pnpm build
   ```

4. **Load in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist/` folder

## Available Scripts

- `pnpm dev` - Start the GenSX workflow server
- `pnpm build` - Build for production (minified)
- `pnpm build:dev` - Build for development (with source maps)
- `pnpm watch` - Build and watch for changes
- `pnpm package` - Build and create a zip file for distribution
- `pnpm clean` - Remove build artifacts
- `pnpm type-check` - Run TypeScript type checking
- `pnpm generate-icons` - Generate placeholder PNG icons

## Project Structure

```
extensions/chrome-copilot/
├── src/                    # TypeScript source files
│   ├── content.ts         # Main content script
│   ├── background.ts      # Service worker
│   ├── popup.ts          # Extension popup
│   ├── options.ts        # Settings page
│   ├── content.css       # Copilot interface styles
│   ├── popup.html        # Popup HTML
│   ├── options.html      # Settings HTML
│   └── types/            # TypeScript type definitions
├── gensx/                # GenSX workflows
│   ├── workflows.ts      # Main copilot workflow
│   ├── agent.ts          # AI agent implementation
│   ├── tools/            # Web interaction tools
│   └── slashcommands/    # Slash command implementations
├── dist/                 # Build output (gitignored)
├── manifest.json         # Extension manifest
├── webpack.config.js     # Webpack configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies and scripts
```

## Build Process

The build process:

1. **TypeScript compilation** - Converts `.ts` files to JavaScript
2. **Webpack bundling** - Bundles modules and dependencies
3. **Asset copying** - Copies HTML, CSS, and manifest files
4. **Output to dist/** - All files ready for Chrome extension loading

## Development Workflow

1. **Start the workflow server**: `pnpm dev`
2. **Build the extension**: `pnpm build:dev` or `pnpm watch`
3. **Load in Chrome** from the `dist/` folder
4. **Make changes** to source files in `src/`
5. **Webpack rebuilds** automatically if using `pnpm watch`
6. **Refresh extension** in Chrome extensions page as needed

## GenSX Workflow Development

The GenSX workflows are in the `gensx/` directory and use TypeScript with the GenSX framework:

- **workflows.ts** - Main copilot workflow that handles user interactions
- **agent.ts** - AI agent component for streaming responses
- **tools/** - jQuery-based tools for web page interaction
- **slashcommands/** - Special commands like `/init`

To modify the AI behavior:
1. Edit files in `gensx/`
2. Restart the workflow server (`pnpm dev`)
3. The extension will automatically use the updated workflows

## Chrome Extension Permissions

The extension requires these permissions (defined in `manifest.json`):
- `activeTab` - Access to the current tab
- `storage` - For saving user settings
- `tabs` - For tab management
- `host_permissions` - Access to all websites

## Troubleshooting

**Build errors**:
- Ensure all GenSX dependencies are installed in the monorepo
- Check TypeScript errors with `pnpm type-check`
- Clear build cache with `pnpm clean && pnpm build`
- If webpack hangs, check TypeScript configuration for proper include/exclude paths

**Extension not loading**:
- Check the `dist/` folder exists and contains built files
- Verify manifest.json is valid
- Check Chrome developer console for errors

**Workflow server issues**:
- Ensure GenSX CLI is installed globally or use `npx`
- Check that required environment variables are set
- Verify the workflow server is running on the expected port

**Type errors**:
- Ensure `@types/chrome` is installed
- Check that Chrome API usage matches the type definitions
- Use `pnpm type-check` to identify issues

## Distribution

To create a package for Chrome Web Store:

1. **Build for production**: `pnpm build`
2. **Create package**: `pnpm package`
3. **Upload** the generated `gensx-copilot-extension.zip` to Chrome Web Store

## Security Notes

- The extension only communicates with your configured GenSX server
- No telemetry or external data collection
- All processing happens locally or on your GenSX server
- User settings are stored locally in Chrome's storage API
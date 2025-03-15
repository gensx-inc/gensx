# @gensx/cline-rules

This package installs a `.clinerules` file to your project, providing project-specific instructions for Cline editor when working with GenSX projects.

## Overview

Cline's `.clinerules` file provides project-specific instructions that are automatically appended to your custom instructions and referenced in Cline's system prompt, ensuring they influence all interactions within the project context.

## Installation

```bash
npm install --save-dev @gensx/cline-rules
# or
yarn add -D @gensx/cline-rules
# or
pnpm add -D @gensx/cline-rules
```

## Features

- Automatically installs a `.clinerules` file to your project root
- Provides project-specific guidance to Cline for working with GenSX projects
- Preserves existing `.clinerules` file if one already exists

## What's Included

The included `.clinerules` file contains:

- GenSX project structure guidelines
- Code style and patterns
- GenSX component patterns
- Provider usage examples
- Testing requirements
- Documentation standards

## Usage

After installation, the package will automatically add a `.clinerules` file to your project root directory (if one doesn't already exist).

Cline will automatically read this file and use it to provide more accurate and project-specific assistance.

## Customization

You can modify the installed `.clinerules` file to suit your project's specific needs.

## License

MIT
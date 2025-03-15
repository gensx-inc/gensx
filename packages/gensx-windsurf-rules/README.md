# @gensx/windsurf-rules

This package installs a `.windsurfrules` file to your project, providing project-specific instructions for Windsurf's Cascade AI when working with GenSX projects.

## Overview

Windsurf's `.windsurfrules` file provides project-specific instructions that are automatically applied to Cascade AI in your workspace, ensuring it has proper context for working with GenSX projects.

## Installation

```bash
npm install --save-dev @gensx/windsurf-rules
# or
yarn add -D @gensx/windsurf-rules
# or
pnpm add -D @gensx/windsurf-rules
```

## Features

- Automatically installs a `.windsurfrules` file to your project root
- Provides project-specific guidance to Windsurf's Cascade AI for working with GenSX projects
- Preserves existing `.windsurfrules` file if one already exists

## What's Included

The included `.windsurfrules` file contains:

- GenSX project structure guidelines
- Code style and patterns
- GenSX component patterns
- Provider usage examples
- Testing requirements
- Documentation standards

## Usage

After installation, the package will automatically add a `.windsurfrules` file to your project root directory (if one doesn't already exist).

Cascade AI will automatically read this file and use it to provide more accurate and project-specific assistance.

## Note

As mentioned in the Windsurf documentation, you may want to add `.windsurfrules` to your project's `.gitignore` to ensure that the rules are only applied to your local project.

## Customization

You can modify the installed `.windsurfrules` file to suit your project's specific needs.

## License

MIT

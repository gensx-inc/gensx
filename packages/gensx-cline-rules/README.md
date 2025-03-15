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
- Uses managed sections to preserve your customizations during updates
- Creates backups of existing files when making updates

## What's Included

The included `.clinerules` file contains:

- Common GenSX coding patterns and conventions
- Code style preferences
- GenSX component patterns with code examples
- Provider usage examples
- Testing and documentation standards

## Usage

After installation, the package will automatically add a `.clinerules` file to your project root directory (if one doesn't already exist).

Cline will automatically read this file and use it to provide more accurate and project-specific assistance.

## Managed Sections

The `.clinerules` file uses managed sections delimited by HTML comments:

```
<!-- BEGIN_MANAGED_SECTION -->
... managed content that will be updated ...
<!-- END_MANAGED_SECTION -->
```

When upgrading the package, only the content within these markers will be updated, preserving any custom content you've added outside of the managed section.

## Customization

Add your custom project information outside the managed section to preserve it during package updates. 

A section at the bottom of the file is provided specifically for your custom content.

## License

MIT

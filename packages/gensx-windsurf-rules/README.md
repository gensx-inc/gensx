# @gensx/windsurf-rules

This package installs a `.windsurfrules` file to your project, providing project-specific instructions for Windsurf's Cascade AI when working with GenSX projects.

## Overview

Windsurf's `.windsurfrules` file provides project-specific instructions that are automatically applied to Cascade AI in your workspace, ensuring it has proper context for working with GenSX projects.

## Installation and Usage

You can install the Windsurf rules directly from npm without adding the package as a dependency:

```bash
# Run directly with npx to install the rules
npx @gensx/windsurf-rules
```

Alternatively, you can install it as a dependency:

```bash
npm install --save-dev @gensx/windsurf-rules
# or
yarn add -D @gensx/windsurf-rules
# or
pnpm add -D @gensx/windsurf-rules
```

Then run the CLI:

```bash
npx gensx-windsurf-rules
```

## Features

- Installs a `.windsurfrules` file to your project root
- Provides project-specific guidance to Windsurf's Cascade AI for working with GenSX projects
- Uses managed sections to preserve your customizations during updates
- Creates backups of existing files when making updates

## What's Included

The included `.windsurfrules` file contains:

- Common GenSX coding patterns and conventions
- Code style preferences
- GenSX component patterns with code examples
- Provider usage examples
- Testing and documentation standards

## Managed Sections

The `.windsurfrules` file uses managed sections delimited by HTML comments:

```
<!-- BEGIN_MANAGED_SECTION -->
... managed content that will be updated ...
<!-- END_MANAGED_SECTION -->
```

When upgrading or reinstalling the rules, only the content within these markers will be updated, preserving any custom content you've added outside of the managed section.

## Customization

Add your custom project information outside the managed section to preserve it during updates.

A section at the bottom of the file is provided specifically for your custom content.

## Note

As mentioned in the Windsurf documentation, you may want to add `.windsurfrules` to your project's `.gitignore` to ensure that the rules are only applied to your local project.

## License

Apache-2.0

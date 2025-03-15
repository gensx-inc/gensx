# @gensx/claude-md

This package provides a CLAUDE.md template for GenSX projects.

## Installation

```bash
npm install @gensx/claude-md
```

or

```bash
pnpm add @gensx/claude-md
```

## Usage

The CLAUDE.md template is automatically installed into your project's root directory during the `postinstall` script. You don't need to do anything manually.

When you upgrade the package, if you haven't customized the CLAUDE.md file, it will be automatically updated.

## What is CLAUDE.md?

CLAUDE.md serves as persistent memory for Claude when working with GenSX projects. It contains:

- Common project commands
- Code style preferences
- Project structure overview
- Common patterns and examples for GenSX components
- LLM provider configuration examples
- A section for project-specific notes

This file helps Claude remember important information about your project, making it easier to provide accurate and contextual assistance.

## Customization

You can customize the CLAUDE.md file after installation to include project-specific details. Your customizations will be preserved when updating this package.

## License

Apache-2.0
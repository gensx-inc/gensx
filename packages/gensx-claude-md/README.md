# @gensx/claude-md

This package provides a CLAUDE.md template for GenSX projects.

## Installation and Usage

You can install the CLAUDE.md template directly from npm without adding the package as a dependency:

```bash
# Run directly with npx to install the template
npx @gensx/claude-md
```

Alternatively, you can install it as a dependency:

```bash
npm install --save-dev @gensx/claude-md
# or
pnpm add -D @gensx/claude-md
```

Then run the CLI:

```bash
npx gensx-claude-md
```

## What is CLAUDE.md?

CLAUDE.md serves as persistent memory for Claude when working with GenSX projects. It contains:

- Common project commands
- Code style preferences
- Project structure overview
- Common patterns and examples for GenSX components
- LLM provider configuration examples
- A section for project-specific notes

This file helps Claude remember important information about your project, making it easier to provide accurate and contextual assistance.

## Customization and Updates

The CLAUDE.md file includes clearly marked managed and custom sections:

```md
<!-- BEGIN_MANAGED_SECTION -->

... Template content that will be updated automatically ...

<!-- END_MANAGED_SECTION -->

## Custom Project Information

... Your custom content here ...
```

When you update the template:

1. Only the content between the managed section markers will be updated
2. Any content outside these markers will be preserved
3. If you're updating from a previous version without managed sections, your old file will be backed up

This approach allows you to both:

- Receive updates to the template content (like new patterns or examples)
- Keep your project-specific customizations intact

## License

Apache-2.0

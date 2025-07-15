# Workflow Analysis Tool

This directory contains a CLI tool for statically analyzing JavaScript/TypeScript projects that use the gensx-core package to build workflows and components.

## `analyze-workflows.ts`

A comprehensive analyzer that can follow imports and analyze component files across multiple files to build a complete dependency graph of workflows and components.

**Usage:**
```bash
tsx scripts/analyze-workflows.ts <path-to-workflows.ts> [options]
```

**Example:**
```bash
# Basic analysis
tsx scripts/analyze-workflows.ts ./examples/openai-examples/src/workflows.ts

# Analysis with cross-file dependencies
tsx scripts/analyze-workflows.ts ./examples/blog-writer/src/workflows.ts

# With mermaid diagram
npm run analyze:workflows ./examples/openai-examples/src/workflows.ts -- --mermaid

# Detailed analysis with visual diagram
npm run analyze:workflows ./examples/blog-writer/src/workflows.ts -- --verbose --mermaid

# JSON output for programmatic use
tsx scripts/analyze-workflows.ts ./examples/blog-writer/src/workflows.ts --json
```

## Options

- `--json` - Output the analysis results in JSON format for programmatic use
- `--mermaid` - Generate a Mermaid diagram showing the workflow/component relationships
- `--verbose` - Show detailed analysis including file paths and cross-file dependencies

## What It Analyzes

The analyzer detects workflows and components regardless of how the `Workflow` and `Component` functions are imported.

### Supported Import Patterns

**Namespace imports:**
```typescript
import * as gensx from "@gensx/core";
const MyWorkflow = gensx.Workflow("MyWorkflow", async (props) => {
  // workflow logic
});
```

**Named imports:**
```typescript
import { Workflow, Component } from "@gensx/core";
const MyWorkflow = Workflow("MyWorkflow", async (props) => {
  // workflow logic
});
```

**Aliased imports:**
```typescript
import { Workflow as W, Component as C } from "@gensx/core";
const MyWorkflow = W("MyWorkflow", async (props) => {
  // workflow logic
});
```

**Mixed imports:**
```typescript
import gensx, { Workflow, Component as C } from "@gensx/core";
const MyWorkflow = Workflow("MyWorkflow", async (props) => {
  // workflow logic
});
```

### Dependencies
The analyzer tracks:
- Which components are called by workflows
- Which components call other components
- Cross-file dependencies via imports
- The hierarchy and flow between all workflow elements

## Output

The analysis provides:

1. **Workflows List** - All workflows found with their dependencies
2. **Components List** - All components found with their dependencies  
3. **Dependency Graph** - Relationships between workflows and components
4. **Summary Statistics** - Counts of workflows, components, dependencies, and files
5. **Mermaid Diagram** (with `--mermaid` flag) - Visual representation of the dependency graph

## Example Output

### Blog Writer Analysis
```
🔍 Workflow Analysis Results
==================================================

📁 Analyzed Files: 5

📋 Workflows:
  • WriteBlog (WriteBlog)
    File: examples/blog-writer/src/workflows.ts
    Dependencies: Research, WriteOutline, WriteDraft, Editorial, MatchTone

🔧 Components:
  • WriteSection (WriteSection)
    File: examples/blog-writer/src/components/draft.ts
  • WriteDraft (WriteDraft)
    File: examples/blog-writer/src/components/draft.ts
    Dependencies: WriteSection
  • Research (Research)
    File: examples/blog-writer/src/components/research.ts
    Dependencies: GenerateTopics, WebResearch

🔗 Dependency Graph:
  WriteBlog → Research (workflow-to-component)
  WriteBlog → WriteOutline (workflow-to-component)
  WriteBlog → WriteDraft (workflow-to-component)
  WriteBlog → Editorial (workflow-to-component)
  WriteBlog → MatchTone (workflow-to-component)
  WriteDraft → WriteSection (component-to-component)
  Research → GenerateTopics (component-to-component)
  Research → WebResearch (component-to-component)

📊 Summary:
  Workflows: 1
  Components: 8
  Dependencies: 8
  Files: 5
```

### Mermaid Diagram Output
```mermaid
graph TD
    WriteBlog[WriteBlog]:::workflow
    WriteSection[WriteSection]:::component
    WriteDraft[WriteDraft]:::component
    GenerateTopics[GenerateTopics]:::component
    WebResearch[WebResearch]:::component
    Research[Research]:::component
    MatchTone[MatchTone]:::component
    Editorial[Editorial]:::component
    WriteOutline[WriteOutline]:::component
    WriteBlog --> Research
    WriteBlog --> WriteOutline
    WriteBlog --> WriteDraft
    WriteBlog --> Editorial
    WriteBlog --> MatchTone
    WriteDraft --> WriteSection
    Research --> GenerateTopics
    Research --> WebResearch
    classDef workflow fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef component fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
```

## Features

The analyzer provides comprehensive analysis capabilities:

- **Complete Project Analysis** - Analyzes single files or entire TypeScript projects with cross-file dependencies
- **Universal Import Detection** - Supports all import patterns: namespace, named, aliased, and mixed imports
- **Smart Import Resolution** - Follows relative imports and handles TypeScript `.js` to `.ts` mapping
- **Dependency Graph Generation** - Maps all relationships between workflows and components
- **Multiple Output Formats** - Text summary, JSON data, and beautiful Mermaid diagrams
- **Intelligent Filtering** - Focuses on gensx patterns while filtering out external API calls

## Use Cases

- **Architecture Analysis** - Understand the structure of complex gensx projects
- **Dependency Tracking** - See which components depend on each other
- **Documentation** - Generate visual diagrams of workflow structures
- **Refactoring** - Identify tightly coupled components before making changes
- **Code Review** - Understand the flow and dependencies in pull requests

## Requirements

- Node.js with TypeScript support
- tsx (for running TypeScript files directly)
- Access to the gensx-core package types

## Limitations

- Currently only analyzes gensx.Workflow and gensx.Component patterns
- Does not track external API calls or wrapped SDK functions
- Requires TypeScript AST parsing, so malformed code may cause issues
- Import resolution is limited to relative paths (doesn't resolve node_modules)
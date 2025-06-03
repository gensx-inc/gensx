# Blog Writer Workflow

A comprehensive GenSX workflow for automated blog writing that combines AI research, structured outlining, draft writing, and editorial enhancement using Anthropic's Claude 4 Sonnet.

## Features

- **AI-Powered Research**: Uses Perplexity API for real-time web research
- **Catalog Search**: Integrates with GenSX storage for internal documentation search
- **Structured Outlining**: Creates comprehensive blog post outlines with key points and supporting evidence
- **Section-by-Section Writing**: Generates detailed blog sections in parallel
- **Editorial Enhancement**: Two-pass editorial review to make content more engaging
- **Metadata Tracking**: Provides insights into the content generation process
- **Claude 4 Sonnet**: Powered exclusively by Anthropic's most advanced model

## Workflow Steps

1. **Research Phase**:

   - Generates 5-7 specific research topics based on the blog title and prompt
   - Conducts web research using Perplexity's Sonar API for real-time information
   - Searches internal documentation catalog (when configured)

2. **Outline Creation**:

   - Creates structured outline with introduction, sections, and conclusion
   - Incorporates research findings into outline structure
   - Defines key points and supporting evidence for each section

3. **Draft Writing**:

   - Writes engaging introduction with hook, context, and thesis
   - Generates each section in parallel for efficiency
   - Creates compelling conclusion with call-to-action
   - Performs initial polish pass for coherence

4. **Editorial Enhancement**:
   - First pass: Improves engagement, style, and structure
   - Second pass: Final optimization for readability and memorability

## Setup

### Prerequisites

- Node.js 18+
- GenSX CLI installed
- API keys for Anthropic Claude and Perplexity

### Environment Variables

Create a `.env` file with the following variables:

```bash
# Anthropic Claude API Key
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Perplexity API for web research
PERPLEXITY_API_KEY=your_perplexity_api_key_here

# GenSX Cloud Configuration (for vector search)
GENSX_API_KEY=your_gensx_api_key_here
GENSX_PROJECT=your_project_name
GENSX_ENV=development
```

### Installation

```bash
npm install
```

## Usage

### Local Development

```bash
npm run dev
```

### Deploy to GenSX Cloud

```bash
npm run deploy
```

### Example Usage

```typescript
import { WriteBlog } from "./src/workflows.js";

const result = await WriteBlog({
  title: "The Future of AI in Content Creation",
  prompt:
    "Write a comprehensive blog post about how AI is transforming content creation, including current tools, future trends, and implications for creators.",
});

console.log(result.content);
console.log(result.metadata);
```

## Configuration

### Perplexity Integration

This workflow uses Perplexity's Sonar API for real-time web research. The `WebResearch` component:

- Uses the `sonar-pro` model for advanced reasoning
- Provides comprehensive research with citations
- Handles up to 2000 tokens per research topic

### Catalog Search (Optional)

The `CatalogResearch` component is designed to search your internal documentation using GenSX storage:

- Searches the "documentation" namespace
- Performs vector similarity search
- Falls back gracefully if no documentation is indexed

To use catalog search:

1. Index your documentation using GenSX storage
2. Ensure the namespace is named "documentation"
3. Uncomment the useSearch import in `components/research.ts`

### Customization

#### Modifying Research Topics

Edit the `GenerateTopics` component prompt to change how research topics are generated.

#### Adjusting Writing Style

Modify the prompts in `WriteDraft` and `Editorial` components to change tone, length, or style.

#### Adding Custom Research Sources

Extend the `Research` component to include additional research methods or APIs.

## Architecture

### Components

- **`Research`**: Orchestrates topic generation and research gathering
- **`GenerateTopics`**: Creates focused research topics from blog title and prompt
- **`WebResearch`**: Conducts real-time web research via Perplexity
- **`CatalogResearch`**: Searches internal documentation (when configured)
- **`WriteOutline`**: Creates structured blog post outline
- **`WriteDraft`**: Generates complete blog post draft
- **`WriteSection`**: Writes individual blog sections
- **`Editorial`**: Enhances content for engagement and polish

### Data Flow

```
Input (title, prompt)
    ↓
Research (topics, web data, catalog data)
    ↓
Outline (structured plan with key points)
    ↓
Draft (complete blog post)
    ↓
Editorial (polished final content)
    ↓
Output (content + metadata)
```

## Output Format

The workflow returns:

```typescript
{
  title: string;
  content: string; // Final blog post in markdown
  metadata: {
    researchTopics: string[];
    sectionsCount: number;
    hasWebResearch: boolean;
    hasCatalogResearch: boolean;
    wordCount: number;
  };
}
```

## Tips for Best Results

1. **Provide Detailed Prompts**: Include target audience, key themes, and desired outcomes
2. **Use Specific Titles**: Clear, focused titles lead to better research and content
3. **Configure Catalog Search**: Index relevant documentation for domain-specific insights
4. **Monitor API Usage**: Perplexity and Anthropic usage can add up with comprehensive research
5. **Customize Prompts**: Adjust component prompts for your specific content style and needs

## Troubleshooting

### Common Issues

1. **Perplexity API Errors**: Ensure your API key is valid and you have sufficient credits
2. **Missing Research**: Check that PERPLEXITY_API_KEY is set correctly
3. **Catalog Search Fails**: This is expected if no documentation is indexed - the workflow continues without it
4. **Long Generation Times**: Complex topics may take 2-5 minutes to complete all steps

### Performance Optimization

- Research and section writing happen in parallel where possible
- Consider using smaller models for development/testing
- Monitor token usage across all API calls

## Contributing

This workflow is designed to be extensible. Consider adding:

- Additional research sources (news APIs, academic databases)
- Different content formats (newsletters, social posts)
- Custom editorial passes for specific industries
- Integration with CMS platforms for publishing

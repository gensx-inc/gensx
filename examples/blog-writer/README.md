# Blog Writer Workflow

A comprehensive GenSX workflow for automated blog writing that combines AI research, structured outlining, draft writing, and editorial enhancement using Anthropic's Claude and Perplexity's real-time web research.

## Features

- **AI-Powered Research**: Uses Perplexity Sonar Pro API for real-time web research with citations
- **Catalog Search**: Integrates with GenSX storage for internal documentation search
- **Structured Outlining**: Creates comprehensive blog post outlines with sections, key points, and research integration
- **Section-by-Section Writing**: Generates detailed blog sections with expert SaaS company writer prompts
- **Editorial Enhancement**: Professional editorial review to improve engagement, style, and readability
- **Tone Matching** (Optional): Adapts writing style to match reference content
- **Metadata Tracking**: Provides insights into the content generation process
- **Claude 4 Integration**: Powered by Anthropic's most advanced language model

## Workflow Steps

1. **Research Phase**:

   - Generates 5-7 focused research topics based on the blog title and prompt
   - Conducts web research using Perplexity's Sonar Pro API for real-time information with citations
   - Searches internal documentation catalog using GenSX storage (when configured)

2. **Outline Creation**:

   - Creates structured outline with introduction, body sections, and conclusion
   - Incorporates research findings into outline structure
   - Defines key points, research topics, and subsections for each section

3. **Draft Writing**:

   - Writes each section using expert SaaS company writer prompts
   - Integrates research data and citations throughout content
   - Includes web research tool for additional section-specific information
   - Maintains consistent structure with proper markdown formatting

4. **Editorial Enhancement**:

   - Comprehensive editorial pass to improve engagement, flow, and readability
   - Applies professional writing guidelines (short sentences, clear language, data-driven claims)
   - Ensures proper word count management and content density
   - Eliminates fluff and strengthens messaging

5. **Tone Matching** (Optional):
   - Analyzes reference URL content for style and tone patterns
   - Adapts final content to match reference writing style while preserving technical accuracy

## Setup

### Prerequisites

- Node.js 18+
- GenSX CLI installed
- API keys for Anthropic Claude and Perplexity

### Environment Variables

Export the following environment variables:

```bash
# Anthropic Claude API Key (Required)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Perplexity API for web research (Required)
PERPLEXITY_API_KEY=your_perplexity_api_key_here
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
  wordCount: 2000, // Optional, defaults to 1500
  referenceURL: "https://example.com/reference-style", // Optional for tone matching
});

console.log(result.content);
console.log(result.metadata);
```

## Configuration

### Perplexity Integration

This workflow uses Perplexity's Sonar Pro API for real-time web research:

- Uses the `sonar-pro` model for advanced reasoning and current information
- Provides comprehensive research with proper citations
- Handles multiple research topics in parallel for efficiency
- Includes citation tracking throughout the content generation process

### Catalog Search (Optional)

The `CatalogResearch` component searches your internal documentation using GenSX storage:

- Searches the "documentation" namespace by default
- Performs vector similarity search for relevant internal content
- Falls back gracefully if no documentation is indexed
- Integrates findings with web research for comprehensive coverage

To use catalog search:

1. Index your documentation using GenSX storage
2. Ensure the namespace is named "documentation"
3. Set the required GenSX environment variables

### Customization

#### Modifying Research Strategy

Edit the `GenerateTopics` component to change how research topics are identified and prioritized.

#### Adjusting Writing Style

The workflow uses three specialized writing prompts:

- **Outline Prompt**: Expert content writer for comprehensive structure planning
- **Draft Prompt**: Expert SaaS company writer with structured planning approach
- **Editorial Prompt**: Professional editor focusing on engagement and clarity

Modify these prompts in their respective components to change tone, style, or approach.

#### Adding Custom Research Sources

Extend the `Research` component to include additional research methods, APIs, or data sources.

## Architecture

### Components

- **`Research`**: Orchestrates topic generation and multi-source research gathering
- **`GenerateTopics`**: Creates focused research topics from blog title and prompt using expert content writer approach
- **`WebResearch`**: Conducts real-time web research via Perplexity Sonar Pro with citation tracking
- **`CatalogResearch`**: Searches internal documentation using GenSX vector storage (optional)
- **`WriteOutline`**: Creates comprehensive structured blog post outline with research integration
- **`WriteDraft`**: Generates complete blog post by writing sections in parallel
- **`WriteSection`**: Writes individual blog sections with expert SaaS company writer prompts and web research tool
- **`Editorial`**: Enhances content for professional quality, engagement, and readability
- **`MatchTone`**: Adapts writing style to match reference content (optional)

### Data Flow

```
Input (title, prompt, wordCount?, referenceURL?)
    ↓
Research (topics, web data, catalog data)
    ↓
Outline (structured plan with sections, key points, research topics)
    ↓
Draft (complete blog post with citations)
    ↓
Editorial (polished, professional content)
    ↓
Tone Matching (style-adapted content - optional)
    ↓
Output (content + metadata)
```

### Key Design Patterns

- **Parallel Processing**: Research topics and draft sections are processed concurrently
- **Structured Data Flow**: Each component produces typed, structured output for the next stage
- **Tool Integration**: Section writing includes dynamic web research capabilities
- **Citation Tracking**: Research citations flow through all components to final content
- **Graceful Degradation**: Optional components (catalog search, tone matching) fail gracefully

## Output Format

The workflow returns:

```typescript
{
  title: string;
  content: string; // Final blog post in markdown format
  metadata: {
    researchTopics: string[];
    sectionsCount: number;
    hasWebResearch: boolean;
    hasToneMatching: boolean;
    wordCount: number;
  };
}
```

## Tips for Best Results

1. **Provide Detailed Prompts**: Include target audience, key themes, desired outcomes, and specific requirements
2. **Use Specific, Focused Titles**: Clear, well-defined titles lead to better research and more coherent content
3. **Configure Catalog Search**: Index relevant internal documentation for domain-specific insights and examples
4. **Monitor API Usage**: Perplexity and Anthropic usage scales with content complexity and research depth
5. **Customize Writing Prompts**: Adjust component prompts to match your specific content style, industry, and audience needs
6. **Use Reference URLs**: Leverage tone matching to adapt content style to match successful existing content

## Troubleshooting

### Common Issues

1. **Perplexity API Errors**: Ensure your API key is valid and you have sufficient credits
2. **Missing Research**: Check that PERPLEXITY_API_KEY is set correctly in your environment
3. **Catalog Search Fails**: This is expected if no documentation is indexed - the workflow continues with web research only
4. **Long Generation Times**: Complex topics with comprehensive research may take 2-5 minutes to complete all steps
5. **Link Hallucination**: The workflow includes strict link policies - only citations from research are used

### Performance Optimization

- Research topics and draft sections are processed in parallel where possible
- Consider using development environment variables for testing to reduce API costs
- Monitor token usage across all API calls, especially for longer content
- Use targeted research topics to reduce unnecessary API calls

## Contributing

This workflow is designed to be extensible and customizable. Consider adding:

- Additional research sources (news APIs, academic databases, industry reports)
- Different content formats (newsletters, whitepapers, social media posts)
- Custom editorial passes for specific industries or compliance requirements
- Integration with CMS platforms for direct publishing
- A/B testing capabilities for different writing approaches
- Analytics integration for content performance tracking

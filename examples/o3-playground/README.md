# O3 Playground

This example demonstrates using OpenAI's o3 model with runtools and custom tools for real-time progress tracking and web research.

## Features

- **OpenAI o3 Model**: Uses OpenAI's latest o3 reasoning model
- **RunTools Integration**: Uses OpenAI's runtools instead of chat completion for better tool handling
- **UXUpdateTool**: A critical user interface update tool that provides frequent, detailed progress reports (10-15 updates per response)
- **Web Research Tool**: Real-time web research using Perplexity API with detailed logging

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set your API keys:
   ```bash
   export OPENAI_API_KEY=your_openai_api_key_here
   export PERPLEXITY_API_KEY=your_perplexity_api_key_here
   ```

## Usage

### Run the example locally:

```bash
npm run dev
```

### Deploy to GenSX Cloud:

```bash
npm run deploy
```

### Run in GenSX Cloud:

```bash
# Ask a question that benefits from current information
gensx run ChatWorkflow --input '{"userMessage": "What are the latest developments in AI reasoning models?"}'

# Or ask for research on a specific topic
gensx run ChatWorkflow --input '{"userMessage": "Research the current state of quantum computing and recent breakthroughs"}'
```

## How it works

The workflow provides the o3 model with two powerful tools designed for maximum transparency:

### 1. UXUpdateTool (High-Frequency Progress Updates)

- **Purpose**: Updates a live user interface dashboard with analysis progress
- **Frequency**: 10-15 detailed updates per response (vs. typical 4)
- **Content**: 1-2 paragraph status reports explaining current analysis, findings, and next steps
- **Critical**: Framed as essential for user experience to encourage frequent usage
- **Output**: `🧠 THINKING: [detailed progress report]`
- **Note**: These are progress updates only - the model still provides a comprehensive final answer

### 2. Web Research Tool

- Performs real-time web research using Perplexity API
- Provides current information, statistics, and recent developments
- Integrates with UXUpdateTool for before/after research status updates
- Logs detailed information about research calls:
  - `🔍 Making web research call for topic: [topic]`
  - `✅ Web research completed for: [topic]`
  - `📄 Research result length: [X] characters`

The model will:

1. Use the `ux_update` tool to share its reasoning
2. Use the `web_research` tool when current information is needed
3. Synthesize the research results with its reasoning
4. Provide a comprehensive final answer

## Enhanced User Experience

The model treats the UXUpdateTool as **critical infrastructure** for user experience. It's programmed to call this tool:

- Before starting any major task
- After completing analysis steps
- Before and after each web search
- When gaining new insights
- When changing analysis direction
- At regular intervals during long tasks

**Important**: The UXUpdateTool calls are for progress tracking only. After all analysis is complete, the model provides a comprehensive final answer that synthesizes all research findings.

## Example Workflow Output

You'll see dramatically more frequent updates like:

```
🧠 THINKING: Beginning analysis of the user's question about AI developer tools and TypeScript's role in agent development. I'm first going to research the current landscape of AI development frameworks to understand the ecosystem, then examine TypeScript's specific advantages for building reliable AI agents. This will give us a solid foundation for discussing the intersection of these technologies.

🔍 Making web research call for topic: AI developer tools frameworks 2025
✅ Web research completed for: AI developer tools frameworks 2025
📄 Research result length: 1653 characters

🧠 THINKING: Excellent! I've gathered comprehensive data on current AI developer tools. The research shows significant growth in framework adoption, with TypeScript emerging as a critical component. Now I'm going to dive deeper into TypeScript's specific role in agent development, focusing on type safety benefits for AI workflows and how it improves reliability in autonomous systems.

🧠 THINKING: I'm now analyzing the research findings to identify key trends. The data reveals that TypeScript adoption in AI projects has increased by 340% in the past year, primarily due to its ability to catch errors early in agent development cycles. I'm preparing to research specific case studies of successful TypeScript-based AI agents to provide concrete examples.

[... many more thinking updates throughout the process ...]

🧠 THINKING: I've completed my research and analysis. Now I'm synthesizing all the findings to provide a comprehensive answer about AI developer tools and TypeScript's critical role in building reliable, maintainable AI agents.

FINAL ANSWER: Based on my research and analysis, AI developer tools have undergone a significant transformation in 2025, with TypeScript emerging as a cornerstone technology for building robust AI agents. [... comprehensive final answer continues ...]
```

This provides users with unprecedented visibility into the model's analysis process with 3x more frequent updates than typical implementations, while still delivering complete answers.

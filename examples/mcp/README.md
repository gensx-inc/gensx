# Model Context Protocol Example

This example demonstrates how to integrate an MCP server into your workflow, and enable those tools to be used in a GenSX workflow.

### What it demonstrates

- Instantiate an MCP server
- Pass the tools to OpenAI for execution

## Getting Started

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Run the example:

   ```bash
   OPENAI_API_KEY=<your_api_key> pnpm run start
   ```

## What is the Model Context Protocol (MCP)?

The Model Context Protocol is an open standard that enables developers to build secure, two-way connections between their data sources and AI-powered tools. MCP allows AI assistants to access relevant context from various systems where data lives, including content repositories, business tools, and development environments.

This example demonstrates how to create components that connect to and interact with MCP servers.

## Learn More

For more information about the Model Context Protocol, visit [Anthropic's MCP page](https://www.anthropic.com/news/model-context-protocol).

### Sample Output for this example

```
Sequential Thinking MCP Server running on stdio

┌────────────────────────────────────────────────────┐
│ 💭 Thought 1/5 │
├────────────────────────────────────────────────────┤
│ I need to find the area of the 25x25 room first.   │
└────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🌿 Branch 2/5 (from thought 1, ID: area_calculation) │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ The area of the full room is calculated by multiplying the length and the width: 25 ft * 25 ft = 625 square feet.   │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🌿 Branch 3/5 (from thought 2, ID: area_calculation) │
├────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Next, calculate the area to be subtracted from the total, which is the 3.5 ft x 3 ft region.   │
└────────────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ 🌿 Branch 4/5 (from thought 3, ID: area_calculation) │
├────────────────────────────────────────────────────────────┤
│ The subtracted area is 3.5 ft * 3 ft = 10.5 square feet.   │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🌿 Branch 5/5 (from thought 4, ID: area_calculation) │
├────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Subtract the unused area from the total room area to get the flooring area required: 625 square feet - 10.5 square feet = 614.5 square feet.   │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 💭 Thought 6/8 │
├────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Now, I need to calculate the amount of flooring based on the size of each piece, which is 5 inches x 4 feet.   │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────┐
│ 🌿 Branch 7/8 (from thought 6, ID: flooring_calculation) │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ Convert the dimensions of the flooring from inches to feet: 5 inches is 5/12 feet.   │
└──────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ 🌿 Branch 8/8 (from thought 7, ID: flooring_calculation) │
├──────────────────────────────────────────────────────────────────┤
│ Calculate the area of one piece of flooring: (5/12 ft) * 4 ft.   │
└──────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ 🌿 Branch 9/10 (from thought 8, ID: flooring_calculation) │
├────────────────────────────────────────────────────────────────────────────┤
│ The area of one piece of flooring is (5/12 ft) * 4 ft = 5/3 square feet.   │
└────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🌿 Branch 10/10 (from thought 9, ID: flooring_calculation) │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Divide the total flooring area by the area of one piece of flooring to determine the number of pieces needed: 614.5 square feet / (5/3 square feet per piece).   │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🌿 Branch 11/11 (from thought 10, ID: flooring_calculation) │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ The number of pieces needed is 614.5 / (5/3) = 368.7, so approximately 369 pieces are required after rounding up.   │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
To cover the 25x25 room while excluding the 3.5 x 3 ft area, you'll need approximately **369 pieces** of flooring, given each piece measures 5 inches by 4 feet.
```

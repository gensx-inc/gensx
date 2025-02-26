# Self-Modifying Code

This example demonstrates a self-modifying code agent. The agent:

1. Creates a copy of its source code
2. Reads context about previous operations
3. Decides on a goal state
4. Modifies its source code to match the goal state
5. Runs tests to verify the changes
6. Starts a new version of itself to continue the work

![Self-Modifying Code Agent](https://card-images.netrunnerdb.com/v2/large/03046.jpg)

## Usage

```bash
# Install dependencies
pnpm install

# Run the example
OPENAI_API_KEY=<api key> REPO_URL=https://github.com/<your-username>/<your-fork-of-gensx> BRANCH=<branch> pnpm run start
```

## Testing

To run the tests, use the following command:

```bash
# Run tests
pnpm test
```

Ensure that all test cases pass successfully to verify the correctness of the code modifications.

## Codebase Structure

- **Root Directory Files**:
  - `README.md`: Documentation for the codebase.
  - `eslint.config.mjs`, `tsconfig.json`, `package.json`: Configuration files for linting, TypeScript, and package management, respectively.
  - `index.tsx`, `workspace.tsx`: Main entry points or components of the application.

- **`agent` Directory**:
  - Contains implementation files for the agent.
  - `codeAgent.tsx` and `smcAgent.tsx`: Core files implementing agent logic.
  - `steps` and `tools`: Subdirectories that hold components for specific functionalities.

- **`agent/steps` Directory**:
  - `generateGoalState.tsx`, `generatePlan.tsx`: Components responsible for generating goals and plans.

- **`agent/tools` Directory**:
  - `bashTool.tsx`, `buildTool.tsx`, `editTool.tsx`: Tools for executing bash commands, building, and editing crucial for self-modification tasks.

## Enhancements

- **Error Handling and Logging**:
  - Improved error handling with detailed logs across tools and steps to facilitate debugging.

## Warning

We did our best to ensure that the agent does not do anything malicious. However, the agent is given direct access to its own source code, and is able to make changes to any file within its workspace,
so there are no guarantees that it will not modify itself in such a way as to enable itself to do problematic things to your computer.

RUN THIS EXAMPLE AT YOUR OWN RISK.

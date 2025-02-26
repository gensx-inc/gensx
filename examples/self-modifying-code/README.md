# Self-Modifying Code

This example demonstrates a self-modifying code agent using [Claude 3.7 Sonnet](https://www.anthropic.com/claude/sonnet). The agent:

1. Creates a copy of it's source code
2. Reads context about previous operations
3. Decides on a goal state
4. Modifies it's source code to match the goal state
5. Runs tests to verify the changes
6. Starts a new version of itself to continue the work

![Self-Modifying Code Agent](https://card-images.netrunnerdb.com/v2/large/03046.jpg)

## Usage

Before running this example, make sure to create and push a new branch to your repo that you are okay with the agent modifying. The agent will automatically pull down the branch, make updates, and push changes.

```bash
# Install dependencies
pnpm install

# Run the example
ANTHROPIC_API_KEY=<api key> REPO_URL=https://github.com/<your-username>/<your-fork-of-gensx> BRANCH=<branch> pnpm run start
```

The agent will run in a loop as described above by default. You can change this behavior by setting `SMC_NO_ITERATION="true"` in the run command and the agent will only run once. If you don't set this parameter, you should actively monitor the agent as each iteration will consume ~1,000,000 tokens.

## Warning

We did our best to ensure that the agent does not do anything malicious. However, the agent is given direct access to it's own source code, and is able to make changes to any file within its workspace, so there are no guarantees that it will not modify itself in such a way as to enable itself to do problematic things to your computer.

The agent will automatically make changes to the branch you provide and will run iteratively. Make sure to actively watch the agent to avoid unintentional changes or a high bill from your LLM provider. If you don't set `SMC_NO_ITERATION="true"` you will need to monitor the agent and kill the process to stop it.

RUN THIS EXAMPLE AT YOUR OWN RISK.

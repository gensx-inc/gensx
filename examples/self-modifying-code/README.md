# Self-Modifying Code

This example demonstrates a self-modifying code agent. The agent:

1. Creates a copy of it's source code
2. Reads context about previous operations
3. Decides on a goal state
4. Modifies it's source code to match the goal state
5. Runs tests to verify the changes
6. Starts a new version of itself to continue the work

![Self-Modifying Code Agent](https://card-images.netrunnerdb.com/v2/large/03046.jpg)

## Usage

```bash
# Install dependencies
pnpm install

# Run the example
OPENAI_API_KEY=<api key> FIRECRAWL_API_KEY=<api key> REPO_URL=https://github.com/<your-username>/<your-fork-of-gensx> BRANCH=<branch> pnpm run start
```

## Warning

We did our best to ensure that the agent does not do anything malicious. However, the agent is given direct access to it's own source code, and is able to make changes to any file within its workspace,
so there are no guarantees that it will not modify itself in such a way as to enable itself to do problematic things to your computer.

RUN THIS EXAMPLE AT YOUR OWN RISK.

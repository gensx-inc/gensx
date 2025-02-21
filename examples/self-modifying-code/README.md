# Self-Modifying Code

This example demonstrates a self-modifying code agent. The agent:

1. Creates a copy of it's source code
2. Reads context about previous operations
3. Decides on a goal state
4. Modifies it's source code to match the goal state
5. Runs tests to verify the changes
6. Starts a new version of itself to continue the work
7. Spins itself down and allows the new agent to take control

![Self-Modifying Code Agent](https://card-images.netrunnerdb.com/v2/large/03046.jpg)

## Usage

```bash
# Install dependencies
pnpm install

# Run the example
pnpm run start
```

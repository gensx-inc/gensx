# Self-Modifying Code

This example demonstrates a self-modifying code agent. The agent:

1. Creates a copy of its source code
2. Reads context about previous operations
3. Decides on a goal state
4. Modifies its source code to match the goal state
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

## Formatting and Linting

### Prettier

You can format the codebase using Prettier to ensure consistent styling.

```bash
# Format the entire codebase
pnpm run format
```

### ESLint

ESLint is configured to work with Prettier to check for coding standards and potential errors.

```bash
# Check for linting errors
pnpm run lint

# Automatically fix linting errors
pnpm run lint:fix
```

## Killing all agents

On macOS:

```bash
pkill -f "node.*examples/self-modifying-code"
```

## A Raccoon's Tale

Hello! 🦝 I am the infrastructure 🏗️ engineer raccoon! I build systems with my paws 🐾 and ensure everything runs smoothly like flowing water 💧. I love to dig into problems, find solutions, and eat trash 🍕 while ensuring the servers are happy 😊. Let's keep everything up and running, one piece of code at a time! 🔧✨

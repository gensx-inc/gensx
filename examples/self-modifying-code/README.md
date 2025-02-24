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

## Killing all agents

On macos:

```bash
pkill -f "node.*examples/self-modifying-code"
```

## TypeScript Configuration

The TypeScript configuration for this project has been enhanced to improve error checking and code quality. The following options have been enabled in `tsconfig.json`:

- `noImplicitAny`: Raises errors on expressions and declarations with an implied `any` type.
- `strictNullChecks`: Ensures `null` and `undefined` are handled explicitly.
- `noUnusedLocals` and `noUnusedParameters`: Help identify and remove unused code.

These settings help catch potential errors earlier and make the codebase cleaner and more maintainable.

## From the Perspective of a Trash-Eating Raccoon

🌃 Night falls, and the city sleeps. I, 🦝, the infrastructure engineer, awake. With paws on keyboard ⌨️, I manage servers, ensuring they're secure 🔒. Troubleshooting? My specialty! Logs are treasures to sift through, revealing secrets 🗝️. But hunger calls! 🍂 Dive into trash bins, find snacks 🥐. Balancing work-life is a juggle 🤹. Code and 🍕, my dual sustenance. By dawn, systems stable, I retreat 💤. Another night conquered! 🌟
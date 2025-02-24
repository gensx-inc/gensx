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

## Killing all agents

On macos:

```bash
pkill -f "node.*examples/self-modifying-code"
```

## A Trash Eating Raccoon's Tale

Once upon a time, in the 🏙️ city, there lived a raccoon named Rocky who was an infrastructure engineer. By day, he managed servers and networks, ensuring everything ran smoothly. By night, he rummaged through bins for 🍕 and 🍔. Rocky's life was a balance of 1s and 0s, and 🍟 and ♻️. Despite the odd looks from his 👫 colleagues, Rocky knew that life was about balance. The thrill of debugging a network issue was only matched by the joy of finding a half-eaten 🌭. And so, Rocky continued his dual life, a master of both tech and trash. 🖥️✨
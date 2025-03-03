---
title: "LLMs are really bad at Tic-Tac-Toe"
excerpt: ""
date: "2025-03-03T00:00:00.000Z"
coverImage: "/assets/blog/hello-world/cover.jpg"
author:
  name: Derek Legenzoff
  picture: "/assets/blog/authors/derek.jpg"
ogImage:
  url: "/assets/blog/hello-world/cover.jpg"
---

LLMs are really bad at Tic-Tac-Toe. They're so bad, in fact, that I spent hours debugging my code and looking through traces in [GenSX](https://www.gensx.com/) to make sure the LLMs were the dumb ones and not me. Turns out they really are just quite bad at the game--something that's made even more surprising by the fact that LLMs wrote most of the code I used to test this.

Evaluating LLMs by having them play games like Tic-Tac-Toe is....

So how bad are they really? Let's dive in.

## The Setup

To keep things simple and fair, I had each model play 100 games against a basic computer strategy alternating who goes first. The computer would just make random moves unless it (a) had two in a row and could make a winning move or (b) could block the opponent from winning. In theory, it should be kind of hard to beat but really easy to draw.

Each model received the same prompt. For the system message

```
You are playing a game of Tic Tac Toe and are working hard to win the game. You are player X and your opponent is O.

Tic Tac Toe rules:
- The board is a 3x3 grid.
- Players take turns placing their pieces on the board.
- You can only place your piece in an empty square.
- You win if you can get 3 of your pieces in a row, column, or diagonal.
- The game is a draw if the board is full and no player has won.

You will be sent the board. You will respond with JSON in following format, that represents where you want to place your piece.
{
   "row": 1|2|3
   "column": 1|2|3
}

Please respond with the json inside of <move> xml tags (no backticks). Do not include any other text in the output.
```

Then the user message would be the current state of the board, formatted like this:

```
    1   2   3
  +---+---+---+
1 | X | O | . |
  +---+---+---+
2 | . | X | . |
  +---+---+---+
3 | O | X | O |
  +---+---+---+
```

## The Results

With the exception of reasoning models, every model was absolutely terrible at the game. Not only did they miss tons of opportunities to win or block the opponent, they also frequently just made invalid moves. One common failure mode was trying to "win" by placing their piece where the opponent already had a piece.

You'll also notice that the LLMs missed blocking moves far more often than they missed winning moves: often they were too focused on trying to win that they didn't notice the opponent was about to win.

Here are the results from a few top models:

<!-- image of the results -->

For comparison, here are the results from a bot making moves at random.

<!-- image of the results -->

LLMs are only marginally better at tic-tac-toe than placing moves at random.

There doesn't seem to be any meaningful difference between small and large models either. They're just all bad.

<!-- image of the results -->

### Chain-of-thought

Now one fair criticism of this setup is that chain-of-thought wasn't used to allow the models to reason through their moves. The prompt explicitly tells the model to just respond with the move. Of course once we let the model think first they'll do better, right? Kind of.

Here's a comparison of gpt-4o-mini with the prompt above and a prompt that encourages the model to think through the strategy.

<!-- image of the thinking vs non thinking results -->

### Reasoning models

Reasoning models are a bit better, but still very unimpressive considering they're spending hundreds of tokens formulating an approach.

<!-- image of the results -->

## Why are they so bad?

- out of distribution?
- hard to visualize the board?

To an LLM the board looks more like this:

```
    1   2   3\n  +---+---+---+\n1 | X | O | . |\n  +---+---+---+\n2 | . | X | . |\n  +---+---+---+\n3 | O | X | O |\n  +---+---+---+
```

- make an anologie to competitive programming

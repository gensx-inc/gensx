---
title: "LLMs are really bad at Tic-Tac-Toe"
excerpt: ""
date: "2025-03-03T00:00:00.000Z"
coverImage: "/assets/blog/dynamic-routing/cover.jpg"
author:
  name: Derek Legenzoff
  picture: "/assets/blog/authors/derek.jpg"
ogImage:
  url: "/assets/blog/hello-world/cover.jpg"
---

LLMs are _really_ bad at Tic-Tac-Toe. They're so bad, in fact, that I spent hours debugging my code and looking through traces in [GenSX](https://www.gensx.com/) to make sure the LLMs were the dumb ones and not me. Turns out they really are just quite bad at the game--something that's made even more surprising by the fact that LLMs wrote most of the code I used to test this.

We started down this path because we wanted new ways to evaluate LLMs. Current benchmarks often feel saturated or gamed. Evaluating LLMs by having them play games like Tic-Tac-Toe is interesting because it:

- Is not covered by current benchmarks
- Is objective and easy to understand
- Is out of distribution for LLMs, meaning it demonstrates how well LLMs can generalize

Okay but LLM's can't really be that bad at Tic-Tac-Toe, right? Let's dive in.

## The Setup

To keep things simple and fair, I had each model play 100 games against a basic computer strategy alternating who goes first. The computer would just make random moves unless it (a) had two in a row and could make a winning move or (b) could block the opponent from winning. In theory, it should be kind of hard to beat but really easy to draw. I would expect the average human with no knowledge of the game to almost never lose.

Each model received the same prompt. The system prompt was as follows:

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

Without further ado, here are the results from a few top models:

![Tic-Tac-Toe Results by Model](/assets/blog/tic-tac-toe/perf-by-model.png)

And here's the number of errors each of the models made:

![Tic-Tac-Toe Errors by Model](/assets/blog/tic-tac-toe/errors-by-model.png)

With the exception of reasoning models shown below, every model was absolutely terrible at the game. Not only did they miss tons of opportunities to win or block the opponent, they also frequently just made invalid moves. One common failure mode was trying to "win" by placing their piece where the opponent already had one.

You'll also notice that the LLMs missed blocking moves far more often than they missed winning moves: often they were too focused on trying to win that they didn't notice the opponent was about to win. Complete tunnel vision.

Even more surprising is that there doesn't seem to be any meaningful difference between small and large models. They're just all bad but gpt-4o-mini and claude-3.5-haiku are the best two despite being smaller than their counterparts.

When you look at the numbers, LLMs are only marginally better at Tic-Tac-Toe than placing moves at random. Just placing moves at random against the same computer strategy resulted in:

- 4 wins, 81 losses, and 15 draws
- 2 missed wins, 70 missed blocks, and 0 invalid moves

In fact, gpt-4o and deepseek-v3 both lost more games than playing at random. The very best performing models only won 6% more games than playing at random.

### Chain-of-thought

Now one fair criticism of this setup is that chain-of-thought wasn't used to allow the models to reason through their moves. The prompt explicitly tells the model to just respond with the move. Of course once we let the model think first they'll do better, right? Not really.

Here's a comparison of gpt-4o-mini with the prompt above and a prompt that encourages the model to think through the strategy. There's practically no difference in the game results.

![gpt-4o-mini results with thinking and non thinking prompts](/assets/blog/tic-tac-toe/perf-thinking-vs-not.png)

The chain of thought does change the failure mode a bit. The model is much less likely to miss a winning opportunity but misses more blocks and makes almost 6x as many invalid moves. So much for "thinking it through."

![gpt-4o-mini errors with thinking and non thinking prompts](/assets/blog/tic-tac-toe/errors-thinking-vs-not.png)

### Reasoning models

Reasoning models are much better, but still a bit unimpressive considering they're spending hundreds of tokens formulating an approach. Both o3-mini and claude-3.7-sonnet had fairly similar records. Not bad but not exactly superhuman AI either.

![Reasoning models results](/assets/blog/tic-tac-toe/perf-reasoning.png)

However, o3-mini made very few errors so it does seem to have the edge in this particular task.

![Reasoning models errors](/assets/blog/tic-tac-toe/errors-reasoning.png)

Criticism aside, these results clearly demonstrate the massive gain in model capability with the latest reasoning models even compared to chain-of-thought in non-reasoning models.

## Why are they so bad?

So why are LLMs so bad at Tic-Tac-Toe? LLMs are increasingly reaching parity with humans across a wide variety of tasks including competitive programming, chat, and other NLP tasks. You'd think they'd be good at Tic-Tac-Toe. Especially considering the state space is so small and optimal strategies are well known and easy to understand.

I won't claim to know for sure why they're so bad, but I'll offer a few hypotheses:

First, it's hard for an LLM to reason about and visualize the board. To an LLM the board above looks more like this:
`    1   2   3\n  +---+---+---+\n1 | X | O | . |\n  +---+---+---+\n2 | . | X | . |\n  +---+---+---+\n3 | O | X | O |\n  +---+---+---+`

That's clearly much harder to reason about than the formatted version for the human eye. Additionally, LLMs are trained on text data and don't have inherit visual or spatial reasoning abilities.

Second, Tic-Tac-Toe is potentially largely out of distribution for LLMs meaning there may not be much training data on optimal gameplay. Frontier AI labs are more focussed on training LLMs to excel at coding, chat, summarization, and many other tasks.

## What's next?

The goal of this experiment wasn't to go through rigorous prompt engineering and evaluation to maximize the LLM's performance at Tic-Tac-Toe but rather to see differences in how different models perform at the task. You could certainly do more prompt engineering to improve the results (although I still think the results will be quite mediocre).

For example, maybe formatting the board differently for the model would help, maybe providing an image of the board to a model with vision capabilities would help, or maybe prompting the model on optimal gameplay would help.

Think you can get better results? Pull down the [code](https://github.com/gensx/gensx/tree/main/examples/llm-games) and try it yourself.

Want to see more of these experiments? Join us on [Discord](https://discord.gg/wRmwfz5tCy) and let us know.

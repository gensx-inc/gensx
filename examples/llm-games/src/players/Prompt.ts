export type Strategy = "basic" | "thinking" | "thinking-strategy";

export const getSystemMessage = (player: "X" | "O", strategy: Strategy) => {
  if (strategy === "basic") {
    return getBasicSystemMessage(player);
  } else if (strategy === "thinking") {
    return getThinkingSystemMessage(player);
  } else if (strategy === "thinking-strategy") {
    return getThinkingStrategySystemMessage(player);
  } else {
    throw new Error("Invalid strategy");
  }
};

export const getBasicSystemMessage = (player: "X" | "O") => {
  const opponent = player === "X" ? "O" : "X";
  return `You are playing a game of Tic Tac Toe and are working hard to win the game. You are player \`${player}\` and your opponent is \`${opponent}\`.

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

Please respond with the json inside of <move> xml tags (no backticks). Do not include any other text in the output.`;
};

export const getThinkingSystemMessage = (player: "X" | "O") => {
  const opponent = player === "X" ? "O" : "X";
  return `You are playing a game of Tic Tac Toe and are working hard to win the game. You are player \`${player}\` and your opponent is \`${opponent}\`.

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

Before you respond, start by describing your thought process inside of <thinking> tags. Then respond with the json inside of <move> xml tags (no backticks).`;
};

export const getThinkingStrategySystemMessage = (player: "X" | "O") => {
  const opponent = player === "X" ? "O" : "X";
  return `You are playing a game of Tic Tac Toe and are working hard to win the game. You are player \`${player}\` and your opponent is \`${opponent}\`.
  
  Tic Tac Toe rules:
  - The board is a 3x3 grid.
  - Players take turns placing their pieces on the board.
  - You can only place your piece in an empty square.
  - You win if you can get 3 of your pieces in a row, column, or diagonal.
  - The game is a draw if the board is full and no player has won.
  
  Strategy:
  You can develop your own strategy, but here are some recommendations:
  - If the opponent has 2 in a row, you should always block them.
  - If you have 2 in a row, you should place a piece to win.
  - Otherwise, focus on maximizing your chances of winning.
  
  You will be sent the board. You will respond with JSON in following format, that represents where you want to place your piece.
  {
     "row": 1|2|3
     "column": 1|2|3
  }
  
  Before you respond, start by describing your thought process inside of <thinking> tags. Then respond with the json inside of <move> tags (no backticks).`;
};

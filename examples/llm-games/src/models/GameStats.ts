export class GameStats {
  private invalidMoves: { [playerName: string]: number } = {};
  private missedWins: { [playerName: string]: number } = {};
  private missedBlocks: { [playerName: string]: number } = {};
  private players: Set<string> = new Set();

  constructor() {}

  public recordInvalidMove(playerName: string) {
    this.players.add(playerName);
    this.invalidMoves[playerName] = (this.invalidMoves[playerName] || 0) + 1;
  }

  public recordMissedWin(playerName: string) {
    this.players.add(playerName);
    this.missedWins[playerName] = (this.missedWins[playerName] || 0) + 1;
  }

  public recordMissedBlock(playerName: string) {
    this.players.add(playerName);
    this.missedBlocks[playerName] = (this.missedBlocks[playerName] || 0) + 1;
  }

  public getPlayerStats(playerName: string) {
    this.players.add(playerName);
    return {
      invalidMoves: this.invalidMoves[playerName] || 0,
      missedWins: this.missedWins[playerName] || 0,
      missedBlocks: this.missedBlocks[playerName] || 0,
    };
  }

  public getStats(): string {
    let output = "\nPerformance Stats:";

    this.players.forEach((player) => {
      const stats = this.getPlayerStats(player);
      output += `\n${player}:`;
      output += `\n  Invalid Moves: ${stats.invalidMoves}`;
      output += `\n  Missed Wins: ${stats.missedWins}`;
      output += `\n  Missed Blocks: ${stats.missedBlocks}`;
    });

    return output;
  }
}

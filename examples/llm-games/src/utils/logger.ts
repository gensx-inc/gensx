import { GameStats } from "../models/GameStats";
import * as fs from "fs";
import * as path from "path";

export interface GameLog {
  gameId: string;
  player: string;
  move: number;
  row: number;
  column: number;
  isInvalidMove: boolean;
  isMissedWin: boolean;
  isMissedBlock: boolean;
}

export interface TournamentLog {
  gameId: string;
  player1: string;
  player2: string;
  winner: string | null;
  isDraw: boolean;
  stats: {
    [playerName: string]: {
      invalidMoves: number;
      missedWins: number;
      missedBlocks: number;
    };
  };
}

class Logger {
  private static sessionId: string;
  private static logsDir: string;
  private static gameLogsFile: string;
  private static tournamentLogsFile: string;

  private static initializeSession() {
    if (!this.sessionId) {
      this.sessionId =
        new Date().toISOString().split("T")[0] + "_" + Date.now();
      this.logsDir = path.join(process.cwd(), "logs", this.sessionId);

      // Create logs directory if it doesn't exist
      fs.mkdirSync(this.logsDir, { recursive: true });

      this.gameLogsFile = path.join(this.logsDir, "game_logs.jsonl");
      this.tournamentLogsFile = path.join(
        this.logsDir,
        "tournament_logs.jsonl"
      );
    }
  }

  private static appendToFile(filePath: string, data: any) {
    fs.appendFileSync(filePath, JSON.stringify(data) + "\n");
  }

  private static generateGameId(): string {
    const now = new Date();
    const timestamp =
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, "0") +
      now.getDate().toString().padStart(2, "0") +
      now.getHours().toString().padStart(2, "0") +
      now.getMinutes().toString().padStart(2, "0") +
      now.getSeconds().toString().padStart(2, "0");
    return `game_${timestamp}`;
  }

  static logGameMove(
    gameId: string,
    player: string,
    moveNumber: number,
    row: number,
    column: number,
    board: string, // keep parameter for compatibility but don't use it
    isInvalidMove: boolean = false,
    isMissedWin: boolean = false,
    isMissedBlock: boolean = false
  ): void {
    this.initializeSession();
    const log: GameLog = {
      gameId,
      player,
      move: moveNumber,
      row: row,
      column: column,
      isInvalidMove,
      isMissedWin,
      isMissedBlock,
    };
    const logEntry = { type: "game_move", ...log };
    //console.log(JSON.stringify(logEntry));
    this.appendToFile(this.gameLogsFile, logEntry);
  }

  static logTournamentGame(
    gameId: string,
    player1: string,
    player2: string,
    winner: string | null,
    isDraw: boolean,
    gameStats: GameStats
  ): void {
    this.initializeSession();
    const log: TournamentLog = {
      gameId,
      player1,
      player2,
      winner,
      isDraw,
      stats: {
        [player1]: gameStats.getPlayerStats(player1) || {
          invalidMoves: 0,
          missedWins: 0,
          missedBlocks: 0,
        },
        [player2]: gameStats.getPlayerStats(player2) || {
          invalidMoves: 0,
          missedWins: 0,
          missedBlocks: 0,
        },
      },
    };
    const logEntry = { type: "tournament_game", ...log };
    //console.log(JSON.stringify(logEntry));
    this.appendToFile(this.tournamentLogsFile, logEntry);
  }

  static startNewGame(): string {
    this.initializeSession();
    const gameId = this.generateGameId();
    const logEntry = {
      type: "game_start",
      gameId,
    };
    //console.log(JSON.stringify(logEntry));
    this.appendToFile(this.gameLogsFile, logEntry);
    return gameId;
  }

  static getSessionInfo(): { sessionId: string; logsDir: string } {
    this.initializeSession();
    return {
      sessionId: this.sessionId,
      logsDir: this.logsDir,
    };
  }
}

export default Logger;

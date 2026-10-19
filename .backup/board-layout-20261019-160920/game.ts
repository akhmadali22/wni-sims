export type TileType =
  | "start"
  | "property"
  | "jail"
  | "tax"
  | "court"
  | "extortion"
  | "toll"
  | "ticket"
  | "disaster"
  | "unknown";

export type PlayerStatus =
  | "active"
  | "jailed"
  | "bankrupt";

export type GamePhase =
  | "setup"
  | "awaiting_roll"
  | "resolving"
  | "awaiting_end_turn"
  | "finished";

export interface BoardTile {
  id: string;
  index: number;
  name: string;
  type: TileType;
  verified: boolean;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  cash: number;
  position: number;
  status: PlayerStatus;
  jailTurns: number;
  propertyIds: string[];
  inventory: string[];
}

export interface GameLogEntry {
  id: string;
  turn: number;
  message: string;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  turnNumber: number;
  dice: [number, number] | null;
  logs: GameLogEntry[];
  phase: GamePhase;
}

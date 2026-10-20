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
  | "unknown"
  | "pungli"
  | "destiny";

export type PlayerId = string;
export type StateId = "state";
export type AccountId = PlayerId | StateId;
export type RandomSource = () => number;
export type RuntimeIdFactory = (scope: string) => string;
export interface RuntimeServices {
  random: RandomSource;
  createId: RuntimeIdFactory;
}
export type PlayerStatus = "active" | "jailed" | "bankrupt";

export type GamePhase =
  | "setup"
  | "awaiting_roll"
  | "awaiting_prison_turn"
  | "moving"
  | "resolving_start"
  | "resolving_housing"
  | "resolving_destination"
  | "resolving_doubles_destiny"
  | "awaiting_end_turn"
  | "checking_game_over"
  | "finished";

export interface BoardTile {
  id: string;
  index: number;
  name: string;
  type: TileType;
  verified: boolean;
  island?: string;
  side: number;
  sidePosition: number;
  isCorner: boolean;
}

export type PropertyOwner =
  | { kind: "unowned" }
  | { kind: "player"; playerId: PlayerId }
  | { kind: "state" };

export interface PropertyState {
  propertyId: string;
  owner: PropertyOwner;
  housingLevel: number;
}

export interface Player {
  id: PlayerId;
  name: string;
  color: string;
  cash: number;
  position: number;
  completedLaps: number;
  status: PlayerStatus;
  prison: { turnsRemaining: number };
  inventory: string[];
}

export interface CountryState {
  id: StateId;
  /** `null` berarti treasury negara belum dihitung sebagai saldo terbatas. */
  treasury: number | null;
}

export interface GameLogEntry {
  id: string;
  turn: number;
  message: string;
}

export interface PendingDecision {
  id: string;
  actorId: PlayerId;
  kind: string;
  optionIds: string[];
  source: string;
}

export interface PendingPayment {
  id: string;
  payerId: AccountId;
  payeeId: AccountId;
  amount: number;
  reason: string;
  source: string;
  shortfall: number;
}

export type MovementCause = "dice" | "card" | "toll_teleport";

export interface PendingMovement {
  playerId: PlayerId;
  cause: MovementCause;
  steps?: number;
  destination?: number;
}

export interface FinancialTransaction {
  id: string;
  payerId: AccountId;
  payeeId: AccountId;
  amount: number;
  reason: string;
  source: string;
  turn: number;
}

export interface DeckState {
  drawPile: string[];
  discardPile: string[];
}

export type GameEndReason = "all_players_bankrupt";

export interface GameState {
  schemaVersion: 1;
  revision: number;
  players: Player[];
  country: CountryState;
  propertyStates: Record<string, PropertyState>;
  currentPlayerIndex: number;
  turnNumber: number;
  dice: [number, number] | null;
  pendingMovement: PendingMovement | null;
  pendingDecision: PendingDecision | null;
  pendingPayment: PendingPayment | null;
  transactions: FinancialTransaction[];
  decks: { disaster: DeckState; destiny: DeckState };
  processedActionIds: string[];
  logs: GameLogEntry[];
  phase: GamePhase;
  winnerId: AccountId | null;
  endReason: GameEndReason | null;
}

interface GameActionBase {
  id: string;
}

export type GameAction =
  | (GameActionBase & {
      type: "ROLL_DICE";
      dice: [number, number];
    })
  | (GameActionBase & { type: "RESOLVE_MOVEMENT" })
  | (GameActionBase & { type: "ADVANCE_RESOLUTION" })
  | (GameActionBase & { type: "END_TURN" })
  | (GameActionBase & { type: "END_PRISON_TURN" })
  | (GameActionBase & {
      type: "TELEPORT_PLAYER";
      playerId: PlayerId;
      destination: number;
      source: string;
    });

export interface TransactionRequest {
  id: string;
  payerId: AccountId;
  payeeId: AccountId;
  amount: number;
  reason: string;
  source: string;
}

export type TransactionResult =
  | { status: "applied"; state: GameState }
  | {
      status: "insufficient_funds";
      state: GameState;
      shortfall: number;
    };

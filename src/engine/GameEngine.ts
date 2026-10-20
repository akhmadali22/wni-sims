import {
  DEFAULT_INITIAL_CASH,
  MAX_PLAYERS,
  MIN_PLAYERS,
} from "../config/game";
import { board } from "../data/board";
import { properties } from "../data/properties";
import type {
  AccountId,
  FinancialTransaction,
  GameAction,
  GameLogEntry,
  GameState,
  MovementCause,
  Player,
  PlayerId,
  PropertyState,
  RandomSource,
  TransactionRequest,
  TransactionResult,
} from "../types/game";

export const START_SALARY = 1_000_000;

const PLAYER_COLORS = [
  "#e74c3c",
  "#3498db",
  "#2ecc71",
  "#f1c40f",
  "#9b59b6",
];

function createLog(
  state: Pick<GameState, "logs" | "revision" | "turnNumber">,
  message: string,
): GameLogEntry {
  return {
    id: `log-${state.revision}-${state.logs.length}`,
    turn: state.turnNumber,
    message,
  };
}

function createInitialPropertyStates(): Record<string, PropertyState> {
  return Object.fromEntries(
    properties.map((property) => [
      property.id,
      {
        propertyId: property.id,
        owner: { kind: "unowned" },
        housingLevel: 0,
      } satisfies PropertyState,
    ]),
  );
}

export function getPlayerPropertyIds(
  state: GameState,
  playerId: PlayerId,
): string[] {
  return Object.values(state.propertyStates)
    .filter(
      (property) =>
        property.owner.kind === "player" &&
        property.owner.playerId === playerId,
    )
    .map((property) => property.propertyId);
}

export function rollDie(random: RandomSource = Math.random): number {
  return Math.floor(random() * 6) + 1;
}

export function rollDice(
  random: RandomSource = Math.random,
): [number, number] {
  return [rollDie(random), rollDie(random)];
}

export function createInitialState(
  playerNames: string[],
  startingCash: number = DEFAULT_INITIAL_CASH,
): GameState {
  if (
    playerNames.length < MIN_PLAYERS ||
    playerNames.length > MAX_PLAYERS
  ) {
    throw new Error(
      `Jumlah pemain harus antara ${MIN_PLAYERS} dan ${MAX_PLAYERS}.`,
    );
  }

  if (playerNames.some((name) => !name.trim())) {
    throw new Error("Nama pemain tidak boleh kosong.");
  }

  if (!Number.isFinite(startingCash) || startingCash < 0) {
    throw new Error("Modal awal tidak valid.");
  }

  const players: Player[] = playerNames.map((name, index) => ({
    id: `player-${index + 1}`,
    name: name.trim(),
    color: PLAYER_COLORS[index],
    cash: startingCash,
    position: 0,
    completedLaps: 0,
    status: "active",
    prison: { turnsRemaining: 0 },
    inventory: [],
  }));

  const initialState: GameState = {
    schemaVersion: 1,
    revision: 0,
    players,
    country: { id: "state", treasury: null },
    propertyStates: createInitialPropertyStates(),
    currentPlayerIndex: 0,
    turnNumber: 1,
    dice: null,
    pendingMovement: null,
    pendingDecision: null,
    pendingPayment: null,
    transactions: [],
    decks: {
      disaster: { drawPile: [], discardPile: [] },
      destiny: { drawPile: [], discardPile: [] },
    },
    processedActionIds: [],
    logs: [],
    phase: "awaiting_roll",
    winnerId: null,
    endReason: null,
  };

  return {
    ...initialState,
    logs: [
      createLog(
        initialState,
        `Permainan dimulai dengan ${players.length} pemain.`,
      ),
    ],
  };
}

function findPlayerIndex(state: GameState, playerId: PlayerId): number {
  const index = state.players.findIndex((player) => player.id === playerId);

  if (index === -1) {
    throw new Error("Pemain tidak ditemukan.");
  }

  return index;
}

function getBalance(state: GameState, accountId: AccountId): number | null {
  if (accountId === "state") {
    return state.country.treasury;
  }

  return state.players[findPlayerIndex(state, accountId)].cash;
}

export function applyFinancialTransaction(
  state: GameState,
  request: TransactionRequest,
): TransactionResult {
  if (!Number.isSafeInteger(request.amount) || request.amount <= 0) {
    throw new Error("Jumlah transaksi harus bilangan bulat positif.");
  }

  if (request.payerId === request.payeeId) {
    throw new Error("Pembayar dan penerima transaksi harus berbeda.");
  }

  if (
    state.transactions.some((transaction) => transaction.id === request.id)
  ) {
    throw new Error(`Transaksi ${request.id} sudah diproses.`);
  }

  const payerBalance = getBalance(state, request.payerId);
  getBalance(state, request.payeeId);

  if (payerBalance !== null && payerBalance < request.amount) {
    const shortfall = request.amount - payerBalance;
    return {
      status: "insufficient_funds",
      shortfall,
      state: {
        ...state,
        pendingPayment: { ...request, shortfall },
      },
    };
  }

  const players = state.players.map((player) => {
    if (player.id === request.payerId) {
      return { ...player, cash: player.cash - request.amount };
    }
    if (player.id === request.payeeId) {
      return { ...player, cash: player.cash + request.amount };
    }
    return player;
  });
  let country = state.country;
  if (country.treasury !== null) {
    const delta = request.payeeId === "state"
      ? request.amount
      : request.payerId === "state"
        ? -request.amount
        : 0;
    country = { ...country, treasury: country.treasury + delta };
  }
  const transaction: FinancialTransaction = {
    ...request,
    turn: state.turnNumber,
  };

  return {
    status: "applied",
    state: {
      ...state,
      players,
      country,
      pendingPayment: null,
      transactions: [...state.transactions, transaction],
    },
  };
}

interface MovementInput {
  playerId: PlayerId;
  cause: MovementCause;
  steps?: number;
  destination?: number;
  source: string;
}

function applyMovement(state: GameState, input: MovementInput): GameState {
  const playerIndex = findPlayerIndex(state, input.playerId);
  const player = state.players[playerIndex];

  if (player.status === "bankrupt") {
    throw new Error("Pemain bangkrut tidak dapat bergerak.");
  }

  let newPosition: number;
  let completedLaps = 0;

  if (input.cause === "toll_teleport") {
    if (
      !Number.isInteger(input.destination) ||
      input.destination === undefined ||
      input.destination < 0 ||
      input.destination >= board.length
    ) {
      throw new Error("Tujuan teleportasi tidak valid.");
    }
    newPosition = input.destination;
  } else {
    if (
      !Number.isInteger(input.steps) ||
      input.steps === undefined ||
      input.steps < 0
    ) {
      throw new Error("Jumlah langkah harus bilangan bulat nonnegatif.");
    }
    const rawPosition = player.position + input.steps;
    completedLaps = Math.floor(rawPosition / board.length);
    newPosition = rawPosition % board.length;
  }

  const players = [...state.players];
  players[playerIndex] = {
    ...player,
    position: newPosition,
    completedLaps: player.completedLaps + completedLaps,
  };
  let nextState: GameState = { ...state, players };

  if (completedLaps > 0) {
    const salary = START_SALARY * completedLaps;
    const result = applyFinancialTransaction(nextState, {
      id: `salary-${input.source}`,
      payerId: "state",
      payeeId: player.id,
      amount: salary,
      reason: "start_salary",
      source: input.source,
    });
    if (result.status !== "applied") {
      throw new Error("Pembayaran gaji Start oleh negara gagal.");
    }
    nextState = result.state;
    nextState = {
      ...nextState,
      logs: [
        ...nextState.logs,
        createLog(
          nextState,
          `${player.name} melewati Start dan menerima gaji Rp${salary.toLocaleString("id-ID")}.`,
        ),
      ],
    };
  }

  const verb = input.cause === "toll_teleport"
    ? "dipindahkan"
    : `bergerak ${input.steps} langkah`;
  return {
    ...nextState,
    logs: [
      ...nextState.logs,
      createLog(
        nextState,
        `${player.name} ${verb} ke ${board[newPosition].name}.`,
      ),
    ],
  };
}

/** Compatibility helper. Gameplay baru harus bergerak melalui action processor. */
export function movePlayer(
  state: GameState,
  playerId: string,
  steps: number,
): GameState {
  return applyMovement(state, {
    playerId,
    cause: "dice",
    steps,
    source: `legacy-move-${state.revision}-${state.logs.length}`,
  });
}

function requirePhase(state: GameState, expected: GameState["phase"]): void {
  if (state.phase !== expected) {
    throw new Error(
      `Aksi tidak valid pada fase ${state.phase}; fase yang dibutuhkan ${expected}.`,
    );
  }
}

function finalizeAction(state: GameState, actionId: string): GameState {
  return {
    ...state,
    revision: state.revision + 1,
    processedActionIds: [...state.processedActionIds, actionId],
  };
}

function nextEligiblePlayerIndex(state: GameState): number | null {
  for (let offset = 1; offset <= state.players.length; offset += 1) {
    const index = (state.currentPlayerIndex + offset) % state.players.length;
    if (state.players[index].status !== "bankrupt") {
      return index;
    }
  }
  return null;
}

function finishTurnRotation(state: GameState): GameState {
  const nextIndex = nextEligiblePlayerIndex(state);
  if (nextIndex === null) {
    return {
      ...state,
      dice: null,
      pendingMovement: null,
      phase: "finished",
      winnerId: "state",
      endReason: "all_players_bankrupt",
      logs: [
        ...state.logs,
        createLog(state, "Seluruh pemain bangkrut. Negara menang."),
      ],
    };
  }

  const completedRound = nextIndex <= state.currentPlayerIndex;
  const nextTurnNumber = completedRound
    ? state.turnNumber + 1
    : state.turnNumber;
  const nextPlayer = state.players[nextIndex];
  return {
    ...state,
    currentPlayerIndex: nextIndex,
    turnNumber: nextTurnNumber,
    dice: null,
    pendingMovement: null,
    phase: nextPlayer.status === "jailed"
      ? "awaiting_prison_turn"
      : "awaiting_roll",
    logs: [
      ...state.logs,
      createLog(
        { ...state, turnNumber: nextTurnNumber },
        `Giliran berikutnya: ${nextPlayer.name}.`,
      ),
    ],
  };
}

export function dispatchGameAction(
  state: GameState,
  action: GameAction,
): GameState {
  if (state.processedActionIds.includes(action.id)) {
    throw new Error(`Aksi ${action.id} sudah diproses.`);
  }

  if (state.pendingDecision || state.pendingPayment) {
    throw new Error("Pending decision atau payment harus diselesaikan terlebih dahulu.");
  }

  let nextState: GameState;
  switch (action.type) {
    case "ROLL_DICE": {
      requirePhase(state, "awaiting_roll");
      if (
        action.dice.some(
          (value) => !Number.isInteger(value) || value < 1 || value > 6,
        )
      ) {
        throw new Error("Nilai dadu harus antara 1 dan 6.");
      }
      const player = state.players[state.currentPlayerIndex];
      if (!player || player.status !== "active") {
        throw new Error("Pemain saat ini tidak dapat melempar dadu.");
      }
      const isDouble = action.dice[0] === action.dice[1];
      nextState = {
        ...state,
        dice: action.dice,
        pendingMovement: {
          playerId: player.id,
          cause: "dice",
          steps: action.dice[0] + action.dice[1],
        },
        phase: "moving",
        logs: [
          ...state.logs,
          createLog(
            state,
            isDouble
              ? `${player.name} mendapat dadu kembar. Takdir diselesaikan setelah efek petak.`
              : `${player.name} memperoleh dadu ${action.dice[0]} dan ${action.dice[1]}.`,
          ),
        ],
      };
      break;
    }
    case "RESOLVE_MOVEMENT": {
      requirePhase(state, "moving");
      if (state.pendingMovement?.steps === undefined) {
        throw new Error("Tidak ada pergerakan yang menunggu resolusi.");
      }
      nextState = applyMovement(state, {
        playerId: state.pendingMovement.playerId,
        cause: state.pendingMovement.cause,
        steps: state.pendingMovement.steps,
        source: action.id,
      });
      nextState = {
        ...nextState,
        pendingMovement: null,
        phase: "resolving_start",
      };
      break;
    }
    case "ADVANCE_RESOLUTION": {
      switch (state.phase) {
        case "resolving_start":
          nextState = { ...state, phase: "resolving_housing" };
          break;
        case "resolving_housing":
          nextState = { ...state, phase: "resolving_destination" };
          break;
        case "resolving_destination":
          nextState = {
            ...state,
            phase: state.dice?.[0] === state.dice?.[1]
              ? "resolving_doubles_destiny"
              : "awaiting_end_turn",
          };
          break;
        case "resolving_doubles_destiny":
          nextState = { ...state, phase: "awaiting_end_turn" };
          break;
        case "checking_game_over":
          nextState = finishTurnRotation(state);
          break;
        default:
          throw new Error(
            `Tidak ada resolusi otomatis untuk fase ${state.phase}.`,
          );
      }
      break;
    }
    case "END_TURN":
      requirePhase(state, "awaiting_end_turn");
      nextState = { ...state, phase: "checking_game_over" };
      break;
    case "END_PRISON_TURN":
      requirePhase(state, "awaiting_prison_turn");
      nextState = { ...state, phase: "checking_game_over" };
      break;
    case "TELEPORT_PLAYER":
      requirePhase(state, "resolving_destination");
      nextState = applyMovement(state, {
        playerId: action.playerId,
        cause: "toll_teleport",
        destination: action.destination,
        source: action.source,
      });
      break;
    default: {
      const exhaustive: never = action;
      throw new Error(`Aksi tidak didukung: ${String(exhaustive)}`);
    }
  }
  return finalizeAction(nextState, action.id);
}

function actionId(state: GameState, suffix: string): string {
  return `compat-${state.revision}-${suffix}`;
}

/** Compatibility wrapper untuk alur UI P0. */
export function applyRoll(
  state: GameState,
  dice: [number, number],
): GameState {
  let nextState = dispatchGameAction(state, {
    id: actionId(state, "roll"),
    type: "ROLL_DICE",
    dice,
  });
  nextState = dispatchGameAction(nextState, {
    id: actionId(nextState, "move"),
    type: "RESOLVE_MOVEMENT",
  });
  while (
    nextState.phase !== "awaiting_end_turn" &&
    nextState.phase !== "finished"
  ) {
    nextState = dispatchGameAction(nextState, {
      id: actionId(nextState, "advance"),
      type: "ADVANCE_RESOLUTION",
    });
  }
  return nextState;
}

/** Compatibility wrapper untuk alur UI P0. */
export function endTurn(state: GameState): GameState {
  let nextState = dispatchGameAction(state, {
    id: actionId(state, "end"),
    type: "END_TURN",
  });
  nextState = dispatchGameAction(nextState, {
    id: actionId(nextState, "check"),
    type: "ADVANCE_RESOLUTION",
  });
  return nextState;
}

/** Mengakhiri prison turn tanpa mengasumsikan aturan pembebasan. */
export function endPrisonTurn(state: GameState): GameState {
  let nextState = dispatchGameAction(state, {
    id: actionId(state, "end-prison"),
    type: "END_PRISON_TURN",
  });
  nextState = dispatchGameAction(nextState, {
    id: actionId(nextState, "check-prison"),
    type: "ADVANCE_RESOLUTION",
  });
  return nextState;
}

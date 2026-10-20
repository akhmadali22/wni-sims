import type {
  GameLogEntry,
  GameState,
  Player,
} from "../types/game";

import {
  DEFAULT_INITIAL_CASH,
  MAX_PLAYERS,
  MIN_PLAYERS,
} from "../config/game";
import { board } from "../data/board";

export const START_SALARY = 1_000_000;

const PLAYER_COLORS = [
  "#e74c3c",
  "#3498db",
  "#2ecc71",
  "#f1c40f",
  "#9b59b6",
];

function createLog(
  turn: number,
  message: string,
): GameLogEntry {
  return {
    id: crypto.randomUUID(),
    turn,
    message,
  };
}

export function rollDie(
  random: () => number = Math.random,
): number {
  return Math.floor(random() * 6) + 1;
}

export function rollDice(
  random: () => number = Math.random,
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

  const players: Player[] = playerNames.map(
    (name, index) => ({
      id: `player-${index + 1}`,
      name: name.trim(),
      color: PLAYER_COLORS[index],
      cash: startingCash,
      position: 0,
      status: "active",
      jailTurns: 0,
      propertyIds: [],
      inventory: [],
    }),
  );

  return {
    players,
    currentPlayerIndex: 0,
    turnNumber: 1,
    dice: null,
    logs: [
      createLog(
        1,
        `Permainan dimulai dengan ${players.length} pemain.`,
      ),
    ],
    phase: "awaiting_roll",
  };
}

export function movePlayer(
  state: GameState,
  playerId: string,
  steps: number,
): GameState {
  if (!Number.isInteger(steps) || steps < 0) {
    throw new Error("Jumlah langkah harus bilangan bulat nonnegatif.");
  }

  const playerIndex = state.players.findIndex(
    (player) => player.id === playerId,
  );

  if (playerIndex === -1) {
    throw new Error("Pemain tidak ditemukan.");
  }

  const player = state.players[playerIndex];

  if (player.status !== "active") {
    throw new Error("Pemain tidak dapat bergerak.");
  }

  const boardSize = board.length;
  const rawPosition = player.position + steps;
  const passedStart = rawPosition >= boardSize;

  const newPosition = rawPosition % boardSize;

  const updatedPlayer: Player = {
    ...player,
    position: newPosition,
    cash: player.cash + (
      passedStart ? START_SALARY : 0
    ),
  };

  const players = [...state.players];
  players[playerIndex] = updatedPlayer;

  const logs = [...state.logs];

  if (passedStart) {
    logs.push(
      createLog(
        state.turnNumber,
        `${player.name} melewati Start dan menerima gaji Rp${START_SALARY.toLocaleString("id-ID")}.`,
      ),
    );
  }

  logs.push(
    createLog(
      state.turnNumber,
      `${player.name} bergerak ${steps} langkah ke ${board[newPosition].name}.`,
    ),
  );

  return {
    ...state,
    players,
    logs,
  };
}

export function applyRoll(
  state: GameState,
  dice: [number, number],
): GameState {
  if (state.phase !== "awaiting_roll") {
    throw new Error("Dadu tidak dapat dilempar pada fase ini.");
  }

  if (
    dice.some(
      (value) =>
        !Number.isInteger(value) ||
        value < 1 ||
        value > 6,
    )
  ) {
    throw new Error("Nilai dadu harus antara 1 dan 6.");
  }

  const player = state.players[state.currentPlayerIndex];

  if (!player || player.status !== "active") {
    throw new Error("Pemain saat ini tidak aktif.");
  }

  const movedState = movePlayer(
    state,
    player.id,
    dice[0] + dice[1],
  );

  const isDouble = dice[0] === dice[1];

  return {
    ...movedState,
    dice,
    phase: "awaiting_end_turn",
    logs: [
      ...movedState.logs,
      createLog(
        state.turnNumber,
        isDouble
          ? `${player.name} mendapat dadu kembar. Ambil kartu Takdir setelah efek petak diselesaikan.`
          : `${player.name} memperoleh dadu ${dice[0]} dan ${dice[1]}.`,
      ),
    ],
  };
}

export function endTurn(
  state: GameState,
): GameState {
  if (state.phase !== "awaiting_end_turn") {
    throw new Error("Giliran belum dapat diakhiri.");
  }

  const nextPlayerIndex =
    (state.currentPlayerIndex + 1) % state.players.length;

  const completedRound = nextPlayerIndex === 0;

  const nextTurnNumber = completedRound
    ? state.turnNumber + 1
    : state.turnNumber;

  const nextPlayer = state.players[nextPlayerIndex];

  return {
    ...state,
    currentPlayerIndex: nextPlayerIndex,
    turnNumber: nextTurnNumber,
    dice: null,
    phase: "awaiting_roll",
    logs: [
      ...state.logs,
      createLog(
        nextTurnNumber,
        `Giliran berikutnya: ${nextPlayer.name}.`,
      ),
    ],
  };
}

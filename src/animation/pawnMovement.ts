import type { PlayerId } from "../types/game";

export const DEFAULT_HOP_DURATION_MS = 180;

const PAWN_SLOT_OFFSETS = [
  { x: 0, y: 0 },
  { x: -15, y: -11 },
  { x: 15, y: -11 },
  { x: -15, y: 11 },
  { x: 15, y: 11 },
] as const;

export interface PawnMovementAnimation {
  playerId: PlayerId;
  path: number[];
  currentTile: number;
  currentStep: number;
  totalSteps: number;
  isFinalHop: boolean;
  hopDurationMs: number;
}

export function buildMovementPath(
  start: number,
  steps: number,
  boardSize: number,
): number[] {
  if (!Number.isInteger(boardSize) || boardSize <= 0) {
    throw new Error("Ukuran papan harus bilangan bulat positif.");
  }
  if (!Number.isInteger(start) || start < 0 || start >= boardSize) {
    throw new Error("Posisi awal berada di luar papan.");
  }
  if (!Number.isInteger(steps) || steps < 0) {
    throw new Error("Jumlah langkah harus bilangan bulat nonnegatif.");
  }

  return Array.from(
    { length: steps + 1 },
    (_, step) => (start + step) % boardSize,
  );
}

export function createPawnMovementAnimation(
  playerId: PlayerId,
  path: number[],
  hopDurationMs = DEFAULT_HOP_DURATION_MS,
): PawnMovementAnimation {
  if (path.length === 0) {
    throw new Error("Path animasi tidak boleh kosong.");
  }
  if (!Number.isFinite(hopDurationMs) || hopDurationMs < 0) {
    throw new Error("Durasi hop tidak valid.");
  }

  return {
    playerId,
    path: [...path],
    currentTile: path[0],
    currentStep: 0,
    totalSteps: path.length - 1,
    isFinalHop: false,
    hopDurationMs,
  };
}

export function getPawnSlotOffset(playerIndex: number) {
  if (!Number.isInteger(playerIndex) || playerIndex < 0) {
    throw new Error("Indeks pemain tidak valid.");
  }

  return PAWN_SLOT_OFFSETS[playerIndex % PAWN_SLOT_OFFSETS.length];
}

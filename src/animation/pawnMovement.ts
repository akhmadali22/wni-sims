import type { PlayerId } from "../types/game";

export const DEFAULT_HOP_DURATION_MS = 150;

const PAWN_SLOT_OFFSETS = [
  { x: 0, y: 0 },
  { x: -15, y: -11 },
  { x: 15, y: -11 },
  { x: -15, y: 11 },
  { x: 15, y: 11 },
] as const;

/**
 * Formasi adaptif 1-5 pion di petak sisi (koordinat lokal petak).
 * Sumbu X: sepanjang lintasan petak (-trackWidth/2 s.d. +trackWidth/2).
 * Sumbu Y: tegak lurus lintasan ke arah dalam (+7 s.d. +25 adalah zona bebas label).
 */
const TILE_ADAPTIVE_FORMATIONS: Record<number, readonly { x: number; y: number }[]> = {
  1: [{ x: 0, y: 17 }],
  2: [
    { x: -8.5, y: 17 },
    { x: 8.5, y: 17 },
  ],
  3: [
    { x: 0, y: 10 },
    { x: -8.5, y: 22 },
    { x: 8.5, y: 22 },
  ],
  4: [
    { x: -8.5, y: 10 },
    { x: 8.5, y: 10 },
    { x: -8.5, y: 22 },
    { x: 8.5, y: 22 },
  ],
  5: [
    { x: -9, y: 9 },
    { x: 9, y: 9 },
    { x: 0, y: 16.5 },
    { x: -9, y: 24 },
    { x: 9, y: 24 },
  ],
};

/**
 * Formasi adaptif 1-5 pion di petak corner (relatif terhadap corner center).
 * Sumbu Tangen (X): tegak lurus vektor inward (-20 s.d. +20).
 * Sumbu Radial (Y): ke arah pusat pentagon (+10 s.d. +26).
 */
const CORNER_ADAPTIVE_FORMATIONS: Record<number, readonly { x: number; y: number }[]> = {
  1: [{ x: 0, y: 18 }],
  2: [
    { x: -9, y: 18 },
    { x: 9, y: 18 },
  ],
  3: [
    { x: 0, y: 10 },
    { x: -9, y: 21 },
    { x: 9, y: 21 },
  ],
  4: [
    { x: -9, y: 10 },
    { x: 9, y: 10 },
    { x: -9, y: 22 },
    { x: 9, y: 22 },
  ],
  5: [
    { x: -10, y: 9 },
    { x: 10, y: 9 },
    { x: 0, y: 17 },
    { x: -10, y: 25 },
    { x: 10, y: 25 },
  ],
};

export function getAdaptiveTilePawnOffset(indexInTile: number, totalInTile: number) {
  const safeTotal = Math.max(1, Math.min(5, Math.floor(totalInTile)));
  const formation = TILE_ADAPTIVE_FORMATIONS[safeTotal] ?? TILE_ADAPTIVE_FORMATIONS[1];
  const safeIndex = Math.max(0, Math.min(formation.length - 1, Math.floor(indexInTile)));
  return formation[safeIndex];
}

export function getAdaptiveCornerPawnOffset(indexInTile: number, totalInTile: number) {
  const safeTotal = Math.max(1, Math.min(5, Math.floor(totalInTile)));
  const formation = CORNER_ADAPTIVE_FORMATIONS[safeTotal] ?? CORNER_ADAPTIVE_FORMATIONS[1];
  const safeIndex = Math.max(0, Math.min(formation.length - 1, Math.floor(indexInTile)));
  return formation[safeIndex];
}

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

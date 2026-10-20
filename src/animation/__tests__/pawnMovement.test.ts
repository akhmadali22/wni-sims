import { describe, expect, it } from "vitest";

import { board } from "../../data/board";
import {
  buildMovementPath,
  createPawnMovementAnimation,
  getPawnSlotOffset,
  getAdaptiveTilePawnOffset,
  getAdaptiveCornerPawnOffset,
} from "../pawnMovement";

describe("pawn movement path", () => {
  it("mengikuti contoh tujuh hop dari petak 5 ke petak 12", () => {
    expect(buildMovementPath(5, 7, board.length)).toEqual([
      5, 6, 7, 8, 9, 10, 11, 12,
    ]);
  });

  it.each(Array.from({ length: 11 }, (_, index) => index + 2))(
    "menghasilkan tepat %i hop",
    (steps) => {
      const path = buildMovementPath(5, steps, board.length);

      expect(path).toHaveLength(steps + 1);
      expect(path[0]).toBe(5);
      expect(path.at(-1)).toBe((5 + steps) % board.length);
      expect(
        path.slice(1).every(
          (tile, index) =>
            tile === (path[index] + 1) % board.length,
        ),
      ).toBe(true);
    },
  );

  it("melintasi corner melalui indeks papan berurutan", () => {
    expect(buildMovementPath(8, 4, board.length)).toEqual([
      8, 9, 10, 11, 12,
    ]);
  });

  it("melakukan wrap-around melalui Start tanpa hardcode ukuran papan", () => {
    expect(buildMovementPath(board.length - 2, 4, board.length)).toEqual([
      board.length - 2,
      board.length - 1,
      0,
      1,
      2,
    ]);
  });

  it("membuat state visual tanpa mengubah path input", () => {
    const path = [5, 6, 7];
    const animation = createPawnMovementAnimation("player-1", path, 180);

    expect(animation).toEqual({
      playerId: "player-1",
      path,
      currentTile: 5,
      currentStep: 0,
      totalSteps: 2,
      isFinalHop: false,
      hopDurationMs: 180,
    });
    expect(animation.path).not.toBe(path);
  });

  it("memberi lima slot pion yang berbeda pada petak yang sama", () => {
    const offsets = Array.from(
      { length: 5 },
      (_, playerIndex) => getPawnSlotOffset(playerIndex),
    );

    expect(
      new Set(offsets.map(({ x, y }) => `${x},${y}`)).size,
    ).toBe(5);
  });

  it("menyediakan penempatan pion adaptif yang unik dan tidak bentrok untuk 1-5 pion pada petak sisi", () => {
    for (let total = 1; total <= 5; total++) {
      const offsets = Array.from({ length: total }, (_, idx) =>
        getAdaptiveTilePawnOffset(idx, total),
      );
      // Semua slot dalam formasi harus unik
      const uniqueKeys = new Set(offsets.map((p) => `${p.x},${p.y}`));
      expect(uniqueKeys.size).toBe(total);
      // Semua offset harus berada dalam batas aman petak (trackWidth ~40 => |x| <= 14, y antara 5 dan 28)
      for (const offset of offsets) {
        expect(Math.abs(offset.x)).toBeLessThanOrEqual(13);
        expect(offset.y).toBeGreaterThanOrEqual(7);
        expect(offset.y).toBeLessThanOrEqual(26);
      }
    }
  });

  it("menyediakan penempatan pion adaptif yang aman untuk 1-5 pion pada corner", () => {
    for (let total = 1; total <= 5; total++) {
      const offsets = Array.from({ length: total }, (_, idx) =>
        getAdaptiveCornerPawnOffset(idx, total),
      );
      const uniqueKeys = new Set(offsets.map((p) => `${p.x},${p.y}`));
      expect(uniqueKeys.size).toBe(total);
      for (const offset of offsets) {
        expect(Math.abs(offset.x)).toBeLessThanOrEqual(15);
        expect(offset.y).toBeGreaterThanOrEqual(7);
        expect(offset.y).toBeLessThanOrEqual(27);
      }
    }
  });
});

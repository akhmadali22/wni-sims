import { describe, expect, it } from "vitest";

import {
  board,
  CORNERS,
  ISLANDS,
  PROVISIONAL_BOARD_SIZE,
  PROVISIONAL_TILES_PER_SIDE,
} from "../board";

describe("provisional board topology", () => {
  it("mempertahankan 45 petak dengan ID dan index berurutan", () => {
    expect(PROVISIONAL_BOARD_SIZE).toBe(45);
    expect(board).toHaveLength(PROVISIONAL_BOARD_SIZE);
    expect(board.map((tile) => tile.index)).toEqual(
      Array.from({ length: board.length }, (_, index) => index),
    );
    expect(board.map((tile) => tile.id)).toEqual(
      Array.from(
        { length: board.length },
        (_, index) => `tile-${index}`,
      ),
    );
  });

  it("mempertahankan lima corner pada urutan traversal", () => {
    expect(board.filter((tile) => tile.isCorner)).toEqual(
      CORNERS.map((corner) =>
        expect.objectContaining({
          index: corner.index,
          name: corner.name,
          type: corner.type,
          isCorner: true,
        }),
      ),
    );
  });

  it("mempertahankan delapan petak provisional per pulau", () => {
    for (const island of ISLANDS) {
      const islandTiles = board.filter(
        (tile) => tile.island === island.name,
      );

      expect(islandTiles).toHaveLength(
        PROVISIONAL_TILES_PER_SIDE,
      );
      expect(
        islandTiles.map((tile) => tile.sidePosition),
      ).toEqual(
        Array.from(
          { length: PROVISIONAL_TILES_PER_SIDE },
          (_, index) => index,
        ),
      );
      expect(
        islandTiles.every(
          (tile) =>
            tile.side === island.side &&
            tile.type === "unknown" &&
            !tile.verified,
        ),
      ).toBe(true);
    }
  });
});

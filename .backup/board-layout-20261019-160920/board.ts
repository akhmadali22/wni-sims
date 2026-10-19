import type { BoardTile, TileType } from "../types/game";

export type IslandName =
  | "Kalimantan"
  | "Sulawesi"
  | "Papua"
  | "Jawa"
  | "Sumatra";

export interface IslandDefinition {
  name: IslandName;
  side: number;
  color: string;
  lightColor: string;
}

export const ISLANDS: IslandDefinition[] = [
  {
    name: "Kalimantan",
    side: 0,
    color: "#287a4b",
    lightColor: "#e1f2e6",
  },
  {
    name: "Sulawesi",
    side: 1,
    color: "#d97732",
    lightColor: "#fff0e3",
  },
  {
    name: "Papua",
    side: 2,
    color: "#3478b8",
    lightColor: "#e4f0fc",
  },
  {
    name: "Jawa",
    side: 3,
    color: "#cf4949",
    lightColor: "#fde8e8",
  },
  {
    name: "Sumatra",
    side: 4,
    color: "#c49a20",
    lightColor: "#fff5d1",
  },
];

/**
 * Prototipe menggunakan 40 petak:
 * 5 sisi x 8 petak.
 *
 * Jumlah dan urutan ini belum diverifikasi terhadap
 * papan fisik resmi WNI Simulator.
 */
export const PROVISIONAL_TILES_PER_SIDE = 8;
export const PROVISIONAL_BOARD_SIZE =
  ISLANDS.length * PROVISIONAL_TILES_PER_SIDE;

const knownTiles: Record<
  number,
  { name: string; type: TileType }
> = {
  0: {
    name: "Start",
    type: "start",
  },
};

export const board: BoardTile[] = Array.from(
  { length: PROVISIONAL_BOARD_SIZE },
  (_, index) => {
    const side = Math.floor(
      index / PROVISIONAL_TILES_PER_SIDE,
    );

    const island = ISLANDS[side];
    const known = knownTiles[index];

    return {
      id: `tile-${index}`,
      index,
      name: known?.name ?? `Petak ${index + 1}`,
      type: known?.type ?? "unknown",
      verified: Boolean(known),
      island: island.name,
      side,
      sidePosition: index % PROVISIONAL_TILES_PER_SIDE,
    };
  },
);

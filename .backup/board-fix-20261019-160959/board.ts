import type { BoardTile, TileType } from "../types/game";

export type IslandName =
  | "Sumatra"
  | "Kalimantan"
  | "Sulawesi"
  | "Papua"
  | "Jawa";

export interface IslandDefinition {
  name: IslandName;
  side: number;
  color: string;
  lightColor: string;
}

/**
 * Indeks sisi mengikuti urutan vertex SVG:
 * 0: atas -> kanan atas
 * 1: kanan atas -> kanan bawah
 * 2: kanan bawah -> kiri bawah
 * 3: kiri bawah -> kiri atas
 * 4: kiri atas -> atas
 *
 * Perjalanan permainan dimulai dari vertex 2 (kanan bawah)
 * dan mengikuti urutan clockwise.
 */
export const ISLANDS: IslandDefinition[] = [
  {
    name: "Sulawesi",
    side: 0,
    color: "#d97732",
    lightColor: "#fff0e3",
  },
  {
    name: "Papua",
    side: 1,
    color: "#3478b8",
    lightColor: "#e4f0fc",
  },
  {
    name: "Jawa",
    side: 2,
    color: "#cf4949",
    lightColor: "#fde8e8",
  },
  {
    name: "Sumatra",
    side: 3,
    color: "#c49a20",
    lightColor: "#fff5d1",
  },
  {
    name: "Kalimantan",
    side: 4,
    color: "#287a4b",
    lightColor: "#e1f2e6",
  },
];

export const PROVISIONAL_TILES_PER_SIDE = 8;
export const CORNER_COUNT = 5;
export const PROVISIONAL_BOARD_SIZE =
  CORNER_COUNT + ISLANDS.length * PROVISIONAL_TILES_PER_SIDE;

export interface CornerDefinition {
  name: string;
  type: TileType;
  vertex: number;
  index: number;
}

/**
 * Urutan corner dan sisi saat bergerak searah jarum jam:
 *
 * Start
 * -> Sumatra
 * -> Penjara
 * -> Kalimantan
 * -> Pajak Tahunan
 * -> Sulawesi
 * -> Pengadilan
 * -> Papua
 * -> Parkiran Pungli
 * -> Jawa
 * -> Start
 */
export const CORNERS: CornerDefinition[] = [
  { name: "Start", type: "start", vertex: 2, index: 0 },
  { name: "Penjara", type: "jail", vertex: 3, index: 9 },
  { name: "Pajak Tahunan", type: "tax", vertex: 4, index: 18 },
  { name: "Pengadilan", type: "court", vertex: 0, index: 27 },
  { name: "Parkiran Pungli", type: "pungli", vertex: 1, index: 36 },
];

interface SideSegment {
  island: IslandName;
  side: number;
  startIndex: number;
}

const SIDE_SEGMENTS: SideSegment[] = [
  { island: "Sumatra", side: 3, startIndex: 1 },
  { island: "Kalimantan", side: 4, startIndex: 10 },
  { island: "Sulawesi", side: 0, startIndex: 19 },
  { island: "Papua", side: 1, startIndex: 28 },
  { island: "Jawa", side: 2, startIndex: 37 },
];

const cornerByIndex = new Map(
  CORNERS.map((corner) => [corner.index, corner]),
);

const segmentByIndex = new Map<number, SideSegment>();

for (const segment of SIDE_SEGMENTS) {
  for (let position = 0; position < PROVISIONAL_TILES_PER_SIDE; position++) {
    segmentByIndex.set(segment.startIndex + position, segment);
  }
}

export const board: BoardTile[] = Array.from(
  { length: PROVISIONAL_BOARD_SIZE },
  (_, index) => {
    const corner = cornerByIndex.get(index);

    if (corner) {
      return {
        id: `tile-${index}`,
        index,
        name: corner.name,
        type: corner.type,
        verified: true,
        side: -1,
        sidePosition: -1,
        isCorner: true,
      };
    }

    const segment = segmentByIndex.get(index);

    if (!segment) {
      throw new Error(`Konfigurasi petak tidak ditemukan pada indeks ${index}`);
    }

    const sidePosition = (index - segment.startIndex) %
      PROVISIONAL_TILES_PER_SIDE;

    return {
      id: `tile-${index}`,
      index,
      name: `${segment.island} ${sidePosition + 1}`,
      type: "unknown",
      verified: false,
      island: segment.island,
      side: segment.side,
      sidePosition,
      isCorner: false,
    };
  },
);

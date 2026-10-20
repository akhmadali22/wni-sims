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
 * Urutan vertex SVG:
 * 0 = atas
 * 1 = kanan atas
 * 2 = kanan bawah
 * 3 = kiri bawah
 * 4 = kiri atas
 *
 * Perjalanan dimulai dari Start pada vertex 2:
 * Sumatra -> Penjara -> Kalimantan -> Pajak Tahunan
 * -> Sulawesi -> Pengadilan -> Papua -> Parkiran Pungli
 * -> Jawa -> kembali ke Start.
 */
export const ISLANDS: IslandDefinition[] = [
  {
    name: "Papua",
    side: 0,
    color: "#3478b8",
    lightColor: "#e4f0fc",
  },
  {
    name: "Jawa",
    side: 1,
    color: "#cf4949",
    lightColor: "#fde8e8",
  },
  {
    name: "Sumatra",
    side: 2,
    color: "#c49a20",
    lightColor: "#fff5d1",
  },
  {
    name: "Kalimantan",
    side: 3,
    color: "#287a4b",
    lightColor: "#e1f2e6",
  },
  {
    name: "Sulawesi",
    side: 4,
    color: "#d97732",
    lightColor: "#fff0e3",
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

interface ReferenceTile {
  name: string;
  type: TileType;
  landmark?: string;
  symbol?: string;
}

/**
 * Transkripsi visual dari foto papan fisik yang diberikan pengguna.
 * Urutan mengikuti traversal dari corner awal menuju corner akhir tiap sisi.
 * Nama, posisi, dan landmark tetap provisional sampai dicocokkan dengan
 * kartu properti/rulebook asli, sehingga seluruh entri tetap `verified: false`.
 */
const IMAGE_REFERENCE_LAYOUT: Record<
  IslandName,
  readonly ReferenceTile[]
> = {
  Sumatra: [
    { name: "Aceh", type: "property", landmark: "Masjid Raya Baiturrahman", symbol: "🕌" },
    { name: "Medan", type: "property", landmark: "Istana Maimun", symbol: "🏛" },
    { name: "Tol", type: "toll", symbol: "↔" },
    { name: "Lampung", type: "property", landmark: "Menara Siger", symbol: "♛" },
    { name: "Padang", type: "property", landmark: "Jam Gadang", symbol: "◷" },
    { name: "Takdir", type: "destiny", symbol: "✦" },
    { name: "Batam", type: "property", landmark: "Jembatan Barelang", symbol: "⌁" },
    { name: "Tilang", type: "ticket", symbol: "▣" },
  ],
  Kalimantan: [
    { name: "Banjarmasin", type: "property", landmark: "Masjid Sultan Suriansyah", symbol: "🕌" },
    { name: "Takdir", type: "destiny", symbol: "✦" },
    { name: "Pontianak", type: "property", landmark: "Tugu Khatulistiwa", symbol: "◎" },
    { name: "Musibah", type: "disaster", symbol: "!" },
    { name: "Tol", type: "toll", symbol: "↔" },
    { name: "Samarinda", type: "property", landmark: "Jembatan Mahakam", symbol: "⌁" },
    { name: "Balikpapan", type: "property", landmark: "Beruang Madu", symbol: "◆" },
    { name: "Palangkaraya", type: "property", landmark: "Tugu Soekarno", symbol: "▲" },
  ],
  Sulawesi: [
    { name: "Makassar", type: "property", landmark: "Kapal Pinisi", symbol: "⛵" },
    { name: "Musibah", type: "disaster", symbol: "!" },
    { name: "Tol", type: "toll", symbol: "↔" },
    { name: "Palu", type: "property", landmark: "Jembatan Palu IV", symbol: "⌁" },
    { name: "Kendari", type: "property", landmark: "Tugu Persatuan", symbol: "◇" },
    { name: "Takdir", type: "destiny", symbol: "✦" },
    { name: "Gorontalo", type: "property", landmark: "Menara Keagungan Limboto", symbol: "♜" },
    { name: "Manado", type: "property", landmark: "Monumen Yesus Memberkati", symbol: "†" },
  ],
  Papua: [
    { name: "Merauke", type: "property", landmark: "Monumen Kapsul Waktu", symbol: "⬡" },
    { name: "Timika", type: "property", landmark: "Kuala Kencana", symbol: "♧" },
    { name: "Takdir", type: "destiny", symbol: "✦" },
    { name: "Jayapura", type: "property", landmark: "Jembatan Youtefa", symbol: "⌁" },
    { name: "Manokwari", type: "property", landmark: "Tugu Injil", symbol: "†" },
    { name: "Sorong", type: "property", landmark: "Tugu Merah Putih", symbol: "⚑" },
    { name: "Tol", type: "toll", symbol: "↔" },
    { name: "Musibah", type: "disaster", symbol: "!" },
  ],
  Jawa: [
    { name: "Jakarta", type: "property", landmark: "Monumen Nasional", symbol: "♜" },
    { name: "Bandung", type: "property", landmark: "Gedung Sate", symbol: "♛" },
    { name: "Musibah", type: "disaster", symbol: "!" },
    { name: "Semarang", type: "property", landmark: "Lawang Sewu", symbol: "▥" },
    { name: "Takdir", type: "destiny", symbol: "✦" },
    { name: "Yogyakarta", type: "property", landmark: "Tugu Yogyakarta", symbol: "♜" },
    { name: "Musibah", type: "disaster", symbol: "!" },
    { name: "Surabaya", type: "property", landmark: "Patung Suro dan Boyo", symbol: "≈" },
  ],
};

const SIDE_SEGMENTS: SideSegment[] = [
  { island: "Sumatra", side: 2, startIndex: 1 },
  { island: "Kalimantan", side: 3, startIndex: 10 },
  { island: "Sulawesi", side: 4, startIndex: 19 },
  { island: "Papua", side: 0, startIndex: 28 },
  { island: "Jawa", side: 1, startIndex: 37 },
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

    const sidePosition = index - segment.startIndex;
    const referenceTile = IMAGE_REFERENCE_LAYOUT[segment.island][sidePosition];

    if (!referenceTile) {
      throw new Error(
        `Referensi petak tidak ditemukan untuk ${segment.island} posisi ${sidePosition}`,
      );
    }

    return {
      id: `tile-${index}`,
      index,
      ...referenceTile,
      verified: false,
      island: segment.island,
      side: segment.side,
      sidePosition,
      isCorner: false,
    };
  },
);

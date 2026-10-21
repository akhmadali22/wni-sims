<script setup lang="ts">
import { computed } from "vue";

import {
  board,
  CORNERS,
  ISLANDS,
  PROVISIONAL_TILES_PER_SIDE,
} from "../data/board";

import type { Player } from "../types/game";
import type { PawnMovementAnimation } from "../animation/pawnMovement";
import {
  getAdaptiveTilePawnOffset,
  getAdaptiveCornerPawnOffset,
} from "../animation/pawnMovement";

const props = defineProps<{
  players: Player[];
  movementAnimation: PawnMovementAnimation | null;
  activePlayerId?: string;
}>();

const WIDTH = 1100;
const HEIGHT = 1020;

const CENTER = { x: WIDTH / 2, y: 490 };

/*
 * Vertex pentagon:
 * 0 = atas (Pengadilan)
 * 1 = kanan atas (Parkiran Pungli)
 * 2 = kanan bawah (Start)
 * 3 = kiri bawah (Penjara)
 * 4 = kiri atas (Pajak Tahunan)
 */
const BOARD_CENTER = CENTER;
const OUTER_RADIUS = 465;
const OUTLINE_CORNER_RADIUS = 32;
const CORNER_INSET_RATIO = 0.105;
const TRACK_HALF_HEIGHT = 34;
const TILE_GAP = 4;

// Vertex pertama di atas, lalu searah jarum jam.
const vertices = Array.from({ length: 5 }, (_, index) => {
  const angle = ((-90 + index * 72) * Math.PI) / 180;

  return {
    x: BOARD_CENTER.x + OUTER_RADIUS * Math.cos(angle),
    y: BOARD_CENTER.y + OUTER_RADIUS * Math.sin(angle),
  };
});

function interpolate(
  start: { x: number; y: number },
  end: { x: number; y: number },
  ratio: number,
) {
  return {
    x: start.x + (end.x - start.x) * ratio,
    y: start.y + (end.y - start.y) * ratio,
  };
}

function moveTowards(
  from: { x: number; y: number },
  to: { x: number; y: number },
  distance: number,
) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;

  return {
    x: from.x + (dx / length) * distance,
    y: from.y + (dy / length) * distance,
  };
}

function getReadableRotation(angle: number) {
  if (angle > 90) {
    return angle - 180;
  }

  if (angle < -90) {
    return angle + 180;
  }

  return angle;
}

function splitTileName(name: string) {
  if (name.length <= 8) {
    return [name];
  }

  const words = name.split(" ");
  if (words.length > 1) {
    const midpoint = Math.ceil(words.length / 2);
    return [
      words.slice(0, midpoint).join(" "),
      words.slice(midpoint).join(" "),
    ];
  }

  const midpoint = Math.ceil(name.length / 2);
  return [name.slice(0, midpoint), name.slice(midpoint)];
}

function splitCornerName(name: string): string[] {
  if (name.includes(" ")) {
    return name.split(" ");
  }
  return [name];
}

const roundedCorners = vertices.map((vertex, index) => ({
  vertex,
  start: moveTowards(
    vertex,
    vertices[(index + vertices.length - 1) % vertices.length],
    OUTLINE_CORNER_RADIUS,
  ),
  end: moveTowards(
    vertex,
    vertices[(index + 1) % vertices.length],
    OUTLINE_CORNER_RADIUS,
  ),
}));

const roundedPolygonPath = [
  `M ${roundedCorners[0].start.x} ${roundedCorners[0].start.y}`,
  ...roundedCorners.flatMap((corner, index) => {
    const next = roundedCorners[(index + 1) % roundedCorners.length];

    return [
      `Q ${corner.vertex.x} ${corner.vertex.y} ${corner.end.x} ${corner.end.y}`,
      `L ${next.start.x} ${next.start.y}`,
    ];
  }),
  "Z",
].join(" ");

const edgeSegments = vertices.map((vertex, index) => {
  const next = vertices[(index + 1) % vertices.length];

  return {
    start: moveTowards(vertex, next, OUTLINE_CORNER_RADIUS),
    end: moveTowards(next, vertex, OUTLINE_CORNER_RADIUS),
  };
});

/*
 * Sudut ditempatkan konsisten di sepanjang radius pentagon.
 */
function getCornerPosition(corner: (typeof CORNERS)[number]) {
  const vertex = vertices[corner.vertex];

  if (!vertex) {
    console.error(
      `Vertex tidak ditemukan untuk petak sudut ${corner.index}`,
    );
    return { ...CENTER };
  }

  return interpolate(vertex, CENTER, CORNER_INSET_RATIO);
}

/*
 * Geometri petak sudut (corner tile):
 * Sisi luar corner mengikuti PERSIS batas rounded polygon outline (roundedCorners)
 * sehingga tidak ada celah antara petak sudut dan garis tepi pentagon.
 * Sisi dalam tetap menggunakan bezier dengan innerApex.
 */
function getCornerPath(corner: (typeof CORNERS)[number]): string {
  const current = getCornerPosition(corner);
  const vertex = vertices[corner.vertex];
  // roundedCorners sudah dihitung di scope luar — digunakan agar outer edge corner
  // TEPAT mengikuti batas arc rounded polygon, sehingga tidak ada celah.
  const rc = roundedCorners[corner.vertex];

  const prevCorner = CORNERS.find(
    (item) => item.vertex === (corner.vertex + 4) % 5,
  );
  const nextCorner = CORNERS.find(
    (item) => item.vertex === (corner.vertex + 1) % 5,
  );

  if (!prevCorner || !nextCorner || !vertex || !rc) {
    console.error(`Sudut tetangga tidak ditemukan: ${corner.index}`);
    return "";
  }

  const previous = getCornerPosition(prevCorner);
  const next = getCornerPosition(nextCorner);

  const normalize = (x: number, y: number) => {
    const len = Math.hypot(x, y) || 1;
    return { x: x / len, y: y / len };
  };

  const incoming = normalize(current.x - previous.x, current.y - previous.y);
  const outgoing = normalize(next.x - current.x, next.y - current.y);

  // Normal ke arah luar pentagon
  const outerIn = { x: incoming.y, y: -incoming.x };
  const outerOut = { x: outgoing.y, y: -outgoing.x };

  const intervalCount = PROVISIONAL_TILES_PER_SIDE + 1;
  const inDist = Math.hypot(current.x - previous.x, current.y - previous.y);
  const outDist = Math.hypot(next.x - current.x, next.y - current.y);

  const halfIn = (inDist / intervalCount - TILE_GAP) / 2;
  const halfOut = (outDist / intervalCount - TILE_GAP) / 2;

  const halfWidth = TRACK_HALF_HEIGHT;

  // Ujung sisi incoming (tegak lurus terhadap incoming)
  const midIn = {
    x: current.x - incoming.x * halfIn,
    y: current.y - incoming.y * halfIn,
  };
  const inInner = {
    x: midIn.x - outerIn.x * halfWidth,
    y: midIn.y - outerIn.y * halfWidth,
  };

  // Ujung sisi outgoing (tegak lurus terhadap outgoing)
  const midOut = {
    x: current.x + outgoing.x * halfOut,
    y: current.y + outgoing.y * halfOut,
  };
  const outInner = {
    x: midOut.x - outerOut.x * halfWidth,
    y: midOut.y - outerOut.y * halfWidth,
  };

  // Vektor radial ke arah luar (dari CENTER menuju vertex)
  const radOut = normalize(vertex.x - CENTER.x, vertex.y - CENTER.y);

  // Lengkungan dalam corner
  const innerApexRadius = 380.5;
  const innerApex = {
    x: CENTER.x + radOut.x * innerApexRadius,
    y: CENTER.y + radOut.y * innerApexRadius,
  };

  // Titik outer corner tile di sisi incoming dan outgoing
  const inOuter = {
    x: midIn.x + outerIn.x * halfWidth,
    y: midIn.y + outerIn.y * halfWidth,
  };
  const outOuter = {
    x: midOut.x + outerOut.x * halfWidth,
    y: midOut.y + outerOut.y * halfWidth,
  };

  // Koordinat relatif terhadap pusat corner
  const fmt = (p: { x: number; y: number }) =>
    `${(p.x - current.x).toFixed(2)} ${(p.y - current.y).toFixed(2)}`;

  // Outer edge corner tile mengikuti PERSIS batas arc rounded polygon:
  //   inOuter → rc.start : sisi incoming menuju polygon boundary
  //   Q vertex, rc.end   : arc rounded corner polygon (control = vertex)
  //   rc.end → outOuter  : polygon boundary menuju sisi outgoing
  // Dengan demikian tidak ada celah antara corner tile dan outline pentagon.
  return [
    `M ${fmt(inOuter)}`,
    `L ${fmt(rc.start)}`,
    `Q ${fmt(vertex)}, ${fmt(rc.end)}`,
    `L ${fmt(outOuter)}`,
    `L ${fmt(outInner)}`,
    `Q ${fmt(innerApex)}, ${fmt(inInner)}`,
    "Z",
  ].join(" ");
}

/*
 * Posisi petak pada sisi dan corner.
 */
function getTilePosition(
  side: number,
  sidePosition: number,
  tileIndex: number,
  isCorner: boolean,
) {
  const corner = CORNERS.find((item) => item.index === tileIndex);

  if (isCorner || corner) {
    if (!corner) {
      console.error(`Definisi sudut tidak valid untuk petak ${tileIndex}`);
      return { ...CENTER, rotation: 0, trackWidth: 58 };
    }

    return {
      ...getCornerPosition(corner),
      rotation: 0,
      trackWidth: 58,
    };
  }

  if (!Number.isInteger(side) || side < 0 || side >= vertices.length) {
    console.error(`Indeks sisi tidak valid untuk petak ${tileIndex}: ${side}`);
    return { ...CENTER, rotation: 0, trackWidth: 40 };
  }

  const startCorner = CORNERS.find((item) => item.vertex === side);
  const endCorner = CORNERS.find(
    (item) => item.vertex === (side + 1) % vertices.length,
  );

  if (!startCorner || !endCorner) {
    console.error(`Sudut pembatas tidak ditemukan untuk sisi ${side}`);
    return { ...CENTER, rotation: 0, trackWidth: 40 };
  }

  const startPoint = getCornerPosition(startCorner);
  const endPoint = getCornerPosition(endCorner);

  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const segmentLength = Math.hypot(dx, dy);

  const intervalCount = PROVISIONAL_TILES_PER_SIDE + 1;
  const safeSidePosition = Math.max(
    0,
    Math.min(sidePosition, PROVISIONAL_TILES_PER_SIDE - 1),
  );

  const ratio = (safeSidePosition + 1) / intervalCount;
  const position = interpolate(startPoint, endPoint, ratio);
  const rotation = getReadableRotation((Math.atan2(dy, dx) * 180) / Math.PI);
  const trackWidth = segmentLength / intervalCount - TILE_GAP;

  return {
    ...position,
    rotation,
    trackWidth,
  };
}

function getIslandLabel(side: number) {
  const start = vertices[side];
  const end = vertices[(side + 1) % vertices.length];

  if (!start || !end) {
    return { ...CENTER, rotation: 0 };
  }

  const midpoint = interpolate(start, end, 0.5);
  const dx = midpoint.x - CENTER.x;
  const dy = midpoint.y - CENTER.y;
  const length = Math.hypot(dx, dy) || 1;
  const offset = 58;
  const rotation = getReadableRotation(
    (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI,
  );

  return {
    x: midpoint.x + (dx / length) * offset,
    y: midpoint.y + (dy / length) * offset,
    rotation,
  };
}

const CORNER_COLORS: Record<string, { color: string; lightColor: string }> = {
  start: {
    color: "#237a4b",
    lightColor: "#e1f2e6",
  },
  jail: {
    color: "#596579",
    lightColor: "#e9edf3",
  },
  tax: {
    color: "#b7791f",
    lightColor: "#fff2d6",
  },
  court: {
    color: "#7452a3",
    lightColor: "#f0e8fa",
  },
  pungli: {
    color: "#b83f48",
    lightColor: "#fde8e8",
  },
};

const SPECIAL_TILE_COLORS: Record<string, { color: string; lightColor: string }> = {
  destiny: { color: "#087f8c", lightColor: "#d9f2f3" },
  disaster: { color: "#d45d1f", lightColor: "#fff0df" },
  toll: { color: "#427aa1", lightColor: "#e1eff8" },
  ticket: { color: "#c43d55", lightColor: "#fde5ea" },
};

function getVisualPosition(player: Player) {
  return props.movementAnimation?.playerId === player.id
    ? props.movementAnimation.currentTile
    : player.position;
}

const positionedTiles = computed(() =>
  board.map((tile) => {
    const corner = CORNERS.find((item) => item.index === tile.index);
    const isCorner = Boolean(tile.isCorner || corner);

    const position = getTilePosition(
      tile.side,
      tile.sidePosition,
      tile.index,
      isCorner,
    );

    const island = ISLANDS.find((item) => item.side === tile.side);

    const fallbackPalette = {
      color: "#596579",
      lightColor: "#e9edf3",
    };

    const palette = isCorner
      ? CORNER_COLORS[tile.type] ?? fallbackPalette
      : tile.type === "property"
        ? {
            color: island?.color ?? fallbackPalette.color,
            lightColor: island?.lightColor ?? fallbackPalette.lightColor,
          }
        : SPECIAL_TILE_COLORS[tile.type] ?? fallbackPalette;

    let cornerIconPos = { x: 0, y: -10 };
    let cornerTextPos = { x: 0, y: 7.5 };

    if (isCorner && corner) {
      const vertex = vertices[corner.vertex] ?? CENTER;
      const radLen = Math.hypot(vertex.x - CENTER.x, vertex.y - CENTER.y) || 1;
      const radX = (vertex.x - CENTER.x) / radLen;
      const radY = (vertex.y - CENTER.y) / radLen;

      cornerIconPos = {
        x: +(radX * 12).toFixed(2),
        y: +(radY * 12).toFixed(2),
      };
      cornerTextPos = {
        x: +(-radX * 1).toFixed(2),
        y: +(-radY * 1).toFixed(2),
      };
    }

    return {
      ...tile,
      ...position,
      ...palette,
      nameLines: splitTileName(tile.name),
      cornerTextLines: splitCornerName(tile.name),
      isCorner,
      cornerPath: isCorner && corner ? getCornerPath(corner) : "",
      cornerIconPos,
      cornerTextPos,
      players: props.players.filter(
        (player) => getVisualPosition(player) === tile.index,
      ),
    };
  }),
);

/*
 * Menghitung koordinat pion dengan formasi adaptif di dalam petak.
 * Petak sisi: ditransformasikan sesuai tile.rotation (lokal petak).
 * Petak corner: ditransformasikan sepanjang sumbu radial/tangen sudut.
 */
const positionedPawns = computed(() => {
  const playersByTile = new Map<number, Player[]>();
  for (const player of props.players) {
    const tilePos = getVisualPosition(player);
    const list = playersByTile.get(tilePos) ?? [];
    list.push(player);
    playersByTile.set(tilePos, list);
  }

  return props.players.map((player) => {
    const visualPosition = getVisualPosition(player);
    const tile = positionedTiles.value.find(
      (candidate) => candidate.index === visualPosition,
    );
    const tilePlayers = playersByTile.get(visualPosition) ?? [player];
    const indexInTile = tilePlayers.findIndex((p) => p.id === player.id);
    const totalInTile = tilePlayers.length;

    let x = tile?.x ?? CENTER.x;
    let y = tile?.y ?? CENTER.y;

    if (tile) {
      if (tile.isCorner) {
        const corner = CORNERS.find((c) => c.index === tile.index);
        const vertexIndex = corner ? corner.vertex : 0;
        const vertex = vertices[vertexIndex] ?? CENTER;

        // Vektor outward dari CENTER ke vertex
        const radLen = Math.hypot(vertex.x - CENTER.x, vertex.y - CENTER.y) || 1;
        const outX = (vertex.x - CENTER.x) / radLen;
        const outY = (vertex.y - CENTER.y) / radLen;
        // Vektor inward (ke dalam pentagon)
        const inX = -outX;
        const inY = -outY;
        // Vektor tangensial tegak lurus inward
        const tanX = -inY;
        const tanY = inX;

        const offset = getAdaptiveCornerPawnOffset(indexInTile, totalInTile);
        x = tile.x + offset.x * tanX + offset.y * inX;
        y = tile.y + offset.x * tanY + offset.y * inY;
      } else {
        const rad = (tile.rotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const offset = getAdaptiveTilePawnOffset(indexInTile, totalInTile);
        x = tile.x + offset.x * cos - offset.y * sin;
        y = tile.y + offset.x * sin + offset.y * cos;
      }
    }

    const isMoving = props.movementAnimation?.playerId === player.id;
    const isActive = props.activePlayerId === player.id;

    return {
      ...player,
      visualPosition,
      x,
      y,
      isMoving,
      isActive,
      currentStep: isMoving ? props.movementAnimation?.currentStep ?? 0 : 0,
      isFinalHop: isMoving ? props.movementAnimation?.isFinalHop ?? false : false,
      hopDurationMs: isMoving ? props.movementAnimation?.hopDurationMs ?? 0 : 0,
    };
  });
});

/*
 * Jalur penghubung mengikuti urutan indeks papan.
 */
const tilePathPoints = computed(() => {
  const points = positionedTiles.value.map((tile) => `${tile.x},${tile.y}`);
  if (points.length > 0) points.push(points[0]);
  return points.join(" ");
});
</script>

<template>
  <section class="board-wrapper">
    <header class="board-heading">
      <div>
        <h2>Papan WNI Simulator</h2>
        <p class="notice">
          Lima pulau Nusantara dalam satu putaran pentagonal.
        </p>
      </div>

      <span class="tile-count">
        {{ board.length }} petak
      </span>
    </header>

    <div class="pentagon-board">
      <svg
        class="pentagon-svg"
        :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
        role="img"
        aria-label="Papan pentagon dengan lima pulau Indonesia"
      >
        <defs>
          <linearGradient
            id="board-background"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop offset="0%" stop-color="#f8fbf9" />
            <stop offset="100%" stop-color="#e3eee7" />
          </linearGradient>
        </defs>

        <!-- Dasar papan pentagon -->
        <path
          :d="roundedPolygonPath"
          fill="url(#board-background)"
          stroke="#354c3e"
          stroke-width="14"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <!-- Jalur penghubung semua petak -->
        <polyline
          :points="tilePathPoints"
          fill="none"
          stroke="#354c3e"
          stroke-width="4"
          stroke-linecap="round"
          stroke-linejoin="round"
          opacity="0.25"
          pointer-events="none"
        />

        <!-- Batas aksen setiap sisi pulau -->
        <g>
          <line
            v-for="(edge, index) in edgeSegments"
            :key="`edge-${index}`"
            :x1="edge.start.x"
            :y1="edge.start.y"
            :x2="edge.end.x"
            :y2="edge.end.y"
            :stroke="ISLANDS[index].color"
            stroke-width="9"
            stroke-linecap="round"
          />
        </g>

        <!-- Area tengah pentagon -->
        <g
          class="board-center"
          :transform="`translate(${CENTER.x} ${CENTER.y})`"
        >
          <rect
            x="-200" y="-120" width="400" height="240" rx="26"
            fill="#ffffff"
            stroke="#cbded1"
            stroke-width="3.5"
          />

          <text
            x="0"
            y="-68"
            text-anchor="middle"
            class="center-eyebrow"
          >
            SIMULASI KEHIDUPAN
          </text>

          <text
            x="0"
            y="-14"
            text-anchor="middle"
            class="center-title"
          >
            WNI SIMULATOR
          </text>

          <line
            x1="-120"
            y1="10"
            x2="120"
            y2="10"
            stroke="#d7e5dc"
            stroke-width="2.5"
          />

          <text
            x="0"
            y="46"
            text-anchor="middle"
            class="center-subtitle"
          >
            Lima pulau, satu papan permainan
          </text>

          <text
            x="0"
            y="76"
            text-anchor="middle"
            class="center-subtitle"
          >
            Bertahan hidup, bangun strategi ekonomi
          </text>
        </g>

        <!-- Label pulau pada masing-masing sisi -->
        <g
          v-for="island in ISLANDS"
          :key="island.name"
          class="island-label"
        >
          <text
            :x="getIslandLabel(island.side).x"
            :y="getIslandLabel(island.side).y"
            :transform="`rotate(${getIslandLabel(island.side).rotation} ${getIslandLabel(island.side).x} ${getIslandLabel(island.side).y})`"
            text-anchor="middle"
            dominant-baseline="middle"
            :fill="island.color"
          >
            {{ island.name.toUpperCase() }}
          </text>
        </g>

        <!-- Petak permainan -->
        <g
          v-for="tile in positionedTiles"
          :key="tile.id"
          :transform="`translate(${tile.x} ${tile.y}) rotate(${tile.rotation})`"
          class="tile-group"
          :data-tile-index="tile.index"
          :data-tile-type="tile.type"
        >
          <!-- Bentuk petak corner -->
          <path
            v-if="tile.isCorner"
            :d="tile.cornerPath"
            :fill="tile.type === 'start' ? tile.color : tile.lightColor"
            :stroke="tile.color"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <!-- Bentuk petak sisi -->
          <rect
            v-else
            :x="-tile.trackWidth / 2"
            :y="-TRACK_HALF_HEIGHT"
            :width="tile.trackWidth"
            :height="TRACK_HALF_HEIGHT * 2"
            rx="9"
            :fill="tile.lightColor"
            :stroke="tile.color"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <!-- Konten khusus Petak Corner -->
          <g v-if="tile.isCorner" class="corner-content">
            <!-- Ikon Tematik Corner -->
            <g :transform="`translate(${tile.cornerIconPos.x}, ${tile.cornerIconPos.y})`">
              <!-- START (index 0) -->
              <g v-if="tile.type === 'start'">
                <line x1="-8" y1="-12" x2="-8" y2="12" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
                <path d="M-8,-12 L6,-7 L-8,-2 Z" fill="#ffffff" />
                <path d="M-8,-12 L-1,-9.5 L-1,-4.5 L-8,-7 Z" fill="#f6c851" />
                <circle cx="-8" cy="-12" r="1.8" fill="#f6c851" />
              </g>

              <!-- PENJARA (index 9) -->
              <g v-else-if="tile.type === 'jail'">
                <rect x="-12" y="-12" width="24" height="23" rx="4" fill="#ffffff" stroke="#596579" stroke-width="2" />
                <line x1="-6" y1="-11" x2="-6" y2="10" stroke="#596579" stroke-width="2" stroke-linecap="round" />
                <line x1="0" y1="-11" x2="0" y2="10" stroke="#596579" stroke-width="2" stroke-linecap="round" />
                <line x1="6" y1="-11" x2="6" y2="10" stroke="#596579" stroke-width="2" stroke-linecap="round" />
                <line x1="-11" y1="-1" x2="11" y2="-1" stroke="#596579" stroke-width="2" />
              </g>

              <!-- PAJAK TAHUNAN (index 18) -->
              <g v-else-if="tile.type === 'tax'">
                <path d="M-10,-12 L4,-12 L10,-6 L10,12 L-10,12 Z" fill="#ffffff" stroke="#b7791f" stroke-width="2" stroke-linejoin="round" />
                <path d="M4,-12 L4,-6 L10,-6" fill="#fce4b3" stroke="#b7791f" stroke-width="1.8" stroke-linejoin="round" />
                <line x1="-6" y1="-4" x2="1" y2="-4" stroke="#b7791f" stroke-width="1.8" stroke-linecap="round" />
                <line x1="-6" y1="1" x2="6" y2="1" stroke="#b7791f" stroke-width="1.8" stroke-linecap="round" />
                <line x1="-6" y1="6" x2="3" y2="6" stroke="#b7791f" stroke-width="1.8" stroke-linecap="round" />
              </g>

              <!-- PENGADILAN (index 27) -->
              <g v-else-if="tile.type === 'court'">
                <rect x="-12" y="9" width="24" height="3" rx="1.5" fill="#7452a3" />
                <line x1="4" y1="7" x2="-5" y2="-4" stroke="#7452a3" stroke-width="2.6" stroke-linecap="round" />
                <rect x="-13" y="-12" width="12" height="7" rx="2" transform="rotate(-40 -7 -9)" fill="#7452a3" stroke="#ffffff" stroke-width="1.2" />
              </g>

              <!-- PARKIRAN PUNGLI (index 36) -->
              <g v-else-if="tile.type === 'pungli'">
                <rect x="-12" y="-12" width="24" height="23" rx="5" fill="#b83f48" stroke="#ffffff" stroke-width="1.4" />
                <path d="M-4,7 L-4,-6 L2,-6 C5,-6 7,-4.2 7,-1.5 C7,1.2 5,3 2,3 L-1.5,3 L-1.5,7 Z M-1.5,0.8 L1.6,0.8 C3,0.8 4.2,0.1 4.2,-1.5 C4.2,-3.1 3,-3.8 1.6,-3.8 L-1.5,-3.8 Z" fill="#ffffff" />
              </g>
            </g>

            <!-- Nama Corner -->
            <text
              :x="tile.cornerTextPos.x"
              :y="tile.cornerTextLines.length > 1 ? tile.cornerTextPos.y - 3.5 : tile.cornerTextPos.y"
              text-anchor="middle"
              class="corner-name"
              :fill="tile.type === 'start' ? '#ffffff' : tile.color"
            >
              <tspan
                v-for="(line, lineIdx) in tile.cornerTextLines"
                :key="lineIdx"
                :x="tile.cornerTextPos.x"
                :dy="lineIdx === 0 ? 0 : 8"
              >
                {{ line.toUpperCase() }}
              </tspan>
            </text>
          </g>

          <!-- Konten Petak Sisi Normal -->
          <g v-else>
            <text
              x="0"
              y="-19"
              text-anchor="middle"
              class="tile-symbol"
              :fill="tile.color"
            >
              {{ tile.symbol || tile.index + 1 }}
            </text>

            <text
              x="0"
              :y="tile.nameLines.length > 1 ? -3 : 2"
              text-anchor="middle"
              class="tile-name"
              :class="{
                'tile-name--compact': tile.nameLines.some(
                  (line) => line.length > 7,
                ),
              }"
              fill="#26352c"
            >
              <tspan
                v-for="(line, lineIndex) in tile.nameLines"
                :key="`${tile.id}-line-${lineIndex}`"
                x="0"
                :dy="lineIndex === 0 ? 0 : 10.5"
              >
                {{ line }}
              </tspan>
            </text>
          </g>

          <title>
            {{ tile.name }}{{ tile.landmark ? ` — ${tile.landmark}` : '' }}
            | {{ tile.isCorner ? 'Sudut Khusus' : `Pulau ${tile.island}` }}
            | {{
              tile.players.map((player) => player.name).join(", ")
              || "Tidak ada pemain"
            }}
          </title>
        </g>

        <!-- Layer pion pemain -->
        <g class="pawn-layer" aria-label="Posisi pion pemain">
          <g
            v-for="pawn in positionedPawns"
            :key="pawn.id"
            class="pawn-position"
            :class="{
              'pawn-position--moving': pawn.isMoving,
              'pawn-position--active': pawn.isActive,
            }"
            :data-player-id="pawn.id"
            :data-tile-index="pawn.visualPosition"
            :data-movement-step="pawn.currentStep"
            :style="{
              transform: `translate(${pawn.x}px, ${pawn.y}px)`,
              transitionDuration: `${pawn.hopDurationMs}ms`,
            }"
          >
            <g
              :key="`${pawn.id}-${pawn.currentStep}`"
              class="pawn-marker"
              :class="{
                'pawn-marker--hopping': pawn.isMoving && pawn.currentStep > 0,
                'pawn-marker--final': pawn.isFinalHop,
                'pawn-marker--active': pawn.isActive,
              }"
              :style="{
                animationDuration: `${pawn.hopDurationMs}ms`,
              }"
            >
              <circle
                r="9.5"
                :fill="pawn.color"
                stroke="#ffffff"
                stroke-width="2.5"
              />
              <circle
                v-if="pawn.isActive"
                r="12.5"
                fill="none"
                :stroke="pawn.color"
                stroke-width="1.5"
                stroke-dasharray="2 2"
                opacity="0.8"
              />
              <text
                y="3"
                text-anchor="middle"
                class="pawn-initial"
              >
                {{ pawn.name.slice(0, 1).toUpperCase() }}
              </text>
              <title>{{ pawn.name }} (Petak {{ pawn.visualPosition + 1 }})</title>
            </g>
          </g>
        </g>
      </svg>
    </div>

    <!-- Legenda warna pulau -->
    <div class="island-legend">
      <div
        v-for="island in ISLANDS"
        :key="island.name"
        class="legend-item"
      >
        <span
          class="legend-color"
          :style="{ backgroundColor: island.color }"
        />
        <span>{{ island.name }}</span>
      </div>
    </div>

    <!-- Legenda pion pemain -->
    <div class="player-legend">
      <div
        v-for="player in players"
        :key="player.id"
        class="legend-item"
      >
        <span
          class="legend-color player-color"
          :style="{ backgroundColor: player.color }"
        />
        <span>{{ player.name }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.board-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  padding: 8px 12px 6px;
}

.board-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
  flex: 0 0 auto;
}

.board-heading h2 {
  margin-bottom: 2px;
  font-size: 15px;
}

.notice {
  margin-bottom: 0;
  color: #8a5a13;
  font-size: 11px;
  line-height: 1.3;
}

.tile-count {
  flex-shrink: 0;
  padding: 3px 8px;
  border-radius: 16px;
  background: #e9f5ef;
  color: #176b50;
  font-size: 10px;
  font-weight: 700;
}

.pentagon-board {
  flex: 1 1 0;
  min-height: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid #d7e5dc;
  border-radius: 16px;
  background:
    radial-gradient(circle at 50% 42%, #ffffff 0, #f5faf6 42%, #e5f0e9 100%);
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 72%);
}

.pentagon-svg {
  display: block;
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  aspect-ratio: 1100 / 1020;
  object-fit: contain;
}

.island-label {
  pointer-events: none;
}

.island-label text {
  font-size: 21px;
  font-weight: 900;
  letter-spacing: 1.5px;
  paint-order: stroke;
  stroke: #f6faf7;
  stroke-width: 5px;
  stroke-linejoin: round;
}

.tile-symbol {
  font-family: "Segoe UI Symbol", "Segoe UI Emoji", sans-serif;
  font-size: 13.5px;
  font-weight: 800;
}

.tile-name {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: -0.15px;
}

.tile-name--compact {
  font-size: 8.5px;
}

.corner-name {
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.05em;
}

.pawn-layer {
  pointer-events: none;
}

.pawn-position {
  transform-box: view-box;
  transform-origin: 0 0;
  transition-property: transform;
  transition-timing-function: cubic-bezier(0.25, 0.85, 0.35, 1);
  will-change: transform;
}

.pawn-marker {
  filter: drop-shadow(0 2.5px 2px rgb(28 55 40 / 22%));
  transform-origin: center;
}

.pawn-marker--hopping {
  animation-name: pawn-hop;
  animation-timing-function: cubic-bezier(0.22, 0.8, 0.3, 1);
}

.pawn-marker--final {
  animation-name: pawn-final-hop;
}

.pawn-initial {
  fill: #ffffff;
  font-size: 8.5px;
  font-weight: 900;
}

/* Animasi hop halus dan terkontrol (5-8 SVG units) */
@keyframes pawn-hop {
  0% {
    transform: translateY(0) scale(1);
  }
  45% {
    transform: translateY(-6px) scale(1.03);
  }
  78% {
    transform: translateY(0.4px) scale(1.01, 0.98);
  }
  100% {
    transform: translateY(0) scale(1);
  }
}

@keyframes pawn-final-hop {
  0% {
    transform: translateY(0) scale(1);
  }
  45% {
    transform: translateY(-8px) scale(1.05);
  }
  75% {
    transform: translateY(0.6px) scale(1.02, 0.97);
  }
  100% {
    transform: translateY(0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pawn-position {
    transition-duration: 0ms !important;
  }

  .pawn-marker--hopping,
  .pawn-marker--final {
    animation: none;
  }
}

.center-eyebrow {
  fill: #6d8274;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 2.5px;
}

.center-title {
  fill: #176b50;
  font-size: 32px;
  font-weight: 900;
  letter-spacing: 1px;
}

.center-subtitle {
  fill: #68786d;
  font-size: 11.5px;
}

.island-legend,
.player-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 14px;
  margin-top: 6px;
  flex: 0 0 auto;
}

.player-legend {
  padding-top: 5px;
  border-top: 1px solid #e5e9e6;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10.5px;
}

.legend-color {
  width: 10px;
  height: 10px;
  flex: 0 0 auto;
  border-radius: 2.5px;
}

.player-color {
  border: 1.5px solid white;
  border-radius: 50%;
  box-shadow: 0 0 0 1px #ccd4ce;
}

@media (max-width: 1024px), (max-height: 640px) {
  .board-wrapper {
    height: auto;
    min-height: 0;
  }

  .pentagon-board {
    height: auto;
    min-height: 0;
    flex: none;
    aspect-ratio: 1100 / 1020;
  }

  .pentagon-svg {
    width: 100%;
    height: auto;
    max-height: none;
  }
}

@media (max-width: 600px) {
  .board-heading {
    flex-direction: column;
    align-items: flex-start;
  }

  .island-label text {
    font-size: 14px;
    letter-spacing: 0.8px;
  }

  .center-title {
    font-size: 24px;
  }

  .island-legend,
  .player-legend {
    gap: 6px 10px;
  }
}
</style>

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
import { getPawnSlotOffset } from "../animation/pawnMovement";

const props = defineProps<{
  players: Player[];
  movementAnimation: PawnMovementAnimation | null;
}>();

const WIDTH = 1200;
const HEIGHT = 1080;

const CENTER = { x: WIDTH / 2, y: 520 };

/*
 * Vertex pentagon:
 * 0 = atas
 * 1 = kanan atas
 * 2 = kanan bawah
 * 3 = kiri bawah
 * 4 = kiri atas
 */
// Pentagon: lima vertex dengan orientasi konsisten.
const BOARD_CENTER = CENTER;
const OUTER_RADIUS = 430;
const OUTLINE_CORNER_RADIUS = 32;
const CORNER_INSET_RATIO = 0.105;
const TRACK_HALF_HEIGHT = 30;
const TILE_GAP = 4;

// Vertex pertama di atas, lalu searah jarum jam.
const vertices = Array.from({ length: 5 }, (_, index) => {
  const angle = (-90 + index * 72) * Math.PI / 180;

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
 * Sudut ditempatkan sedikit ke dalam pentagon.
 * Petak sisi ditempatkan di tengah interval sisi.
 * Validasi mencegah indeks tidak valid menghasilkan undefined.
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
 * Membuat petak corner sebagai tikungan segi empat.
 * Kedua batas panjang melengkung, sedangkan ujungnya mengikuti
 * arah sisi yang masuk dan keluar. Koordinat path relatif ke pusat corner.
 */
function getCornerPath(corner: (typeof CORNERS)[number]): string {
  const current = getCornerPosition(corner);

  const previousCorner = CORNERS.find(
    (item) => item.vertex === (corner.vertex + vertices.length - 1)
      % vertices.length,
  );
  const nextCorner = CORNERS.find(
    (item) => item.vertex === (corner.vertex + 1) % vertices.length,
  );

  if (!previousCorner || !nextCorner) {
    console.error(`Sudut tetangga tidak ditemukan: ${corner.index}`);
    return "";
  }

  const previous = getCornerPosition(previousCorner);
  const next = getCornerPosition(nextCorner);

  const normalize = (x: number, y: number) => {
    const length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length };
  };

  const incoming = normalize(
    current.x - previous.x,
    current.y - previous.y,
  );
  const outgoing = normalize(
    next.x - current.x,
    next.y - current.y,
  );

  const intervalCount = PROVISIONAL_TILES_PER_SIDE + 1;
  const halfIn = (
    Math.hypot(
    current.x - previous.x,
    current.y - previous.y,
    ) / intervalCount - TILE_GAP
  ) / 2;
  const halfOut = (
    Math.hypot(
    next.x - current.x,
    next.y - current.y,
    ) / intervalCount - TILE_GAP
  ) / 2;

  const halfWidth = TRACK_HALF_HEIGHT;

  // Normal ke arah luar pentagon untuk urutan vertex searah jarum jam.
  const outerIn = { x: incoming.y, y: -incoming.x };
  const outerOut = { x: outgoing.y, y: -outgoing.x };

  const start = {
    x: current.x - incoming.x * halfIn,
    y: current.y - incoming.y * halfIn,
  };
  const end = {
    x: current.x + outgoing.x * halfOut,
    y: current.y + outgoing.y * halfOut,
  };

  const handleIn = halfIn * 1.15;
  const handleOut = halfOut * 1.15;

  const c1 = {
    x: start.x + incoming.x * handleIn,
    y: start.y + incoming.y * handleIn,
  };
  const c2 = {
    x: end.x - outgoing.x * handleOut,
    y: end.y - outgoing.y * handleOut,
  };

  const add = (p: { x: number; y: number }, n: { x: number; y: number }, scale: number) => ({
    x: p.x + n.x * scale,
    y: p.y + n.y * scale,
  });

  const subtractCenter = (p: { x: number; y: number }) => ({
    x: p.x - current.x,
    y: p.y - current.y,
  });

  const points = [
    add(start, outerIn, halfWidth),
    add(c1, outerIn, halfWidth),
    add(c2, outerOut, halfWidth),
    add(end, outerOut, halfWidth),
    add(end, outerOut, -halfWidth),
    add(c2, outerOut, -halfWidth),
    add(c1, outerIn, -halfWidth),
    add(start, outerIn, -halfWidth),
  ].map(subtractCenter);

  const fmt = (p: { x: number; y: number }) =>
    `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;

  return [
    `M ${fmt(points[0])}`,
    `C ${fmt(points[1])}, ${fmt(points[2])}, ${fmt(points[3])}`,
    `L ${fmt(points[4])}`,
    `C ${fmt(points[5])}, ${fmt(points[6])}, ${fmt(points[7])}`,
    "Z",
  ].join(" ");
}

/*
 * Setiap sisi dibatasi oleh pusat dua petak sudut.
 * Petak sisi dibagi rata di antara kedua pusat tersebut.
 * Rotation mengikuti arah sisi agar bentuk petak mengikuti jalur.
 */
function getTilePosition(
  side: number,
  sidePosition: number,
  tileIndex: number,
  isCorner: boolean,
) {
  const corner = CORNERS.find(
    (item) => item.index === tileIndex,
  );

  if (isCorner || corner) {
    if (!corner) {
      console.error(
        `Definisi sudut tidak valid untuk petak ${tileIndex}`,
      );

      return {
        ...CENTER,
        rotation: 0,
        trackWidth: 58,
      };
    }

    return {
      ...getCornerPosition(corner),
      rotation: 0,
      trackWidth: 58,
    };
  }

  if (
    !Number.isInteger(side) ||
    side < 0 ||
    side >= vertices.length
  ) {
    console.error(
      `Indeks sisi tidak valid untuk petak ${tileIndex}: ${side}`,
    );

    return {
      ...CENTER,
      rotation: 0,
      trackWidth: 40,
    };
  }

  const startCorner = CORNERS.find(
    (item) => item.vertex === side,
  );

  const endCorner = CORNERS.find(
    (item) => item.vertex === (side + 1) % vertices.length,
  );

  if (!startCorner || !endCorner) {
    console.error(
      `Sudut pembatas tidak ditemukan untuk sisi ${side}`,
    );

    return {
      ...CENTER,
      rotation: 0,
      trackWidth: 40,
    };
  }

  const startPoint = getCornerPosition(startCorner);
  const endPoint = getCornerPosition(endCorner);

  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const segmentLength = Math.hypot(dx, dy);

  const intervalCount = PROVISIONAL_TILES_PER_SIDE + 1;

  const safeSidePosition = Math.max(
    0,
    Math.min(
      sidePosition,
      PROVISIONAL_TILES_PER_SIDE - 1,
    ),
  );

  const ratio = (safeSidePosition + 1) / intervalCount;

  const position = interpolate(
    startPoint,
    endPoint,
    ratio,
  );

  const rotation = getReadableRotation(
    Math.atan2(dy, dx) * 180 / Math.PI,
  );

  /*
   * Lebar petak mengikuti jarak pusat antarpeta.
   * Tambahan 1 unit mencegah celah kecil akibat pembulatan.
   */
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
    Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI,
  );

  return {
    x: midpoint.x + (dx / length) * offset,
    y: midpoint.y + (dy / length) * offset,
    rotation,
  };
}

const CORNER_COLORS: Record<
  string,
  { color: string; lightColor: string }
> = {
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

const SPECIAL_TILE_COLORS: Record<
  string,
  { color: string; lightColor: string }
> = {
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
    const corner = CORNERS.find(
      (item) => item.index === tile.index,
    );

    const isCorner = Boolean(tile.isCorner || corner);

    const position = getTilePosition(
      tile.side,
      tile.sidePosition,
      tile.index,
      isCorner,
    );

    const island = ISLANDS.find(
      (item) => item.side === tile.side,
    );

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

    return {
      ...tile,
      ...position,
      ...palette,
      isCorner,
      cornerPath: isCorner && corner ? getCornerPath(corner) : "",
      players: props.players.filter(
        (player) => getVisualPosition(player) === tile.index,
      ),
    };
  }),
);

const positionedPawns = computed(() =>
  props.players.map((player, playerIndex) => {
    const visualPosition = getVisualPosition(player);
    const tile = positionedTiles.value.find(
      (candidate) => candidate.index === visualPosition,
    );
    const offset = getPawnSlotOffset(playerIndex);
    const isMoving = props.movementAnimation?.playerId === player.id;

    return {
      ...player,
      visualPosition,
      x: (tile?.x ?? CENTER.x) + offset.x,
      y: (tile?.y ?? CENTER.y) + offset.y + 20,
      isMoving,
      currentStep: isMoving
        ? props.movementAnimation?.currentStep ?? 0
        : 0,
      isFinalHop: isMoving
        ? props.movementAnimation?.isFinalHop ?? false
        : false,
      hopDurationMs: isMoving
        ? props.movementAnimation?.hopDurationMs ?? 0
        : 0,
    };
  }),
);

/*
 * Jalur penghubung mengikuti urutan indeks papan.
 * Titik terakhir kembali ke titik pertama agar putaran tertutup.
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
          Setiap sisi mewakili satu pulau.
          Pembagian petak masih provisional.
        </p>
      </div>

      <span class="tile-count">
        {{ board.length }} petak sementara
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
            <stop offset="0%" stop-color="#f6faf7" />
            <stop offset="100%" stop-color="#e1ece4" />
          </linearGradient>
        </defs>

        <!-- Dasar papan -->
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
          opacity="0.28"
          pointer-events="none"
        />

        <!-- Batas pemisah setiap sisi -->
        <g>
          <line
            v-for="(edge, index) in edgeSegments"
            :key="`edge-${index}`"
            :x1="edge.start.x"
            :y1="edge.start.y"
            :x2="edge.end.x"
            :y2="edge.end.y"
            :stroke="ISLANDS[index].color"
            stroke-width="10"
            stroke-linecap="round"
          />
        </g>

        <!-- Area tengah -->
        <g
          class="board-center"
          :transform="`translate(${CENTER.x} ${CENTER.y})`"
        >
          <rect
            x="-210" y="-125" width="420" height="250" rx="30"
            fill="#ffffff"
            stroke="#cbded1"
            stroke-width="4"
          />

          <text
            x="0"
            y="-72"
            text-anchor="middle"
            class="center-eyebrow"
          >
            SIMULASI KEHIDUPAN
          </text>

          <text
            x="0"
            y="-15"
            text-anchor="middle"
            class="center-title"
          >
            WNI SIMULATOR
          </text>

          <line
            x1="-125"
            y1="10"
            x2="125"
            y2="10"
            stroke="#d7e5dc"
            stroke-width="3"
          />

          <text
            x="0"
            y="48"
            text-anchor="middle"
            class="center-subtitle"
          >
            Lima pulau, satu papan
          </text>

          <text
            x="0"
            y="82"
            text-anchor="middle"
            class="center-subtitle"
          >
            Nasib ditentukan oleh permainan
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
        >
          <path
            v-if="tile.isCorner"
            :d="tile.cornerPath"
            :fill="
              tile.type === 'start'
                ? tile.color
                : tile.lightColor
            "
            :stroke="tile.color"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <rect
            v-else
            :x="-tile.trackWidth / 2"
            :y="-TRACK_HALF_HEIGHT"
            :width="tile.trackWidth"
            :height="TRACK_HALF_HEIGHT * 2"
            rx="10"
            :fill="
              tile.type === 'start'
                ? tile.color
                : tile.lightColor
            "
            :stroke="tile.color"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <text
            x="0"
            y="-12"
            text-anchor="middle"
            class="tile-symbol"
            :fill="
              tile.type === 'start'
                ? '#ffffff'
                : tile.color
            "
          >
            {{ tile.symbol || tile.index + 1 }}
          </text>

          <text
            x="0"
            y="3"
            text-anchor="middle"
            class="tile-name"
            :class="{
              'tile-name--compact': tile.name.length > 8,
            }"
            :fill="
              tile.type === 'start'
                ? '#ffffff'
                : '#26352c'
            "
          >
            {{
              tile.name.length > 10
                ? tile.name.slice(0, 9) + "…"
                : tile.name
            }}
          </text>

          <title>
            {{ tile.name }}{{ tile.landmark ? ` — ${tile.landmark}` : '' }}
            | Pulau {{ tile.island }}
            | {{
              tile.players.map((player) => player.name).join(", ")
              || "Tidak ada pemain"
            }}
          </title>
        </g>

        <!-- Pion dirender terpisah agar dapat bergerak antarpeta. -->
        <g class="pawn-layer" aria-label="Posisi pion pemain">
          <g
            v-for="pawn in positionedPawns"
            :key="pawn.id"
            class="pawn-position"
            :class="{ 'pawn-position--moving': pawn.isMoving }"
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
              }"
              :style="{
                animationDuration: `${pawn.hopDurationMs}ms`,
              }"
            >
              <circle
                r="11"
                :fill="pawn.color"
                stroke="#ffffff"
                stroke-width="3"
              />
              <text
                y="3.5"
                text-anchor="middle"
                class="pawn-initial"
              >
                {{ pawn.name.slice(0, 1).toUpperCase() }}
              </text>
              <title>{{ pawn.name }}</title>
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
.board-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.board-heading h2 {
  margin-bottom: 8px;
}

.notice {
  margin-bottom: 0;
  color: #8a5a13;
  font-size: 12px;
  line-height: 1.5;
}

.tile-count {
  flex-shrink: 0;
  padding: 6px 10px;
  border-radius: 20px;
  background: #e9f5ef;
  color: #176b50;
  font-size: 11px;
  font-weight: 700;
}

.pentagon-board {
  width: 100%;
  overflow: hidden;
  border-radius: 12px;
  background: #edf3ee;
}

.pentagon-svg {
  display: block;
  width: 100%;
  height: auto;
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
  font-size: 13px;
  font-weight: 800;
}

.tile-name {
  font-size: 10px;
  font-weight: 700;
}

.tile-name--compact {
  font-size: 7.5px;
}

.pawn-layer {
  pointer-events: none;
}

.pawn-position {
  transform-box: view-box;
  transform-origin: 0 0;
  transition-property: transform;
  transition-timing-function: cubic-bezier(0.22, 0.78, 0.28, 1);
  will-change: transform;
}

.pawn-marker {
  filter: drop-shadow(0 3px 2px rgb(28 55 40 / 24%));
  transform-origin: center;
}

.pawn-marker--hopping {
  animation-name: pawn-hop;
  animation-timing-function: cubic-bezier(0.2, 0.72, 0.24, 1);
}

.pawn-marker--final {
  animation-name: pawn-final-hop;
}

.pawn-initial {
  fill: #ffffff;
  font-size: 10px;
  font-weight: 900;
}

@keyframes pawn-hop {
  0% {
    transform: translateY(0) scale(1);
  }
  46% {
    transform: translateY(-26px) scale(1.08);
  }
  82% {
    transform: translateY(1px) scale(1.02, 0.96);
  }
  100% {
    transform: translateY(0) scale(1);
  }
}

@keyframes pawn-final-hop {
  0% {
    transform: translateY(0) scale(1);
  }
  44% {
    transform: translateY(-32px) scale(1.14);
  }
  78% {
    transform: translateY(2px) scale(1.12, 0.9);
  }
  100% {
    transform: translateY(0) scale(1.08);
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
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 3px;
}

.center-title {
  fill: #176b50;
  font-size: 34px;
  font-weight: 900;
  letter-spacing: 1px;
}

.center-subtitle {
  fill: #68786d;
  font-size: 12px;
}

.island-legend,
.player-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  margin-top: 16px;
}

.player-legend {
  padding-top: 12px;
  border-top: 1px solid #e5e9e6;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
}

.legend-color {
  width: 12px;
  height: 12px;
  flex: 0 0 auto;
  border-radius: 3px;
}

.player-color {
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 0 0 1px #ccd4ce;
}

@media (max-width: 600px) {
  .board-heading {
    flex-direction: column;
  }

  .island-label text {
    font-size: 14px;
    letter-spacing: 0.8px;
  }

  .center-title {
    font-size: 26px;
  }

  .island-legend,
  .player-legend {
    gap: 10px 14px;
  }
}
</style>

<script setup lang="ts">
import { computed } from "vue";

import {
  board,
  CORNERS,
  ISLANDS,
  PROVISIONAL_TILES_PER_SIDE,
} from "../data/board";

import type { Player } from "../types/game";

const props = defineProps<{
  players: Player[];
}>();

const WIDTH = 1000;
const HEIGHT = 900;

const CENTER = { x: 500, y: 450 };

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
const OUTER_RADIUS = 355;

// Vertex pertama di atas, lalu searah jarum jam.
const vertices = Array.from({ length: 5 }, (_, index) => {
  const angle = (-90 + index * 72) * Math.PI / 180;

  return {
    x: BOARD_CENTER.x + OUTER_RADIUS * Math.cos(angle),
    y: BOARD_CENTER.y + OUTER_RADIUS * Math.sin(angle),
  };
});

const polygonPoints = vertices
  .map(({ x, y }) => `${x},${y}`)
  .join(" ");

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

  return interpolate(vertex, CENTER, 0.16);
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
      };
    }

    return {
      ...getCornerPosition(corner),
      rotation: 0,
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
    };
  }

  /*
   * Side 2: Start -> Penjara
   * Side 3: Penjara -> Pajak Tahunan
   * Side 4: Pajak Tahunan -> Pengadilan
   * Side 0: Pengadilan -> Parkiran Pungli
   * Side 1: Parkiran Pungli -> Start
   */
  const startCorner = CORNERS.find(
    (item) => item.vertex === side,
  );

  const endCorner = CORNERS.find(
    (item) => item.vertex === (side + 1) % vertices.length,
  );

  if (!startCorner || !endCorner) {
    console.error(
      `Petak ${tileIndex} tidak memiliki batas sudut untuk sisi ${side}`,
    );

    return {
      ...CENTER,
      rotation: 0,
    };
  }

  const startPoint = getCornerPosition(startCorner);
  const endPoint = getCornerPosition(endCorner);

  const safeSidePosition = Math.max(
    0,
    Math.min(
      sidePosition,
      PROVISIONAL_TILES_PER_SIDE - 1,
    ),
  );

  /*
   * Ada delapan petak sisi di antara dua petak sudut.
   * Karena itu, jarak pusatnya dibagi menjadi sembilan interval.
   */
  const ratio =
    (safeSidePosition + 1) /
    (PROVISIONAL_TILES_PER_SIDE + 1);

  const position = interpolate(
    startPoint,
    endPoint,
    ratio,
  );

  const rotation =
    Math.atan2(
      endPoint.y - startPoint.y,
      endPoint.x - startPoint.x,
    ) * 180 / Math.PI;

  return {
    ...position,
    rotation,
  };
}
function getIslandLabel(side: number) {
  const start = vertices[side];
  const end = vertices[(side + 1) % vertices.length];

  if (!start || !end) {
    return { ...CENTER };
  }

  const midpoint = interpolate(start, end, 0.5);
  const dx = midpoint.x - CENTER.x;
  const dy = midpoint.y - CENTER.y;
  const length = Math.hypot(dx, dy) || 1;
  const offset = 38;

  return {
    x: midpoint.x + (dx / length) * offset,
    y: midpoint.y + (dy / length) * offset,
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

    const palette = isCorner
      ? CORNER_COLORS[tile.type] ?? {
          color: "#596579",
          lightColor: "#e9edf3",
        }
      : {
          color: island?.color ?? "#596579",
          lightColor: island?.lightColor ?? "#e9edf3",
        };

    return {
      ...tile,
      ...position,
      ...palette,
      isCorner,
      players: props.players.filter(
        (player) => player.position === tile.index,
      ),
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
        <polygon
          :points="polygonPoints"
          fill="url(#board-background)"
          stroke="#354c3e"
          stroke-width="7"
          stroke-linejoin="round"
        />

        <!-- Jalur penghubung semua petak -->
        <polyline
          :points="tilePathPoints"
          fill="none"
          stroke="#354c3e"
          stroke-width="5"
          stroke-linecap="round"
          stroke-linejoin="round"
          opacity="0.72"
          pointer-events="none"
        />

        <!-- Batas pemisah setiap sisi -->
        <g>
          <line
            v-for="(vertex, index) in vertices"
            :key="`edge-${index}`"
            :x1="vertex.x"
            :y1="vertex.y"
            :x2="vertices[(index + 1) % vertices.length].x"
            :y2="vertices[(index + 1) % vertices.length].y"
            :stroke="ISLANDS[index].color"
            stroke-width="10"
            stroke-linecap="round"
          />
        </g>

        <!-- Area tengah -->
        <g class="board-center">
          <rect
            x="325" y="345" width="350" height="210" rx="22"
            fill="#ffffff"
            stroke="#cbded1"
            stroke-width="3"
          />

          <text
            x="500"
            y="395"
            text-anchor="middle"
            class="center-eyebrow"
          >
            SIMULASI KEHIDUPAN
          </text>

          <text
            x="500"
            y="445"
            text-anchor="middle"
            class="center-title"
          >
            WNI SIMULATOR
          </text>

          <line
            x1="390"
            y1="465"
            x2="610"
            y2="465"
            stroke="#d7e5dc"
            stroke-width="3"
          />

          <text
            x="500"
            y="495"
            text-anchor="middle"
            class="center-subtitle"
          >
            Lima pulau, satu papan
          </text>

          <text
            x="500"
            y="525"
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
          <rect
            :x="tile.isCorner ? -29 : -21"
            :y="tile.isCorner ? -29 : -24"
            :width="tile.isCorner ? 58 : 42"
            :height="tile.isCorner ? 58 : 48"
            rx="5"
            :fill="
              tile.type === 'start'
                ? tile.color
                : tile.lightColor
            "
            :stroke="tile.color"
            :stroke-width="tile.verified ? 3 : 2"
            :stroke-dasharray="
              tile.verified ? 'none' : '4 3'
            "
          />

          <text
            x="0"
            y="-11"
            text-anchor="middle"
            class="tile-index"
            :fill="
              tile.type === 'start'
                ? '#ffffff'
                : tile.color
            "
          >
            {{ tile.index + 1 }}
          </text>

          <text
            x="0"
            y="3"
            text-anchor="middle"
            class="tile-name"
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

          <!-- Pion pemain -->
          <g
            v-for="(player, playerIndex) in tile.players"
            :key="player.id"
          >
            <circle
              :cx="
                (
                  playerIndex -
                  (tile.players.length - 1) / 2
                ) * 11
              "
              cy="18"
              r="4.5"
              :fill="player.color"
              stroke="#ffffff"
              stroke-width="1.5"
            >
              <title>{{ player.name }}</title>
            </circle>
          </g>

          <title>
            {{ tile.name }} | Pulau {{ tile.island }}
            | {{
              tile.players.map((player) => player.name).join(", ")
              || "Tidak ada pemain"
            }}
          </title>
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
  font-size: 17px;
  font-weight: 900;
  letter-spacing: 1.5px;
  paint-order: stroke;
  stroke: #f6faf7;
  stroke-width: 5px;
  stroke-linejoin: round;
}

.tile-index {
  font-size: 9px;
  font-weight: 800;
}

.tile-name {
  font-size: 7.5px;
  font-weight: 700;
}

.center-eyebrow {
  fill: #6d8274;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 3px;
}

.center-title {
  fill: #176b50;
  font-size: 30px;
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

#!/usr/bin/env bash

set -euo pipefail

echo "Membuat struktur proyek WNI Simulator..."

# =========================================================
# 1. Direktori
# =========================================================

mkdir -p src/components
mkdir -p src/composables
mkdir -p src/data
mkdir -p src/engine/__tests__
mkdir -p src/types

# =========================================================
# 2. Types
# =========================================================

cat > src/types/game.ts <<'EOF'
export type TileType =
  | "start"
  | "property"
  | "jail"
  | "tax"
  | "court"
  | "extortion"
  | "toll"
  | "ticket"
  | "disaster"
  | "unknown";

export type PlayerStatus =
  | "active"
  | "jailed"
  | "bankrupt";

export type GamePhase =
  | "setup"
  | "awaiting_roll"
  | "resolving"
  | "awaiting_end_turn"
  | "finished";

export interface BoardTile {
  id: string;
  index: number;
  name: string;
  type: TileType;
  verified: boolean;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  cash: number;
  position: number;
  status: PlayerStatus;
  jailTurns: number;
  propertyIds: string[];
  inventory: string[];
}

export interface GameLogEntry {
  id: string;
  turn: number;
  message: string;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  turnNumber: number;
  dice: [number, number] | null;
  logs: GameLogEntry[];
  phase: GamePhase;
}
EOF

# =========================================================
# 3. Data papan
# =========================================================

cat > src/data/board.ts <<'EOF'
import type { BoardTile, TileType } from "../types/game";

/**
 * Jumlah 40 petak hanya untuk prototipe.
 * Belum dikonfirmasi sebagai jumlah petak resmi WNI Simulator.
 */
export const PROVISIONAL_BOARD_SIZE = 40;

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
    const known = knownTiles[index];

    if (known) {
      return {
        id: `tile-${index}`,
        index,
        ...known,
        verified: true,
      };
    }

    return {
      id: `tile-${index}`,
      index,
      name: `Petak ${index + 1}`,
      type: "unknown",
      verified: false,
    };
  },
);
EOF

# =========================================================
# 4. Data properti
# =========================================================

cat > src/data/properties.ts <<'EOF'
export interface PropertyDefinition {
  id: string;
  name: string;
  island: string;
  price: number;
  houseCost: number;
  rent: number[];
  verified: boolean;
}

/**
 * Data properti resmi belum dimasukkan karena harga dan tarif
 * harus diverifikasi dari kartu permainan asli.
 */
export const properties: PropertyDefinition[] = [];
EOF

# =========================================================
# 5. Kartu takdir
# =========================================================

cat > src/data/destiny-cards.ts <<'EOF'
export type DestinyCardCategory =
  | "positive"
  | "negative"
  | "item"
  | "conditional";

export interface DestinyCard {
  id: string;
  title: string;
  description: string;
  category: DestinyCardCategory;
  requiresDice: boolean;
  verified: boolean;
}

/**
 * Isi dengan teks kartu resmi setelah referensinya tersedia.
 */
export const destinyCards: DestinyCard[] = [];
EOF

# =========================================================
# 6. Kartu musibah
# =========================================================

cat > src/data/disaster-cards.ts <<'EOF'
export type DisasterSeverity =
  | "light"
  | "medium"
  | "brutal";

export interface DisasterCard {
  id: string;
  title: string;
  description: string;
  severity?: DisasterSeverity;
  verified: boolean;
}

/**
 * Kartu musibah resmi belum dimasukkan.
 */
export const disasterCards: DisasterCard[] = [];
EOF

# =========================================================
# 7. Game Engine
# =========================================================

cat > src/engine/GameEngine.ts <<'EOF'
import type {
  GameLogEntry,
  GameState,
  Player,
} from "../types/game";

import { board } from "../data/board";

export const START_SALARY = 1_000_000;

const PLAYER_COLORS = [
  "#e74c3c",
  "#3498db",
  "#2ecc71",
  "#f1c40f",
  "#9b59b6",
];

function createLog(
  turn: number,
  message: string,
): GameLogEntry {
  return {
    id: crypto.randomUUID(),
    turn,
    message,
  };
}

export function rollDie(
  random: () => number = Math.random,
): number {
  return Math.floor(random() * 6) + 1;
}

export function rollDice(
  random: () => number = Math.random,
): [number, number] {
  return [rollDie(random), rollDie(random)];
}

export function createInitialState(
  playerNames: string[],
  startingCash: number,
): GameState {
  if (playerNames.length < 2 || playerNames.length > 5) {
    throw new Error("Jumlah pemain harus antara 2 dan 5.");
  }

  if (playerNames.some((name) => !name.trim())) {
    throw new Error("Nama pemain tidak boleh kosong.");
  }

  if (!Number.isFinite(startingCash) || startingCash < 0) {
    throw new Error("Modal awal tidak valid.");
  }

  const players: Player[] = playerNames.map(
    (name, index) => ({
      id: `player-${index + 1}`,
      name: name.trim(),
      color: PLAYER_COLORS[index],
      cash: startingCash,
      position: 0,
      status: "active",
      jailTurns: 0,
      propertyIds: [],
      inventory: [],
    }),
  );

  return {
    players,
    currentPlayerIndex: 0,
    turnNumber: 1,
    dice: null,
    logs: [
      createLog(
        1,
        `Permainan dimulai dengan ${players.length} pemain.`,
      ),
    ],
    phase: "awaiting_roll",
  };
}

export function movePlayer(
  state: GameState,
  playerId: string,
  steps: number,
): GameState {
  if (!Number.isInteger(steps) || steps < 0) {
    throw new Error("Jumlah langkah harus bilangan bulat nonnegatif.");
  }

  const playerIndex = state.players.findIndex(
    (player) => player.id === playerId,
  );

  if (playerIndex === -1) {
    throw new Error("Pemain tidak ditemukan.");
  }

  const player = state.players[playerIndex];

  if (player.status !== "active") {
    throw new Error("Pemain tidak dapat bergerak.");
  }

  const boardSize = board.length;
  const rawPosition = player.position + steps;
  const passedStart = rawPosition >= boardSize;

  const newPosition = rawPosition % boardSize;

  const updatedPlayer: Player = {
    ...player,
    position: newPosition,
    cash: player.cash + (
      passedStart ? START_SALARY : 0
    ),
  };

  const players = [...state.players];
  players[playerIndex] = updatedPlayer;

  const logs = [...state.logs];

  if (passedStart) {
    logs.push(
      createLog(
        state.turnNumber,
        `${player.name} melewati Start dan menerima gaji Rp${START_SALARY.toLocaleString("id-ID")}.`,
      ),
    );
  }

  logs.push(
    createLog(
      state.turnNumber,
      `${player.name} bergerak ${steps} langkah ke ${board[newPosition].name}.`,
    ),
  );

  return {
    ...state,
    players,
    logs,
  };
}

export function applyRoll(
  state: GameState,
  dice: [number, number],
): GameState {
  if (state.phase !== "awaiting_roll") {
    throw new Error("Dadu tidak dapat dilempar pada fase ini.");
  }

  if (
    dice.some(
      (value) =>
        !Number.isInteger(value) ||
        value < 1 ||
        value > 6,
    )
  ) {
    throw new Error("Nilai dadu harus antara 1 dan 6.");
  }

  const player = state.players[state.currentPlayerIndex];

  if (!player || player.status !== "active") {
    throw new Error("Pemain saat ini tidak aktif.");
  }

  const movedState = movePlayer(
    state,
    player.id,
    dice[0] + dice[1],
  );

  const isDouble = dice[0] === dice[1];

  return {
    ...movedState,
    dice,
    phase: "awaiting_end_turn",
    logs: [
      ...movedState.logs,
      createLog(
        state.turnNumber,
        isDouble
          ? `${player.name} mendapat dadu kembar. Ambil kartu Takdir setelah efek petak diselesaikan.`
          : `${player.name} memperoleh dadu ${dice[0]} dan ${dice[1]}.`,
      ),
    ],
  };
}

export function endTurn(
  state: GameState,
): GameState {
  if (state.phase !== "awaiting_end_turn") {
    throw new Error("Giliran belum dapat diakhiri.");
  }

  const nextPlayerIndex =
    (state.currentPlayerIndex + 1) % state.players.length;

  const completedRound = nextPlayerIndex === 0;

  const nextTurnNumber = completedRound
    ? state.turnNumber + 1
    : state.turnNumber;

  const nextPlayer = state.players[nextPlayerIndex];

  return {
    ...state,
    currentPlayerIndex: nextPlayerIndex,
    turnNumber: nextTurnNumber,
    dice: null,
    phase: "awaiting_roll",
    logs: [
      ...state.logs,
      createLog(
        nextTurnNumber,
        `Giliran berikutnya: ${nextPlayer.name}.`,
      ),
    ],
  };
}
EOF

# =========================================================
# 8. Composable permainan
# =========================================================

cat > src/composables/useGame.ts <<'EOF'
import { computed, ref } from "vue";

import {
  applyRoll,
  createInitialState,
  endTurn,
  rollDice,
} from "../engine/GameEngine";

import type { GameState } from "../types/game";

export function useGame() {
  const state = ref<GameState>(
    createInitialState(
      ["Pemain 1", "Pemain 2"],
      5_000_000,
    ),
  );

  const currentPlayer = computed(
    () => state.value.players[state.value.currentPlayerIndex],
  );

  function throwDice() {
    state.value = applyRoll(
      state.value,
      rollDice(),
    );
  }

  function finishTurn() {
    state.value = endTurn(state.value);
  }

  return {
    state,
    currentPlayer,
    throwDice,
    finishTurn,
  };
}
EOF

# =========================================================
# 9. Komponen papan permainan
# =========================================================

cat > src/components/GameBoard.vue <<'EOF'
<script setup lang="ts">
import { board } from "../data/board";
import type { Player } from "../types/game";

defineProps<{
  players: Player[];
}>();

const columns = 8;

function getPosition(index: number) {
  const row = Math.floor(index / columns);
  const col = index % columns;

  return {
    x: 20 + col * 110,
    y: 20 + row * 100,
  };
}
</script>

<template>
  <section class="board-wrapper">
    <h2>Papan WNI Simulator</h2>

    <p class="notice">
      Papan masih prototipe. Posisi petak resmi belum diverifikasi.
    </p>

    <div class="board-grid">
      <article
        v-for="tile in board"
        :key="tile.id"
        class="board-tile"
        :class="`tile-${tile.type}`"
      >
        <small>Petak {{ tile.index + 1 }}</small>
        <strong>{{ tile.name }}</strong>

        <div class="pawns">
          <span
            v-for="player in players.filter(
              (item) => item.position === tile.index,
            )"
            :key="player.id"
            class="pawn"
            :style="{ backgroundColor: player.color }"
            :title="player.name"
          />
        </div>

        <small v-if="!tile.verified" class="unverified">
          Belum diverifikasi
        </small>
      </article>
    </div>
  </section>
</template>
EOF

# =========================================================
# 10. Panel pemain
# =========================================================

cat > src/components/PlayerPanel.vue <<'EOF'
<script setup lang="ts">
import type { Player } from "../types/game";

defineProps<{
  players: Player[];
  currentPlayerId: string;
}>();
</script>

<template>
  <section class="panel">
    <h2>Pemain</h2>

    <article
      v-for="player in players"
      :key="player.id"
      class="player-card"
      :class="{
        'player-active': player.id === currentPlayerId,
      }"
    >
      <span
        class="player-color"
        :style="{ backgroundColor: player.color }"
      />

      <div>
        <strong>{{ player.name }}</strong>
        <p>Uang: Rp{{ player.cash.toLocaleString("id-ID") }}</p>
        <p>Posisi: {{ player.position + 1 }}</p>
        <p>Status: {{ player.status }}</p>
      </div>
    </article>
  </section>
</template>
EOF

# =========================================================
# 11. Komponen dadu
# =========================================================

cat > src/components/DiceRoller.vue <<'EOF'
<script setup lang="ts">
defineProps<{
  dice: [number, number] | null;
  disabled: boolean;
}>();

defineEmits<{
  roll: [];
}>();
</script>

<template>
  <section class="panel">
    <h2>Dadu</h2>

    <div class="dice-display">
      <span>{{ dice?.[0] ?? "?" }}</span>
      <span>{{ dice?.[1] ?? "?" }}</span>
    </div>

    <button
      type="button"
      :disabled="disabled"
      @click="$emit('roll')"
    >
      Lempar Dadu
    </button>
  </section>
</template>
EOF

# =========================================================
# 12. Dialog kartu
# =========================================================

cat > src/components/CardDialog.vue <<'EOF'
<script setup lang="ts">
defineProps<{
  visible: boolean;
  title: string;
  description: string;
}>();

defineEmits<{
  close: [];
}>();
</script>

<template>
  <div v-if="visible" class="dialog-backdrop">
    <section
      class="dialog-card"
      role="dialog"
      aria-modal="true"
    >
      <h2>{{ title }}</h2>
      <p>{{ description }}</p>

      <button type="button" @click="$emit('close')">
        Tutup
      </button>
    </section>
  </div>
</template>
EOF

# =========================================================
# 13. Log permainan
# =========================================================

cat > src/components/GameLog.vue <<'EOF'
<script setup lang="ts">
import type { GameLogEntry } from "../types/game";

defineProps<{
  logs: GameLogEntry[];
}>();
</script>

<template>
  <section class="panel">
    <h2>Log Permainan</h2>

    <ol class="game-log">
      <li
        v-for="log in [...logs].reverse()"
        :key="log.id"
      >
        <small>Giliran {{ log.turn }}</small>
        <p>{{ log.message }}</p>
      </li>
    </ol>
  </section>
</template>
EOF

# =========================================================
# 14. App utama
# =========================================================

cat > src/App.vue <<'EOF'
<script setup lang="ts">
import GameBoard from "./components/GameBoard.vue";
import PlayerPanel from "./components/PlayerPanel.vue";
import DiceRoller from "./components/DiceRoller.vue";
import GameLog from "./components/GameLog.vue";

import { useGame } from "./composables/useGame";

const {
  state,
  currentPlayer,
  throwDice,
  finishTurn,
} = useGame();
</script>

<template>
  <main class="app">
    <header class="app-header">
      <div>
        <h1>WNI Simulator</h1>
        <p>Prototipe permainan papan berbasis browser</p>
      </div>

      <div class="turn-indicator">
        <span>Giliran {{ state.turnNumber }}</span>
        <strong>{{ currentPlayer.name }}</strong>
      </div>
    </header>

    <div class="layout">
      <div class="main-column">
        <GameBoard :players="state.players" />

        <DiceRoller
          :dice="state.dice"
          :disabled="state.phase !== 'awaiting_roll'"
          @roll="throwDice"
        />

        <button
          v-if="state.phase === 'awaiting_end_turn'"
          class="end-turn-button"
          type="button"
          @click="finishTurn"
        >
          Akhiri Giliran
        </button>
      </div>

      <aside class="sidebar">
        <PlayerPanel
          :players="state.players"
          :current-player-id="currentPlayer.id"
        />

        <GameLog :logs="state.logs" />
      </aside>
    </div>

    <footer>
      Aturan, urutan papan, kartu, dan harga properti masih dalam tahap
      verifikasi. Prototipe ini belum menerapkan seluruh aturan resmi.
    </footer>
  </main>
</template>
EOF

# =========================================================
# 15. CSS
# =========================================================

cat > src/style.css <<'EOF'
:root {
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  color: #20252d;
  background: #f1f3f6;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
}

button {
  border: 0;
  border-radius: 8px;
  padding: 12px 18px;
  background: #176b50;
  color: white;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

button:hover:not(:disabled) {
  background: #10543e;
}

button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.app {
  max-width: 1600px;
  margin: 0 auto;
  padding: 24px;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
}

h1,
h2,
p {
  margin-top: 0;
}

.app-header h1 {
  margin-bottom: 6px;
}

.app-header p,
footer {
  color: #68717d;
}

.turn-indicator {
  display: grid;
  gap: 4px;
  text-align: right;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  gap: 24px;
  align-items: start;
}

.main-column,
.sidebar {
  display: grid;
  gap: 20px;
  min-width: 0;
}

.board-wrapper,
.panel {
  padding: 20px;
  background: white;
  border: 1px solid #e0e4e9;
  border-radius: 14px;
  box-shadow: 0 4px 16px rgb(20 30 40 / 4%);
}

.notice {
  color: #8a5a13;
  font-size: 13px;
}

.board-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.board-tile {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 110px;
  padding: 10px;
  border: 1px solid #d9dfe5;
  border-radius: 8px;
  background: #fafbfc;
  overflow-wrap: anywhere;
}

.board-tile strong {
  font-size: 13px;
}

.board-tile small {
  color: #68717d;
  font-size: 10px;
}

.tile-start {
  border-color: #176b50;
  background: #e9f5ef;
}

.tile-unknown {
  border-style: dashed;
}

.pawns {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}

.pawn,
.player-color {
  display: inline-block;
  width: 15px;
  height: 15px;
  flex: 0 0 auto;
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgb(0 0 0 / 15%);
}

.unverified {
  margin-top: 5px;
  color: #a05a00 !important;
}

.player-card {
  display: flex;
  gap: 12px;
  padding: 14px 10px;
  border-bottom: 1px solid #edf0f3;
  border-radius: 6px;
}

.player-card:last-child {
  border-bottom: 0;
}

.player-active {
  background: #e9f5ef;
}

.player-color {
  margin-top: 4px;
}

.player-card p {
  margin: 5px 0 0;
  color: #68717d;
  font-size: 13px;
}

.dice-display {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.dice-display span {
  display: grid;
  width: 54px;
  height: 54px;
  place-items: center;
  border: 1px solid #d9dfe5;
  border-radius: 10px;
  background: #fafbfc;
  font-size: 28px;
  font-weight: 800;
}

.end-turn-button {
  width: 100%;
}

.game-log {
  display: grid;
  gap: 12px;
  max-height: 380px;
  overflow-y: auto;
  padding-left: 20px;
}

.game-log li {
  padding-left: 4px;
}

.game-log small {
  color: #68717d;
}

.game-log p {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.5;
}

footer {
  margin-top: 24px;
  padding: 16px 0;
  font-size: 12px;
  line-height: 1.6;
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 520px) {
  .app {
    padding: 12px;
  }

  .app-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .turn-indicator {
    text-align: left;
  }

  .board-wrapper,
  .panel {
    padding: 12px;
  }

  .board-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .board-tile {
    min-height: 95px;
    padding: 7px;
  }
}
EOF

# =========================================================
# 16. Entry point
# =========================================================

cat > src/main.ts <<'EOF'
import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";

createApp(App).mount("#app");
EOF

# =========================================================
# 17. Vitest configuration
# =========================================================

cat > vite.config.ts <<'EOF'
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
EOF

# =========================================================
# 18. Unit tests
# =========================================================

cat > src/engine/__tests__/GameEngine.test.ts <<'EOF'
import { describe, expect, it } from "vitest";

import {
  applyRoll,
  createInitialState,
  endTurn,
  movePlayer,
  rollDie,
  rollDice,
  START_SALARY,
} from "../GameEngine";

describe("GameEngine", () => {
  it("membuat permainan dengan dua pemain", () => {
    const state = createInitialState(
      ["Ali", "Budi"],
      5_000_000,
    );

    expect(state.players).toHaveLength(2);
    expect(state.players[0].name).toBe("Ali");
    expect(state.players[0].cash).toBe(5_000_000);
    expect(state.phase).toBe("awaiting_roll");
  });

  it("menolak jumlah pemain yang tidak valid", () => {
    expect(() =>
      createInitialState(["Ali"], 5_000_000),
    ).toThrow();

    expect(() =>
      createInitialState(
        ["A", "B", "C", "D", "E", "F"],
        5_000_000,
      ),
    ).toThrow();
  });

  it("menghasilkan dadu antara satu dan enam", () => {
    expect(rollDie(() => 0)).toBe(1);
    expect(rollDie(() => 0.999)).toBe(6);
    expect(rollDice(() => 0.5)).toEqual([4, 4]);
  });

  it("memindahkan pemain sesuai jumlah langkah", () => {
    const state = createInitialState(
      ["Ali", "Budi"],
      5_000_000,
    );

    const nextState = movePlayer(
      state,
      "player-1",
      4,
    );

    expect(nextState.players[0].position).toBe(4);
    expect(nextState.players[0].cash).toBe(5_000_000);
  });

  it("memberikan gaji ketika pemain melewati Start", () => {
    const state = createInitialState(
      ["Ali", "Budi"],
      5_000_000,
    );

    const nearStart = {
      ...state,
      players: state.players.map((player, index) =>
        index === 0
          ? { ...player, position: 38 }
          : player,
      ),
    };

    const nextState = movePlayer(
      nearStart,
      "player-1",
      4,
    );

    expect(nextState.players[0].position).toBe(2);
    expect(nextState.players[0].cash).toBe(
      5_000_000 + START_SALARY,
    );
  });

  it("mencatat dadu kembar tanpa memberikan giliran tambahan", () => {
    const state = createInitialState(
      ["Ali", "Budi"],
      5_000_000,
    );

    const nextState = applyRoll(state, [3, 3]);

    expect(nextState.dice).toEqual([3, 3]);
    expect(nextState.phase).toBe("awaiting_end_turn");
    expect(
      nextState.logs.some((log) =>
        log.message.includes("dadu kembar"),
      ),
    ).toBe(true);
  });

  it("memindahkan giliran ke pemain berikutnya", () => {
    const state = createInitialState(
      ["Ali", "Budi"],
      5_000_000,
    );

    const rolledState = applyRoll(state, [1, 2]);
    const nextState = endTurn(rolledState);

    expect(nextState.currentPlayerIndex).toBe(1);
    expect(nextState.turnNumber).toBe(1);
    expect(nextState.phase).toBe("awaiting_roll");
  });

  it("menaikkan nomor giliran setelah semua pemain bermain", () => {
    const state = createInitialState(
      ["Ali", "Budi"],
      5_000_000,
    );

    const playerOneTurn = endTurn(
      applyRoll(state, [1, 2]),
    );

    const playerTwoTurn = endTurn(
      applyRoll(playerOneTurn, [2, 3]),
    );

    expect(playerTwoTurn.currentPlayerIndex).toBe(0);
    expect(playerTwoTurn.turnNumber).toBe(2);
  });
});
EOF

# =========================================================
# 19. Periksa hasil
# =========================================================

echo
echo "Struktur file berhasil dibuat."
echo
find src -maxdepth 4 -type f | sort
echo
echo "Selesai."

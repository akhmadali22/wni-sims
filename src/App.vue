<script setup lang="ts">
import { onMounted } from "vue";
import GameBoard from "./components/GameBoard.vue";
import PlayerPanel from "./components/PlayerPanel.vue";
import DiceRoller from "./components/DiceRoller.vue";
import GameLog from "./components/GameLog.vue";
import GameSetup from "./components/GameSetup.vue";

import { useGame } from "./composables/useGame";

const {
  state,
  currentPlayer,
  movementAnimation,
  isAnimatingMovement,
  startGame,
  throwDice,
  finishTurn,
  finishPrisonTurn,
} = useGame();

onMounted(() => {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    if (params.has("autoStart")) {
      const rawCount = parseInt(params.get("autoStart") || "2", 10);
      const count = Math.min(5, Math.max(2, Number.isNaN(rawCount) ? 2 : rawCount));
      const defaultNames = ["Andi", "Budi", "Citra", "Dewi", "Eko"];
      startGame(defaultNames.slice(0, count));

      if (params.has("tile")) {
        const targetTile = parseInt(params.get("tile") || "0", 10);
        if (state.value && !Number.isNaN(targetTile)) {
          state.value = {
            ...state.value,
            players: state.value.players.map((p) => ({
              ...p,
              position: targetTile,
            })),
          };
        }
      }

      if (params.has("testHop")) {
        const step = parseInt(params.get("testHop") || "3", 10);
        movementAnimation.value = {
          playerId: "player-1",
          path: [0, 1, 2, 3, 4],
          currentTile: step,
          currentStep: step,
          totalSteps: 4,
          isFinalHop: false,
          hopDurationMs: 150,
        };
      }
    }
  }
});
</script>

<template>
  <main class="app">
    <header class="app-header">
      <div class="brand-block">
        <span class="brand-kicker">Permainan bertahan hidup ekonomi</span>
        <h1>WNI Simulator</h1>
        <p>Lima pulau, satu perjalanan penuh kejutan.</p>
      </div>

      <div
        v-if="state && currentPlayer"
        class="turn-indicator"
        :style="{ '--active-player-color': currentPlayer.color }"
      >
        <span class="turn-pawn" aria-hidden="true" />
        <span class="turn-copy">
          <small>Giliran {{ state.turnNumber }}</small>
          <strong>{{ currentPlayer.name }}</strong>
        </span>
      </div>
    </header>

    <GameSetup v-if="!state" @start="startGame" />

    <div v-else-if="currentPlayer" class="layout">
      <div class="main-column">
        <GameBoard
          :players="state.players"
          :movement-animation="movementAnimation"
          :active-player-id="currentPlayer.id"
        />
      </div>

      <aside class="sidebar">
        <div class="action-stack">
          <DiceRoller
            :dice="state.dice"
            :disabled="
              state.phase !== 'awaiting_roll' || isAnimatingMovement
            "
            :rolling="isAnimatingMovement"
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

          <button
            v-if="state.phase === 'awaiting_prison_turn'"
            class="end-turn-button"
            type="button"
            @click="finishPrisonTurn"
          >
            Akhiri Giliran Penjara
          </button>
        </div>

        <PlayerPanel
          :players="state.players"
          :current-player-id="currentPlayer.id"
        />

        <GameLog :logs="state.logs" />
      </aside>
    </div>

    <footer class="app-footer">
      Aturan, urutan papan, kartu, dan harga properti masih dalam tahap
      verifikasi. Prototipe ini belum menerapkan seluruh aturan resmi.
    </footer>
  </main>
</template>

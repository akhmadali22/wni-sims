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

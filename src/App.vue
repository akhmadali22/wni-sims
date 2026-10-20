<script setup lang="ts">
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
</script>

<template>
  <main class="app">
    <header class="app-header">
      <div>
        <h1>WNI Simulator</h1>
        <p>Prototipe permainan papan berbasis browser</p>
      </div>

      <div v-if="state && currentPlayer" class="turn-indicator">
        <span>Giliran {{ state.turnNumber }}</span>
        <strong>{{ currentPlayer.name }}</strong>
      </div>
    </header>

    <GameSetup v-if="!state" @start="startGame" />

    <div v-else-if="currentPlayer" class="layout">
      <div class="main-column">
        <GameBoard
          :players="state.players"
          :movement-animation="movementAnimation"
        />

        <DiceRoller
          :dice="state.dice"
          :disabled="
            state.phase !== 'awaiting_roll' || isAnimatingMovement
          "
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

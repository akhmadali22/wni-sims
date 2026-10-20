import { computed, ref } from "vue";

import {
  applyRoll,
  createInitialState,
  endPrisonTurn,
  endTurn,
  rollDice,
} from "../engine/GameEngine";
import type { GameState } from "../types/game";

export function useGame() {
  const state = ref<GameState | null>(null);
  const currentPlayer = computed(() => {
    if (!state.value) {
      return null;
    }
    return state.value.players[state.value.currentPlayerIndex] ?? null;
  });

  function startGame(playerNames: string[]) {
    state.value = createInitialState(playerNames);
  }

  function throwDice() {
    if (!state.value) {
      throw new Error("Permainan belum dimulai.");
    }
    state.value = applyRoll(state.value, rollDice());
  }

  function finishTurn() {
    if (!state.value) {
      throw new Error("Permainan belum dimulai.");
    }
    state.value = endTurn(state.value);
  }

  function finishPrisonTurn() {
    if (!state.value) {
      throw new Error("Permainan belum dimulai.");
    }
    state.value = endPrisonTurn(state.value);
  }

  return {
    state,
    currentPlayer,
    startGame,
    throwDice,
    finishTurn,
    finishPrisonTurn,
  };
}

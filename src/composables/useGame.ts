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

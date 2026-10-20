import {
  computed,
  getCurrentScope,
  nextTick,
  onScopeDispose,
  ref,
} from "vue";

import {
  createInitialState,
  dispatchGameAction,
  endPrisonTurn,
  endTurn,
  rollDice,
} from "../engine/GameEngine";
import { board } from "../data/board";
import {
  buildMovementPath,
  createPawnMovementAnimation,
  DEFAULT_HOP_DURATION_MS,
} from "../animation/pawnMovement";
import type { GameState } from "../types/game";
import type { PawnMovementAnimation } from "../animation/pawnMovement";

export interface UseGameOptions {
  rollDice?: () => [number, number];
  hopDurationMs?: number;
  prefersReducedMotion?: () => boolean;
}

export function useGame(options: UseGameOptions = {}) {
  const state = ref<GameState | null>(null);
  const movementAnimation = ref<PawnMovementAnimation | null>(null);
  const isAnimatingMovement = computed(
    () => movementAnimation.value !== null,
  );
  const hopDurationMs = options.hopDurationMs ?? DEFAULT_HOP_DURATION_MS;
  if (!Number.isFinite(hopDurationMs) || hopDurationMs < 0) {
    throw new Error("Durasi hop tidak valid.");
  }
  let animationRunId = 0;
  let animationTimer: ReturnType<typeof setTimeout> | null = null;
  let resolveAnimationTimer: (() => void) | null = null;

  const currentPlayer = computed(() => {
    if (!state.value) {
      return null;
    }
    return state.value.players[state.value.currentPlayerIndex] ?? null;
  });

  function startGame(playerNames: string[]) {
    cancelMovementAnimation();
    state.value = createInitialState(playerNames);
  }

  function actionId(gameState: GameState, suffix: string) {
    return `ui-${gameState.revision}-${suffix}`;
  }

  function resolvePendingMovement(gameState: GameState): GameState {
    let nextState = dispatchGameAction(gameState, {
      id: actionId(gameState, "move"),
      type: "RESOLVE_MOVEMENT",
    });

    while (
      nextState.phase !== "awaiting_end_turn" &&
      nextState.phase !== "finished"
    ) {
      nextState = dispatchGameAction(nextState, {
        id: actionId(nextState, "advance"),
        type: "ADVANCE_RESOLUTION",
      });
    }

    return nextState;
  }

  function delay(duration: number) {
    return new Promise<void>((resolve) => {
      resolveAnimationTimer = resolve;
      animationTimer = setTimeout(() => {
        animationTimer = null;
        resolveAnimationTimer = null;
        resolve();
      }, duration);
    });
  }

  function prefersReducedMotion() {
    if (options.prefersReducedMotion) {
      return options.prefersReducedMotion();
    }

    return typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }

  async function throwDice() {
    if (!state.value) {
      throw new Error("Permainan belum dimulai.");
    }
    if (movementAnimation.value || state.value.phase !== "awaiting_roll") {
      throw new Error("Aksi dadu tidak tersedia saat ini.");
    }

    const player = currentPlayer.value;
    if (!player) {
      throw new Error("Pemain aktif tidak ditemukan.");
    }

    const dice = options.rollDice?.() ?? rollDice();
    const rolledState = dispatchGameAction(state.value, {
      id: actionId(state.value, "roll"),
      type: "ROLL_DICE",
      dice,
    });
    const pendingMovement = rolledState.pendingMovement;

    if (
      pendingMovement?.cause !== "dice" ||
      pendingMovement.steps === undefined
    ) {
      throw new Error("Pergerakan dadu tidak tersedia setelah roll.");
    }

    const path = buildMovementPath(
      player.position,
      pendingMovement.steps,
      board.length,
    );
    const runId = ++animationRunId;
    state.value = rolledState;
    movementAnimation.value = createPawnMovementAnimation(
      player.id,
      path,
      prefersReducedMotion() ? 0 : hopDurationMs,
    );

    try {
      await nextTick();

      if (prefersReducedMotion()) {
        movementAnimation.value = {
          ...movementAnimation.value,
          currentTile: path.at(-1) ?? player.position,
          currentStep: pendingMovement.steps,
          isFinalHop: true,
        };
      } else {
        for (let step = 1; step < path.length; step += 1) {
          if (runId !== animationRunId || !movementAnimation.value) {
            return;
          }

          movementAnimation.value = {
            ...movementAnimation.value,
            currentTile: path[step],
            currentStep: step,
            isFinalHop: step === path.length - 1,
          };
          await delay(hopDurationMs);
        }
      }

      if (runId === animationRunId && state.value?.phase === "moving") {
        state.value = resolvePendingMovement(state.value);
      }
    } catch (error) {
      if (state.value?.phase === "moving") {
        state.value = resolvePendingMovement(state.value);
      }
      throw error;
    } finally {
      if (runId === animationRunId) {
        movementAnimation.value = null;
      }
    }
  }

  function cancelMovementAnimation() {
    animationRunId += 1;
    if (animationTimer) {
      clearTimeout(animationTimer);
      animationTimer = null;
    }
    resolveAnimationTimer?.();
    resolveAnimationTimer = null;
    movementAnimation.value = null;

    if (state.value?.phase === "moving") {
      state.value = resolvePendingMovement(state.value);
    }
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

  if (getCurrentScope()) {
    onScopeDispose(cancelMovementAnimation);
  }

  return {
    state,
    currentPlayer,
    movementAnimation,
    isAnimatingMovement,
    startGame,
    throwDice,
    cancelMovementAnimation,
    finishTurn,
    finishPrisonTurn,
  };
}

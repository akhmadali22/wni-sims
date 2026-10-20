import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

import { board } from "../../data/board";
import { START_SALARY } from "../../engine/GameEngine";
import { useGame } from "../useGame";

afterEach(() => {
  vi.useRealTimers();
});

describe("animated roll orchestration", () => {
  it("menampilkan tepat tujuh hop sebelum posisi authoritative berubah", async () => {
    vi.useFakeTimers();
    const game = useGame({
      rollDice: () => [3, 4],
      hopDurationMs: 20,
      prefersReducedMotion: () => false,
    });
    game.startGame(["Ali", "Budi"]);

    const movement = game.throwDice();
    expect(game.state.value?.phase).toBe("moving");
    expect(game.state.value?.players[0].position).toBe(0);
    expect(game.isAnimatingMovement.value).toBe(true);

    await nextTick();
    for (let step = 1; step <= 7; step += 1) {
      expect(game.movementAnimation.value?.currentStep).toBe(step);
      expect(game.movementAnimation.value?.currentTile).toBe(step);
      expect(game.state.value?.players[0].position).toBe(0);
      await vi.advanceTimersByTimeAsync(20);
    }
    await movement;

    expect(game.state.value?.players[0].position).toBe(7);
    expect(game.state.value?.phase).toBe("awaiting_end_turn");
    expect(game.movementAnimation.value).toBeNull();
    expect(game.isAnimatingMovement.value).toBe(false);
  });

  it("menolak roll kedua selama animasi dan membuka turn setelah selesai", async () => {
    vi.useFakeTimers();
    const game = useGame({
      rollDice: () => [1, 1],
      hopDurationMs: 20,
      prefersReducedMotion: () => false,
    });
    game.startGame(["Ali", "Budi"]);

    const movement = game.throwDice();
    await expect(game.throwDice()).rejects.toThrow(/tidak tersedia/);
    await vi.runAllTimersAsync();
    await movement;

    expect(
      game.state.value?.logs.filter((entry) =>
        entry.message.includes("dadu kembar"),
      ),
    ).toHaveLength(1);
    game.finishTurn();
    expect(game.state.value?.currentPlayerIndex).toBe(1);
    expect(game.state.value?.phase).toBe("awaiting_roll");
  });

  it("membayar salary tepat sekali setelah animasi melewati Start", async () => {
    vi.useFakeTimers();
    const game = useGame({
      rollDice: () => [2, 2],
      hopDurationMs: 20,
      prefersReducedMotion: () => false,
    });
    game.startGame(["Ali", "Budi"]);
    const initialCash = game.state.value?.players[0].cash ?? 0;
    if (!game.state.value) throw new Error("State test tidak tersedia.");
    game.state.value = {
      ...game.state.value,
      players: game.state.value.players.map((player, index) =>
        index === 0
          ? { ...player, position: board.length - 2 }
          : player,
      ),
    };

    const movement = game.throwDice();
    await nextTick();
    expect(game.movementAnimation.value?.path).toEqual([
      board.length - 2,
      board.length - 1,
      0,
      1,
      2,
    ]);
    expect(game.state.value.players[0].cash).toBe(initialCash);

    await vi.runAllTimersAsync();
    await movement;

    expect(game.state.value.players[0].position).toBe(2);
    expect(game.state.value.players[0].cash).toBe(
      initialCash + START_SALARY,
    );
    expect(
      game.state.value.transactions.filter(
        (transaction) => transaction.reason === "start_salary",
      ),
    ).toHaveLength(1);
  });

  it("reduced motion langsung sinkron ke tujuan authoritative", async () => {
    const game = useGame({
      rollDice: () => [5, 6],
      prefersReducedMotion: () => true,
    });
    game.startGame(["Ali", "Budi"]);

    await game.throwDice();

    expect(game.state.value?.players[0].position).toBe(11);
    expect(game.state.value?.phase).toBe("awaiting_end_turn");
    expect(game.movementAnimation.value).toBeNull();
  });

  it("pembatalan menyelesaikan movement dan tidak meninggalkan lock", async () => {
    vi.useFakeTimers();
    const game = useGame({
      rollDice: () => [6, 6],
      hopDurationMs: 20,
      prefersReducedMotion: () => false,
    });
    game.startGame(["Ali", "Budi"]);

    const movement = game.throwDice();
    await nextTick();
    game.cancelMovementAnimation();
    await movement;

    expect(game.movementAnimation.value).toBeNull();
    expect(game.state.value?.players[0].position).toBe(12);
    expect(game.state.value?.phase).toBe("awaiting_end_turn");
  });
});

import { describe, expect, it } from "vitest";

import {
  DEFAULT_INITIAL_CASH,
  MAX_PLAYERS,
  MIN_PLAYERS,
} from "../../config/game";
import { board } from "../../data/board";
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
    const state = createInitialState(["Ali", "Budi"]);

    expect(state.players).toHaveLength(2);
    expect(state.players[0].name).toBe("Ali");
    expect(state.players[0].cash).toBe(DEFAULT_INITIAL_CASH);
    expect(state.phase).toBe("awaiting_roll");
  });

  it("menerima batas jumlah pemain yang valid", () => {
    expect(() =>
      createInitialState(
        Array.from(
          { length: MIN_PLAYERS },
          (_, index) => `Pemain ${index + 1}`,
        ),
      ),
    ).not.toThrow();

    expect(() =>
      createInitialState(
        Array.from(
          { length: MAX_PLAYERS },
          (_, index) => `Pemain ${index + 1}`,
        ),
      ),
    ).not.toThrow();
  });

  it("menolak jumlah pemain di luar batas", () => {
    expect(() =>
      createInitialState(
        Array.from(
          { length: MIN_PLAYERS - 1 },
          (_, index) => `Pemain ${index + 1}`,
        ),
      ),
    ).toThrow();

    expect(() =>
      createInitialState(
        Array.from(
          { length: MAX_PLAYERS + 1 },
          (_, index) => `Pemain ${index + 1}`,
        ),
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
          ? { ...player, position: board.length - 2 }
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

  it("memberikan gaji ketika pemain berhenti tepat di Start", () => {
    const state = createInitialState(
      ["Ali", "Budi"],
      5_000_000,
    );

    const beforeStart = {
      ...state,
      players: state.players.map((player, index) =>
        index === 0
          ? { ...player, position: board.length - 1 }
          : player,
      ),
    };

    const nextState = movePlayer(
      beforeStart,
      "player-1",
      1,
    );

    expect(nextState.players[0].position).toBe(0);
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

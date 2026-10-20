import { describe, expect, it } from "vitest";

import { board } from "../../data/board";
import type { PropertyState } from "../../types/game";
import {
  applyFinancialTransaction,
  createInitialState,
  dispatchGameAction,
  endPrisonTurn,
  endTurn,
  getPlayerPropertyIds,
  START_SALARY,
} from "../GameEngine";

describe("runtime foundation", () => {
  it("membuat state serializable dengan ownership runtime tunggal", () => {
    const initial = createInitialState(["Ali", "Budi"]);
    const ownedProperty: PropertyState = {
      propertyId: "property-example",
      owner: { kind: "player", playerId: "player-1" },
      housingLevel: 0,
    };
    const state = {
      ...initial,
      propertyStates: { [ownedProperty.propertyId]: ownedProperty },
    };

    expect(JSON.parse(JSON.stringify(initial))).toEqual(initial);
    expect(initial.schemaVersion).toBe(1);
    expect(initial.revision).toBe(0);
    expect(initial.propertyStates).toEqual({});
    expect(getPlayerPropertyIds(state, "player-1")).toEqual([
      "property-example",
    ]);
    expect("propertyIds" in state.players[0]).toBe(false);
    expect(initial.country.id).toBe("state");
  });

  it("memvalidasi action dan menjalankan urutan fase eksplisit", () => {
    let state = createInitialState(["Ali", "Budi"]);

    expect(() =>
      dispatchGameAction(state, { id: "invalid-end", type: "END_TURN" }),
    ).toThrow();

    state = dispatchGameAction(state, {
      id: "roll-1",
      type: "ROLL_DICE",
      dice: [1, 2],
    });
    expect(state.phase).toBe("moving");
    expect(state.revision).toBe(1);

    expect(() =>
      dispatchGameAction(state, {
        id: "roll-1",
        type: "RESOLVE_MOVEMENT",
      }),
    ).toThrow(/sudah diproses/);

    state = dispatchGameAction(state, {
      id: "move-1",
      type: "RESOLVE_MOVEMENT",
    });
    expect(state.phase).toBe("resolving_start");

    state = dispatchGameAction(state, {
      id: "start-1",
      type: "ADVANCE_RESOLUTION",
    });
    expect(state.phase).toBe("resolving_housing");

    state = dispatchGameAction(state, {
      id: "housing-1",
      type: "ADVANCE_RESOLUTION",
    });
    expect(state.phase).toBe("resolving_destination");

    state = dispatchGameAction(state, {
      id: "destination-1",
      type: "ADVANCE_RESOLUTION",
    });
    expect(state.phase).toBe("awaiting_end_turn");
  });

  it("menempatkan resolusi Takdir setelah destination untuk dadu kembar", () => {
    let state = createInitialState(["Ali", "Budi"]);
    state = dispatchGameAction(state, {
      id: "double-roll",
      type: "ROLL_DICE",
      dice: [2, 2],
    });
    state = dispatchGameAction(state, {
      id: "double-move",
      type: "RESOLVE_MOVEMENT",
    });
    state = dispatchGameAction(state, {
      id: "double-start",
      type: "ADVANCE_RESOLUTION",
    });
    state = dispatchGameAction(state, {
      id: "double-housing",
      type: "ADVANCE_RESOLUTION",
    });
    state = dispatchGameAction(state, {
      id: "double-destination",
      type: "ADVANCE_RESOLUTION",
    });

    expect(state.phase).toBe("resolving_doubles_destiny");
    state = dispatchGameAction(state, {
      id: "double-destiny",
      type: "ADVANCE_RESOLUTION",
    });
    expect(state.phase).toBe("awaiting_end_turn");
  });

  it("mencatat lap individual dan membayar salary pada traversal", () => {
    const initial = createInitialState(["Ali", "Budi"]);
    let state = {
      ...initial,
      players: initial.players.map((player, index) =>
        index === 0
          ? { ...player, position: board.length - 1 }
          : player,
      ),
    };
    state = dispatchGameAction(state, {
      id: "lap-roll",
      type: "ROLL_DICE",
      dice: [1, 1],
    });
    state = dispatchGameAction(state, {
      id: "lap-move",
      type: "RESOLVE_MOVEMENT",
    });

    expect(state.players[0].position).toBe(1);
    expect(state.players[0].completedLaps).toBe(1);
    expect(state.players[0].cash).toBe(initial.players[0].cash + START_SALARY);
    expect(state.transactions.at(-1)?.reason).toBe("start_salary");
  });

  it("teleportasi tidak memberikan salary atau completed lap", () => {
    const initial = createInitialState(["Ali", "Budi"]);
    const cash = initial.players[0].cash;
    const state = dispatchGameAction(
      {
        ...initial,
        phase: "resolving_destination",
        players: initial.players.map((player, index) =>
          index === 0
            ? { ...player, position: board.length - 1 }
            : player,
        ),
      },
      {
        id: "toll-teleport",
        type: "TELEPORT_PLAYER",
        playerId: "player-1",
        destination: 2,
        source: "toll-example",
      },
    );

    expect(state.players[0].position).toBe(2);
    expect(state.players[0].completedLaps).toBe(0);
    expect(state.players[0].cash).toBe(cash);
    expect(state.transactions).toHaveLength(0);
  });

  it("mencatat transaksi dan menahan pembayaran yang tidak mencukupi", () => {
    const state = createInitialState(["Ali", "Budi"], 1_000);
    const applied = applyFinancialTransaction(state, {
      id: "payment-1",
      payerId: "player-1",
      payeeId: "player-2",
      amount: 400,
      reason: "test_payment",
      source: "test",
    });

    expect(applied.status).toBe("applied");
    expect(applied.state.players.map((player) => player.cash)).toEqual([
      600,
      1_400,
    ]);
    expect(applied.state.transactions).toHaveLength(1);

    const insufficient = applyFinancialTransaction(state, {
      id: "payment-2",
      payerId: "player-1",
      payeeId: "state",
      amount: 1_001,
      reason: "test_payment",
      source: "test",
    });

    expect(insufficient.status).toBe("insufficient_funds");
    expect(insufficient.state.players[0].cash).toBe(1_000);
    expect(insufficient.state.transactions).toHaveLength(0);
    expect(insufficient.state.pendingPayment?.shortfall).toBe(1);
    expect(insufficient.state.players[0].status).toBe("active");
    expect(() =>
      dispatchGameAction(
        insufficient.state,
        { id: "blocked-roll", type: "ROLL_DICE", dice: [1, 2] },
      ),
    ).toThrow(/harus diselesaikan/);
  });

  it("memberi prison turn dan hanya melewati pemain bangkrut", () => {
    const twoPlayers = createInitialState(["Ali", "Budi"]);
    const jailedState = endTurn({
      ...twoPlayers,
      phase: "awaiting_end_turn",
      players: twoPlayers.players.map((player, index) =>
        index === 1 ? { ...player, status: "jailed" as const } : player,
      ),
    });

    expect(jailedState.currentPlayerIndex).toBe(1);
    expect(jailedState.phase).toBe("awaiting_prison_turn");
    expect(endPrisonTurn(jailedState).currentPlayerIndex).toBe(0);

    const threePlayers = createInitialState(["Ali", "Budi", "Citra"]);
    const skipped = endTurn({
      ...threePlayers,
      phase: "awaiting_end_turn",
      players: threePlayers.players.map((player, index) =>
        index === 1 ? { ...player, status: "bankrupt" as const } : player,
      ),
    });
    expect(skipped.currentPlayerIndex).toBe(2);
    expect(skipped.phase).toBe("awaiting_roll");
  });

  it("menetapkan negara sebagai pemenang ketika semua pemain bangkrut", () => {
    const initial = createInitialState(["Ali", "Budi"]);
    const finished = dispatchGameAction(
      {
        ...initial,
        phase: "checking_game_over",
        players: initial.players.map((player) => ({
          ...player,
          status: "bankrupt" as const,
        })),
      },
      { id: "game-over-check", type: "ADVANCE_RESOLUTION" },
    );

    expect(finished.phase).toBe("finished");
    expect(finished.winnerId).toBe("state");
    expect(finished.endReason).toBe("all_players_bankrupt");
  });
});

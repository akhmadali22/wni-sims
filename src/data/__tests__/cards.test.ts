import { describe, expect, it } from "vitest";

import {
  destinyCardDataStatus,
  destinyCards,
  normalizeDestinyCardData,
} from "../destiny-cards";
import {
  disasterCardDataStatus,
  disasterCards,
  normalizeDisasterCardData,
} from "../disaster-cards";

describe("card data normalization", () => {
  it("menormalisasi 23 kartu Musibah tanpa mengaktifkan rulebook", () => {
    expect(disasterCards).toHaveLength(23);
    expect(new Set(disasterCards.map((card) => card.id)).size).toBe(23);
    expect(disasterCards[0].id).toBe("1");
    expect(disasterCards[0].title).toBe("Pungli di Jalan");
    expect(disasterCards[0].effects.light.recipient).toBe("state");
    expect(disasterCardDataStatus).toEqual({
      availability: "DATA_AVAILABLE",
      schema: "SCHEMA_VALIDATED",
      reference: "PENDING_RULEBOOK",
    });
  });

  it("menormalisasi 40 kartu Takdir tanpa mengaktifkan rulebook", () => {
    expect(destinyCards).toHaveLength(40);
    expect(new Set(destinyCards.map((card) => card.id)).size).toBe(40);
    expect(destinyCards[0].id).toBe("1");
    expect(destinyCards[0].title).toBe("Rezeki Nomplok");
    expect(destinyCardDataStatus.reference).toBe("PENDING_RULEBOOK");
  });

  it("menolak struktur dan jumlah kartu yang tidak valid", () => {
    expect(() => normalizeDisasterCardData({ cards: [] })).toThrow();
    expect(() => normalizeDestinyCardData([])).toThrow();
  });
});

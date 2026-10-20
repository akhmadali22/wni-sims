import rawDisasterData from "./disaster-cards.json";
import {
  asArray,
  asEnum,
  asId,
  asNonnegativeInteger,
  asNullableString,
  asRecord,
  asString,
  assertCardCollection,
} from "./card-schema";
import type { CardDataStatus } from "./card-schema";

export type DisasterSeverity = "light" | "medium" | "brutal";

const DISASTER_ACTIONS = [
  "pay",
  "lose_money",
  "pay_and_lose_turn",
  "seize_property",
  "move_and_lose_turn",
  "move_and_pay",
  "move_pay_and_lose_turn",
  "pay_and_transfer",
  "pay_player",
  "pay_each_player",
] as const;

const DISASTER_RECIPIENTS = [
  "bank",
  "state",
  "next_player",
  "richest_player",
  "player_with_least_money",
  "all_other_players",
] as const;

export type DisasterAction = (typeof DISASTER_ACTIONS)[number];
export type DisasterRecipient = (typeof DISASTER_RECIPIENTS)[number] | null;

export interface DisasterFallback {
  condition: string;
  action: DisasterAction;
  amount: number;
  recipient: DisasterRecipient;
}

export interface DisasterEffect {
  dice: number[];
  description: string;
  action: DisasterAction;
  amount: number;
  recipient: DisasterRecipient;
  destination: string | null;
  turnsLost: number;
  fallback: DisasterFallback | null;
}

export interface DisasterCard {
  id: string;
  title: string;
  effects: Record<DisasterSeverity, DisasterEffect>;
}

function normalizeRecipient(value: unknown, path: string): DisasterRecipient {
  if (value === null) {
    return null;
  }
  const recipient = value === "negara" ? "state" : value;
  return asEnum(recipient, DISASTER_RECIPIENTS, path);
}

function normalizeFallback(
  value: unknown,
  path: string,
): DisasterFallback | null {
  if (value === null) {
    return null;
  }
  const raw = asRecord(value, path);
  return {
    condition: asString(raw.condition, `${path}.condition`),
    action: asEnum(raw.action, DISASTER_ACTIONS, `${path}.action`),
    amount: asNonnegativeInteger(raw.amount, `${path}.amount`),
    recipient: normalizeRecipient(raw.recipient, `${path}.recipient`),
  };
}

function normalizeEffect(value: unknown, path: string): DisasterEffect {
  const raw = asRecord(value, path);
  const dice = asArray(raw.dice, `${path}.dice`).map((item, index) => {
    const die = asNonnegativeInteger(item, `${path}.dice[${index}]`);
    if (die < 1 || die > 6) {
      throw new Error(`${path}.dice[${index}] harus berada antara 1 dan 6.`);
    }
    return die;
  });
  return {
    dice,
    description: asString(raw.description, `${path}.description`),
    action: asEnum(raw.action, DISASTER_ACTIONS, `${path}.action`),
    amount: asNonnegativeInteger(raw.amount, `${path}.amount`),
    recipient: normalizeRecipient(raw.recipient, `${path}.recipient`),
    destination: asNullableString(raw.destination, `${path}.destination`),
    turnsLost: asNonnegativeInteger(raw.turns_lost, `${path}.turns_lost`),
    fallback: normalizeFallback(raw.fallback, `${path}.fallback`),
  };
}

function normalizeCard(value: unknown, index: number): DisasterCard {
  const path = `disaster.cards[${index}]`;
  const raw = asRecord(value, path);
  const effects = asRecord(raw.effects, `${path}.effects`);
  return {
    id: asId(raw.id, `${path}.id`),
    title: asString(raw.name, `${path}.name`),
    effects: {
      light: normalizeEffect(effects.ringan, `${path}.effects.ringan`),
      medium: normalizeEffect(effects.sedang, `${path}.effects.sedang`),
      brutal: normalizeEffect(effects.brutal, `${path}.effects.brutal`),
    },
  };
}

export function normalizeDisasterCardData(
  value: unknown,
  expectedCount = 23,
): DisasterCard[] {
  const rawRoot = asRecord(value, "disaster");
  const cards = asArray(rawRoot.cards, "disaster.cards").map(normalizeCard);
  assertCardCollection(cards, expectedCount, "Dataset Musibah");
  return cards;
}

export const disasterCards = normalizeDisasterCardData(rawDisasterData);

export const disasterCardDataStatus: CardDataStatus = {
  availability: "DATA_AVAILABLE",
  schema: "SCHEMA_VALIDATED",
  reference: "PENDING_RULEBOOK",
};

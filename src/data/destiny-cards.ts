import rawDestinyData from "./destiny-cards.json";
import {
  asArray,
  asBoolean,
  asEnum,
  asId,
  asNonnegativeInteger,
  asNullableString,
  asRecord,
  asString,
  assertCardCollection,
} from "./card-schema";
import type { CardDataStatus } from "./card-schema";

const DESTINY_TYPES = [
  "instant",
  "good",
  "bad",
  "conditional",
  "probability",
  "item",
] as const;
const DESTINY_TRIGGERS = [
  "on_draw",
  "on_disaster",
  "on_payment",
  "on_turn_start",
  "manual",
] as const;
const DESTINY_ACTIONS = [
  "none",
  "gain_money",
  "lose_money",
  "pay_player",
  "move_to",
  "lose_turn",
  "protect_from_disaster",
] as const;
const DESTINY_RECIPIENTS = [
  "bank",
  "state",
  "next_player",
  "richest_player",
  "player_with_least_money",
  "all_other_players",
] as const;
const CONDITION_OPERATORS = ["greater_than", "exists"] as const;
const CONDITION_SUBJECTS = [
  "property_count",
  "player_with_more_money",
] as const;

export type DestinyCardType = (typeof DESTINY_TYPES)[number];
export type DestinyTrigger = (typeof DESTINY_TRIGGERS)[number];
export type DestinyAction = (typeof DESTINY_ACTIONS)[number];
export type DestinyRecipient = (typeof DESTINY_RECIPIENTS)[number] | null;

export interface DestinyUsage {
  mode: "automatic" | "manual";
  consumable: boolean;
  charges: number | null;
}

export interface DestinyCondition {
  operator: (typeof CONDITION_OPERATORS)[number];
  subject: (typeof CONDITION_SUBJECTS)[number];
  value: number | null;
}

export interface DestinyActionEffect {
  kind: "action";
  action: DestinyAction;
  amount: number;
  recipient: DestinyRecipient;
  destination: string | null;
  turnsLost: number;
}

export interface DestinyConditionalEffect {
  kind: "conditional";
  condition: DestinyCondition;
  then: DestinyEffect;
  else: DestinyEffect | null;
}

export interface DestinyProbabilityEffect {
  kind: "probability";
  method: "dice_parity";
  even: DestinyEffect;
  odd: DestinyEffect;
}

export type DestinyEffect =
  | DestinyActionEffect
  | DestinyConditionalEffect
  | DestinyProbabilityEffect;

export interface DestinyCard {
  id: string;
  title: string;
  type: DestinyCardType;
  description: string;
  trigger: DestinyTrigger;
  usage: DestinyUsage | null;
  effect: DestinyEffect;
}

function normalizeRecipient(value: unknown, path: string): DestinyRecipient {
  if (value === null) {
    return null;
  }
  const recipient = value === "negara" ? "state" : value;
  return asEnum(recipient, DESTINY_RECIPIENTS, path);
}

function normalizeUsage(value: unknown, path: string): DestinyUsage | null {
  if (value === null) {
    return null;
  }
  const raw = asRecord(value, path);
  return {
    mode: asEnum(raw.mode, ["automatic", "manual"] as const, `${path}.mode`),
    consumable: asBoolean(raw.consumable, `${path}.consumable`),
    charges: raw.charges === null
      ? null
      : asNonnegativeInteger(raw.charges, `${path}.charges`),
  };
}

function normalizeCondition(value: unknown, path: string): DestinyCondition {
  const raw = asRecord(value, path);
  return {
    operator: asEnum(raw.operator, CONDITION_OPERATORS, `${path}.operator`),
    subject: asEnum(raw.subject, CONDITION_SUBJECTS, `${path}.subject`),
    value: raw.value === null
      ? null
      : asNonnegativeInteger(raw.value, `${path}.value`),
  };
}

function normalizeEffect(value: unknown, path: string): DestinyEffect {
  const raw = asRecord(value, path);
  const kind = asEnum(
    raw.kind,
    ["action", "conditional", "probability"] as const,
    `${path}.kind`,
  );

  if (kind === "action") {
    return {
      kind,
      action: asEnum(raw.action, DESTINY_ACTIONS, `${path}.action`),
      amount: asNonnegativeInteger(raw.amount, `${path}.amount`),
      recipient: normalizeRecipient(raw.recipient, `${path}.recipient`),
      destination: asNullableString(raw.destination, `${path}.destination`),
      turnsLost: asNonnegativeInteger(raw.turns_lost, `${path}.turns_lost`),
    };
  }

  if (kind === "conditional") {
    return {
      kind,
      condition: normalizeCondition(raw.condition, `${path}.condition`),
      then: normalizeEffect(raw.then, `${path}.then`),
      else: raw.else === null ? null : normalizeEffect(raw.else, `${path}.else`),
    };
  }

  return {
    kind,
    method: asEnum(raw.method, ["dice_parity"] as const, `${path}.method`),
    even: normalizeEffect(raw.even, `${path}.even`),
    odd: normalizeEffect(raw.odd, `${path}.odd`),
  };
}

function normalizeCard(value: unknown, index: number): DestinyCard {
  const path = `destiny[${index}]`;
  const raw = asRecord(value, path);
  return {
    id: asId(raw.id, `${path}.id`),
    title: asString(raw.title, `${path}.title`),
    type: asEnum(raw.type, DESTINY_TYPES, `${path}.type`),
    description: asString(raw.description, `${path}.description`),
    trigger: asEnum(raw.trigger, DESTINY_TRIGGERS, `${path}.trigger`),
    usage: normalizeUsage(raw.usage, `${path}.usage`),
    effect: normalizeEffect(raw.effect, `${path}.effect`),
  };
}

export function normalizeDestinyCardData(
  value: unknown,
  expectedCount = 40,
): DestinyCard[] {
  const cards = asArray(value, "destiny").map(normalizeCard);
  assertCardCollection(cards, expectedCount, "Dataset Takdir");
  return cards;
}

export const destinyCards = normalizeDestinyCardData(rawDestinyData);

export const destinyCardDataStatus: CardDataStatus = {
  availability: "DATA_AVAILABLE",
  schema: "SCHEMA_VALIDATED",
  reference: "PENDING_RULEBOOK",
};

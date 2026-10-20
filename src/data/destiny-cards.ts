export type DestinyCardType =
  | "instant"
  | "good"
  | "bad"
  | "conditional"
  | "probability"
  | "item";

export type DestinyTrigger =
  | "on_draw"
  | "on_disaster"
  | "on_payment"
  | "on_turn_start"
  | "manual";

export type DestinyAction =
  | "none"
  | "gain_money"
  | "lose_money"
  | "pay_player"
  | "move_to"
  | "lose_turn"
  | "protect_from_disaster";

export type DestinyRecipient =
  | "bank"
  | "negara"
  | "next_player"
  | "richest_player"
  | "player_with_least_money"
  | "all_other_players"
  | null;

export interface DestinyUsage {
  mode: "automatic" | "manual";
  consumable: boolean;
  charges: number | null;
}

export interface DestinyCondition {
  operator: "greater_than" | "exists";
  subject: "property_count" | "player_with_more_money";
  value: number | null;
}

export interface DestinyActionEffect {
  kind: "action";
  action: DestinyAction;
  amount: number;
  recipient: DestinyRecipient;
  destination: string | null;
  turns_lost: number;
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
  id: number;
  title: string;
  type: DestinyCardType;
  description: string;
  trigger: DestinyTrigger;
  usage: DestinyUsage | null;
  effect: DestinyEffect;
}

/**
 * Isi dengan teks kartu resmi setelah referensinya tersedia.
 */
export const destinyCards: DestinyCard[] = [];

export type DisasterSeverity = "light" | "medium" | "brutal";

export type DisasterAction =
  | "pay"
  | "lose_money"
  | "pay_and_lose_turn"
  | "seize_property"
  | "move_and_lose_turn"
  | "move_and_pay"
  | "move_pay_and_lose_turn"
  | "pay_and_transfer"
  | "pay_player"
  | "pay_each_player";

export type DisasterRecipient =
  | "bank"
  | "negara"
  | "next_player"
  | "richest_player"
  | "player_with_least_money"
  | "all_other_players"
  | null;

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
  turns_lost: number;
  fallback: DisasterFallback | null;
}

export interface DisasterCard {
  id: string;
  title: string;
  effects: Record<DisasterSeverity, DisasterEffect>;
  verified: boolean;
}

/**
 * Kartu musibah resmi.
 * Setiap kartu memiliki efek ringan, sedang, dan brutal.
 */
export const disasterCards: DisasterCard[] = [];
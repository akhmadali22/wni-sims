export type DisasterSeverity =
  | "light"
  | "medium"
  | "brutal";

export interface DisasterCard {
  id: string;
  title: string;
  description: string;
  severity?: DisasterSeverity;
  verified: boolean;
}

/**
 * Kartu musibah resmi belum dimasukkan.
 */
export const disasterCards: DisasterCard[] = [];

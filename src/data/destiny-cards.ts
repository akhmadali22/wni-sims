export type DestinyCardCategory =
  | "positive"
  | "negative"
  | "item"
  | "conditional";

export interface DestinyCard {
  id: string;
  title: string;
  description: string;
  category: DestinyCardCategory;
  requiresDice: boolean;
  verified: boolean;
}

/**
 * Isi dengan teks kartu resmi setelah referensinya tersedia.
 */
export const destinyCards: DestinyCard[] = [];

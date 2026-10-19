export interface PropertyDefinition {
  id: string;
  name: string;
  island: string;
  price: number;
  houseCost: number;
  rent: number[];
  verified: boolean;
}

/**
 * Data properti resmi belum dimasukkan karena harga dan tarif
 * harus diverifikasi dari kartu permainan asli.
 */
export const properties: PropertyDefinition[] = [];

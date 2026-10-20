export interface PropertyDefinition {
  id: string;
  name: string;
  island: string;

  /** Harga tanah untuk kota ini dalam rupiah. */
  price: number;

  /** Biaya bangunan berdasarkan tipe rumah. */
  buildingCost: {
    subsidy: number;
    okb: number;
  };

  /** Tarif sewa berdasarkan kondisi rumah. */
  rent: {
    empty: number;
    subsidy1: number;
    subsidy2: number;
    okb: number;
  };

  /** Apakah data sudah diverifikasi dengan sumber resmi. */
  verified: boolean;
}

/**
 * Data properti WNI Simulator.
 *
 * Harga dan tarif merupakan data simulasi berdasarkan
 * rasio yang ditentukan, bukan data resmi yang terverifikasi.
 */
export const properties: PropertyDefinition[] = [
  {
    id: "pontianak",
    name: "Pontianak",
    island: "Kalimantan",
    price: 2_000_000,
    buildingCost: {
      subsidy: 350_000,
      okb: 500_000,
    },
    rent: {
      empty: 500_000,
      subsidy1: 1_000_000,
      subsidy2: 1_800_000,
      okb: 3_000_000,
    },
    verified: false,
  },
];
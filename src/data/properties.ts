import propertyDataset from "./properties-data.json";

interface PropertyDatasetEntry {
  city: string;
  island: string;
  land_price: number;
  building_cost: {
    subsidy: number;
    okb: number;
  };
  rent: {
    empty: number;
    subsidy_1: number;
    subsidy_2: number;
    okb: number;
  };
}

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

function createPropertyId(city: string): string {
  return city
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Adapter tunggal dari dataset harga ke kontrak domain.
 * Nilai masih simulasi dan belum diverifikasi terhadap rulebook resmi.
 */
export const properties: PropertyDefinition[] = (
  propertyDataset as PropertyDatasetEntry[]
).map((property) => ({
  id: createPropertyId(property.city),
  name: property.city,
  island: property.island,
  price: property.land_price,
  buildingCost: {
    subsidy: property.building_cost.subsidy,
    okb: property.building_cost.okb,
  },
  rent: {
    empty: property.rent.empty,
    subsidy1: property.rent.subsidy_1,
    subsidy2: property.rent.subsidy_2,
    okb: property.rent.okb,
  },
  verified: false,
}));

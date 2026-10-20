export type CardDataAvailability = "DATA_AVAILABLE";
export type CardSchemaStatus = "SCHEMA_VALIDATED";
export type CardReferenceStatus =
  | "REFERENCE_CONFIRMED"
  | "PENDING_RULEBOOK";

export interface CardDataStatus {
  availability: CardDataAvailability;
  schema: CardSchemaStatus;
  reference: CardReferenceStatus;
}

export function asRecord(
  value: unknown,
  path: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${path} harus berupa object.`);
  }
  return value as Record<string, unknown>;
}

export function asArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${path} harus berupa array.`);
  }
  return value;
}

export function asString(value: unknown, path: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${path} harus berupa string yang tidak kosong.`);
  }
  return value;
}

export function asNullableString(
  value: unknown,
  path: string,
): string | null {
  return value === null ? null : asString(value, path);
}

export function asNonnegativeInteger(
  value: unknown,
  path: string,
): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    throw new Error(`${path} harus berupa bilangan bulat nonnegatif.`);
  }
  return Number(value);
}

export function asBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${path} harus berupa boolean.`);
  }
  return value;
}

export function asId(value: unknown, path: string): string {
  if (
    (typeof value !== "number" || !Number.isSafeInteger(value)) &&
    (typeof value !== "string" || !value.trim())
  ) {
    throw new Error(`${path} harus berupa ID angka atau string.`);
  }
  return String(value);
}

export function asEnum<const T extends readonly string[]>(
  value: unknown,
  values: T,
  path: string,
): T[number] {
  if (typeof value !== "string" || !values.includes(value)) {
    throw new Error(`${path} memiliki nilai yang tidak didukung: ${String(value)}.`);
  }
  return value as T[number];
}

export function assertCardCollection(
  cards: readonly { id: string }[],
  expectedCount: number,
  label: string,
): void {
  if (cards.length !== expectedCount) {
    throw new Error(
      `${label} harus berisi ${expectedCount} kartu; ditemukan ${cards.length}.`,
    );
  }
  if (new Set(cards.map((card) => card.id)).size !== cards.length) {
    throw new Error(`${label} memiliki ID duplikat.`);
  }
}

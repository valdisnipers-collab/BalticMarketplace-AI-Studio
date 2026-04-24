// server/utils/categories.ts
//
// Server-side mirror of src/constants/categories.ts for category ID ↔ label
// normalization. The DB stores canonical IDs after migration 007; the API
// accepts either form (legacy Latvian labels from older frontend builds, or
// canonical IDs from newer code) and always normalizes to canonical before
// hitting the DB.
//
// Why duplicate the frontend constants? server/ and src/ don't share a
// tsconfig path yet — a cross-boundary import would require reworking the
// build. Keeping a small mirror is the least invasive option.

export interface CategoryRecord {
  id: string;
  label_lv: string;
  label_en: string;
  label_ru: string;
}

export const CATEGORIES: readonly CategoryRecord[] = [
  { id: 'transport',      label_lv: 'Transports',              label_en: 'Transport',       label_ru: 'Транспорт' },
  { id: 'real_estate',    label_lv: 'Nekustamais īpašums',     label_en: 'Real Estate',     label_ru: 'Недвижимость' },
  { id: 'electronics',    label_lv: 'Elektronika',             label_en: 'Electronics',     label_ru: 'Электроника' },
  { id: 'jobs',           label_lv: 'Darbs un pakalpojumi',    label_en: 'Jobs & Services', label_ru: 'Работа и услуги' },
  { id: 'home_garden',    label_lv: 'Mājai un dārzam',         label_en: 'Home & Garden',   label_ru: 'Для дома и сада' },
  { id: 'fashion',        label_lv: 'Mode un stils',           label_en: 'Fashion & Style', label_ru: 'Мода и стиль' },
  { id: 'children',       label_lv: 'Bērniem',                 label_en: 'For Children',    label_ru: 'Детям' },
  { id: 'sports_leisure', label_lv: 'Sports un hobiji',        label_en: 'Sports & Hobbies', label_ru: 'Спорт и хобби' },
  { id: 'animals',        label_lv: 'Dzīvnieki',               label_en: 'Animals',         label_ru: 'Животные' },
  { id: 'services',       label_lv: 'Pakalpojumi',             label_en: 'Services',        label_ru: 'Услуги' },
  { id: 'food_agri',      label_lv: 'Pārtika un lauksaimniecība', label_en: 'Food & Agriculture', label_ru: 'Еда и сельское хозяйство' },
  { id: 'other',          label_lv: 'Cits',                    label_en: 'Other',           label_ru: 'Прочее' },
];

const BY_ID: Record<string, CategoryRecord> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
);
const BY_LABEL_LV: Record<string, CategoryRecord> = Object.fromEntries(
  CATEGORIES.map((c) => [c.label_lv, c]),
);

/**
 * Normalize any category value (canonical id or Latvian label) to the
 * canonical id. Returns the input unchanged when it doesn't match a known
 * category, so unusual custom strings don't disappear silently.
 */
export function normalizeCategory(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (BY_ID[value]) return value;
  if (BY_LABEL_LV[value]) return BY_LABEL_LV[value].id;
  return value;
}

/**
 * Translate a canonical id back to a Latvian label, used when responding
 * to a legacy frontend that still displays labels directly. Unknown ids
 * round-trip unchanged.
 */
export function toLatvianLabel(id: string | null | undefined): string | null {
  if (id === null || id === undefined || id === '') return null;
  if (BY_ID[id]) return BY_ID[id].label_lv;
  return id;
}

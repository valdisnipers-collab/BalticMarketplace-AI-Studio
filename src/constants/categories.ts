// src/constants/categories.ts
//
// Single source of truth for the canonical category taxonomy.
// - `id`     : stable machine identifier used in the DB and URLs
// - `label_*`: localized display names
// - `iconKey`: lookup key used by CategoryIcons components
//
// The legacy frontend still reads/writes Latvian labels as keys (via
// src/lib/categories.ts CATEGORY_SCHEMAS). Backend normalizes on the API
// boundary so both forms keep working during the transition.

export interface CategoryDef {
  id: string;
  label_lv: string;
  label_en: string;
  label_ru: string;
  label_lt: string;
  label_ee: string;
  iconKey: string;
}

export const CATEGORIES: readonly CategoryDef[] = [
  { id: 'transport',      label_lv: 'Transports',              label_en: 'Transport',          label_ru: 'Транспорт',          label_lt: 'Transportas',        label_ee: 'Transport',         iconKey: 'transport' },
  { id: 'real_estate',    label_lv: 'Nekustamais īpašums',     label_en: 'Real Estate',        label_ru: 'Недвижимость',       label_lt: 'Nekilnojamasis turtas', label_ee: 'Kinnisvara',    iconKey: 'real-estate' },
  { id: 'electronics',    label_lv: 'Elektronika',             label_en: 'Electronics',        label_ru: 'Электроника',        label_lt: 'Elektronika',        label_ee: 'Elektroonika',      iconKey: 'electronics' },
  { id: 'jobs',           label_lv: 'Darbs un pakalpojumi',    label_en: 'Jobs & Services',    label_ru: 'Работа и услуги',    label_lt: 'Darbas ir paslaugos', label_ee: 'Töö ja teenused',  iconKey: 'jobs' },
  { id: 'home_garden',    label_lv: 'Mājai un dārzam',         label_en: 'Home & Garden',      label_ru: 'Для дома и сада',    label_lt: 'Namams ir sodui',    label_ee: 'Kodule ja aiale',   iconKey: 'home' },
  { id: 'fashion',        label_lv: 'Mode un stils',           label_en: 'Fashion & Style',    label_ru: 'Мода и стиль',       label_lt: 'Mada ir stilius',    label_ee: 'Mood ja stiil',     iconKey: 'fashion' },
  { id: 'children',       label_lv: 'Bērniem',                 label_en: 'For Children',       label_ru: 'Детям',              label_lt: 'Vaikams',            label_ee: 'Lastele',           iconKey: 'children' },
  { id: 'sports_leisure', label_lv: 'Sports un hobiji',        label_en: 'Sports & Hobbies',   label_ru: 'Спорт и хобби',      label_lt: 'Sportas ir hobiai',  label_ee: 'Sport ja hobid',    iconKey: 'sports' },
  { id: 'animals',        label_lv: 'Dzīvnieki',               label_en: 'Animals',            label_ru: 'Животные',           label_lt: 'Gyvūnai',            label_ee: 'Loomad',            iconKey: 'animals' },
  { id: 'services',       label_lv: 'Pakalpojumi',             label_en: 'Services',           label_ru: 'Услуги',             label_lt: 'Paslaugos',          label_ee: 'Teenused',          iconKey: 'services' },
  { id: 'food_agri',      label_lv: 'Pārtika un lauksaimniecība', label_en: 'Food & Agriculture', label_ru: 'Еда и сельское хозяйство', label_lt: 'Maistas ir žemės ūkis', label_ee: 'Toit ja põllumajandus', iconKey: 'food' },
  { id: 'other',          label_lv: 'Cits',                    label_en: 'Other',              label_ru: 'Прочее',             label_lt: 'Kita',               label_ee: 'Muu',               iconKey: 'other' },
];

export const CATEGORY_BY_ID: Record<string, CategoryDef> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
);

export const CATEGORY_BY_LABEL_LV: Record<string, CategoryDef> = Object.fromEntries(
  CATEGORIES.map((c) => [c.label_lv, c]),
);

export type CategoryId = (typeof CATEGORIES)[number]['id'];
export type Lang = 'lv' | 'en' | 'ru' | 'lt' | 'ee';

/** Return the canonical id for any known input (id or Latvian label). */
export function normalizeCategory(value: string | null | undefined): string | null {
  if (!value) return null;
  if (CATEGORY_BY_ID[value]) return value;
  if (CATEGORY_BY_LABEL_LV[value]) return CATEGORY_BY_LABEL_LV[value].id;
  return null;
}

/** Localized label for a canonical id (or return the original if unknown). */
export function getCategoryLabel(id: string, lang: Lang = 'lv'): string {
  const c = CATEGORY_BY_ID[id];
  if (!c) return id;
  const key = `label_${lang}` as keyof CategoryDef;
  return (c[key] as string) || c.label_lv;
}

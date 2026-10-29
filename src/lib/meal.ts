import type { Companion, MealMeta, MealType, NutritionalInfo, PlaceType, ScanHistoryItem } from './types';

// 餐別色：與 styles.css 的色票一致
export const MEAL_TYPES: { key: MealType; label: string; color: string }[] = [
  { key: 'breakfast', label: '早餐', color: '#D9733B' },
  { key: 'lunch', label: '午餐', color: '#D9A62E' },
  { key: 'dinner', label: '晚餐', color: '#3D5A80' },
  { key: 'snack', label: '點心', color: '#85577F' },
  { key: 'latenight', label: '宵夜', color: '#66756E' },
];

export const PLACE_TYPES: { key: PlaceType; label: string }[] = [
  { key: 'home', label: '家裡' },
  { key: 'restaurant', label: '餐廳' },
  { key: 'takeout', label: '外帶外送' },
  { key: 'office', label: '公司' },
  { key: 'school', label: '學校' },
  { key: 'other', label: '其他' },
];

export const COMPANIONS: { key: Companion; label: string }[] = [
  { key: 'alone', label: '自己' },
  { key: 'family', label: '家人' },
  { key: 'friends', label: '朋友' },
  { key: 'colleagues', label: '同事' },
];

export const mealInfo = (k: MealType) => MEAL_TYPES.find((m) => m.key === k) ?? MEAL_TYPES[0];
export const placeLabel = (k: PlaceType) => PLACE_TYPES.find((p) => p.key === k)?.label ?? '其他';
export const companionLabel = (k?: Companion) => COMPANIONS.find((c) => c.key === k)?.label;

export function guessMealType(d: Date): MealType {
  const h = d.getHours();
  if (h >= 5 && h < 10) return 'breakfast';
  if (h >= 10 && h < 14) return 'lunch';
  if (h >= 14 && h < 17) return 'snack';
  if (h >= 17 && h < 21) return 'dinner';
  return 'latenight';
}

export function defaultMeta(now = new Date()): MealMeta {
  return { eatenAt: now.toISOString(), mealType: guessMealType(now), placeType: 'home' };
}

/** ISO → <input type="datetime-local"> 需要的本地時間字串 */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function servingGrams(item: ScanHistoryItem): number {
  return item.meta.servingGrams ?? item.analysisResult.estimatedServingGrams ?? 100;
}

/** 這一份實際吃進去的量 */
export function intake(item: ScanHistoryItem): NutritionalInfo {
  const f = servingGrams(item) / 100;
  const n = item.analysisResult.nutritionalInfo;
  return {
    calories: n.calories * f,
    carbs: n.carbs * f,
    sugar: n.sugar * f,
    protein: n.protein * f,
    fat: n.fat * f,
    fiber: n.fiber * f,
    sodium: n.sodium * f,
  };
}

/** 分數顏色：門檻沿用原 App（≥8 綠、≥6 橘、其餘紅） */
export function scoreTone(score: number): 'good' | 'fair' | 'poor' {
  if (score >= 8) return 'good';
  if (score >= 6) return 'fair';
  return 'poor';
}

export const TONE_COLOR = { good: '#3A8460', fair: '#D9A62E', poor: '#CF5F3A' } as const;

export function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

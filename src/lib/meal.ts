import type { AnyItem, Companion, GiLoad, MealMeta, MealType, NutritionalInfo, PlaceType, Symptom } from './types';

// 餐別色：與 styles.css 的色票一致
export const MEAL_TYPES: { key: MealType; label: string; color: string }[] = [
  { key: 'breakfast', label: '早餐', color: '#E07A5F' },
  { key: 'lunch', label: '午餐', color: '#E9B949' },
  { key: 'dinner', label: '晚餐', color: '#6C9BC4' },
  { key: 'snack', label: '點心', color: '#A584A8' },
  { key: 'latenight', label: '宵夜', color: '#8D9488' },
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

export function servingGrams(item: AnyItem): number {
  return item.meta.servingGrams ?? item.analysisResult.estimatedServingGrams ?? 100;
}

/** 這一份實際吃進去的量（瘦瘦針模式會乘上吃完的比例） */
export function intake(item: AnyItem): NutritionalInfo {
  const f = (servingGrams(item) / 100) * (item.meta.ateRatio ?? 1);
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

export const TONE_COLOR = { good: '#5E9152', fair: '#DDA02B', poor: '#D9694A' } as const;

export function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ---------- 瘦瘦針模式 ----------

export const SYMPTOMS: { key: Symptom; label: string }[] = [
  { key: 'nausea', label: '噁心' },
  { key: 'bloating', label: '脹氣' },
  { key: 'reflux', label: '胃酸逆流' },
  { key: 'diarrhea', label: '腹瀉' },
  { key: 'constipation', label: '便秘' },
];
export const symptomLabel = (k: Symptom) => SYMPTOMS.find((s) => s.key === k)?.label ?? k;

export const ATE_RATIOS = [
  { value: 1, label: '全部' },
  { value: 0.75, label: '四分之三' },
  { value: 0.5, label: '一半' },
  { value: 0.25, label: '幾口' },
];
export const ateLabel = (v?: number) => ATE_RATIOS.find((r) => r.value === v)?.label;

export const HUNGER = ['不餓', '有點餓', '普通', '餓', '很餓'];

export const GI_LOAD: Record<GiLoad, { label: string; color: string }> = {
  low: { label: '低', color: '#5E9C84' },
  medium: { label: '中', color: '#E3A55B' },
  high: { label: '高', color: '#D9694A' },
};

import { MEAL_TYPES, PLACE_TYPES, dayKey, intake } from './meal';
import type { ScanHistoryItem } from './types';

// 參考值：衛福部國民飲食指標與中華民國糖尿病學會照護指引（個人目標以醫師建議為準）
export const REFERENCE = {
  sodium: 2400, // mg/日
  sugar: 50, // g/日（添加糖不超過總熱量 10%，以 2000 大卡計）
  fiber: 25, // g/日 下限
  bgBefore: [80, 130] as const,
  bgAfter: 160, // 餐後 2 小時上限
};

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const r1 = (n: number) => Math.round(n * 10) / 10;

export function inPeriod(items: ScanHistoryItem[], days: number | null): ScanHistoryItem[] {
  if (days == null) return items;
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - (days - 1));
  return items.filter((i) => new Date(i.meta.eatenAt) >= from);
}

export interface DayRow {
  key: string;
  label: string;
  calories: number;
  carbs: number;
  sugar: number;
  protein: number;
  fat: number;
  fiber: number;
  sodium: number;
  score: number;
  meals: number;
}

export function byDay(items: ScanHistoryItem[]): DayRow[] {
  const map = new Map<string, ScanHistoryItem[]>();
  for (const it of items) {
    const k = dayKey(new Date(it.meta.eatenAt));
    map.set(k, [...(map.get(k) ?? []), it]);
  }
  return [...map]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, list]) => {
      const sum = (f: (n: ReturnType<typeof intake>) => number) => list.reduce((s, i) => s + f(intake(i)), 0);
      const d = new Date(`${key}T00:00`);
      return {
        key,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        calories: Math.round(sum((n) => n.calories)),
        carbs: Math.round(sum((n) => n.carbs)),
        sugar: r1(sum((n) => n.sugar)),
        protein: Math.round(sum((n) => n.protein)),
        fat: Math.round(sum((n) => n.fat)),
        fiber: r1(sum((n) => n.fiber)),
        sodium: Math.round(sum((n) => n.sodium)),
        score: r1(avg(list.map((i) => i.analysisResult.sugarFriendlyScore))),
        meals: list.length,
      };
    });
}

export function summary(items: ScanHistoryItem[]) {
  const days = byDay(items);
  const bg = items.filter((i) => i.meta.bloodSugarAfter != null);
  return {
    meals: items.length,
    days: days.length,
    score: r1(avg(items.map((i) => i.analysisResult.sugarFriendlyScore))),
    kcalPerDay: Math.round(avg(days.map((d) => d.calories))),
    carbsPerDay: Math.round(avg(days.map((d) => d.carbs))),
    bgAfterAvg: bg.length ? Math.round(avg(bg.map((i) => i.meta.bloodSugarAfter!))) : null,
    bgInRange: bg.length ? Math.round((bg.filter((i) => i.meta.bloodSugarAfter! < REFERENCE.bgAfter).length / bg.length) * 100) : null,
  };
}

export function macroShare(items: ScanHistoryItem[]) {
  const t = items.reduce(
    (s, i) => {
      const n = intake(i);
      return { carbs: s.carbs + n.carbs * 4, protein: s.protein + n.protein * 4, fat: s.fat + n.fat * 9 };
    },
    { carbs: 0, protein: 0, fat: 0 },
  );
  const total = t.carbs + t.protein + t.fat || 1;
  return [
    { name: '碳水化合物', value: Math.round(t.carbs), pct: Math.round((t.carbs / total) * 100), color: '#E9B949' },
    { name: '蛋白質', value: Math.round(t.protein), pct: Math.round((t.protein / total) * 100), color: '#84B179' },
    { name: '脂肪', value: Math.round(t.fat), pct: Math.round((t.fat / total) * 100), color: '#6C9BC4' },
  ];
}

export function byMealType(items: ScanHistoryItem[]) {
  return MEAL_TYPES.map((m) => {
    const list = items.filter((i) => i.meta.mealType === m.key);
    return {
      name: m.label,
      color: m.color,
      count: list.length,
      carbs: Math.round(avg(list.map((i) => intake(i).carbs))),
      calories: Math.round(avg(list.map((i) => intake(i).calories))),
      score: r1(avg(list.map((i) => i.analysisResult.sugarFriendlyScore))),
    };
  }).filter((r) => r.count > 0);
}

export function byPlace(items: ScanHistoryItem[]) {
  return PLACE_TYPES.map((p) => {
    const list = items.filter((i) => i.meta.placeType === p.key);
    return {
      name: p.label,
      count: list.length,
      score: r1(avg(list.map((i) => i.analysisResult.sugarFriendlyScore))),
      carbs: Math.round(avg(list.map((i) => intake(i).carbs))),
      sodium: Math.round(avg(list.map((i) => intake(i).sodium))),
    };
  })
    .filter((r) => r.count > 0)
    .sort((a, b) => b.score - a.score);
}

export function byCategory(items: ScanHistoryItem[]) {
  const map = new Map<string, number>();
  for (const i of items) map.set(i.analysisResult.category, (map.get(i.analysisResult.category) ?? 0) + 1);
  return [...map].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

export function mealPoints(items: ScanHistoryItem[]) {
  return items.map((i) => {
    const d = new Date(i.meta.eatenAt);
    const n = intake(i);
    return {
      id: i.id,
      name: i.analysisResult.foodName,
      mealType: i.meta.mealType,
      time: d.getTime(),
      hour: r1(d.getHours() + d.getMinutes() / 60),
      score: i.analysisResult.sugarFriendlyScore,
      carbs: Math.round(n.carbs),
      before: i.meta.bloodSugarBefore,
      after: i.meta.bloodSugarAfter,
      rise: i.meta.bloodSugarBefore != null && i.meta.bloodSugarAfter != null ? i.meta.bloodSugarAfter - i.meta.bloodSugarBefore : undefined,
    };
  });
}

export function nutrientVsReference(items: ScanHistoryItem[]) {
  const days = byDay(items);
  const s = avg(days.map((d) => d.sugar));
  const na = avg(days.map((d) => d.sodium));
  const fb = avg(days.map((d) => d.fiber));
  return [
    { name: '糖', actual: r1(s), ref: REFERENCE.sugar, unit: '公克', pct: Math.round((s / REFERENCE.sugar) * 100), kind: 'limit' as const },
    { name: '鈉', actual: Math.round(na), ref: REFERENCE.sodium, unit: '毫克', pct: Math.round((na / REFERENCE.sodium) * 100), kind: 'limit' as const },
    { name: '膳食纖維', actual: r1(fb), ref: REFERENCE.fiber, unit: '公克', pct: Math.round((fb / REFERENCE.fiber) * 100), kind: 'goal' as const },
  ];
}

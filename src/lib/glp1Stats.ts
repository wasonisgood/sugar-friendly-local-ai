import { daysBetween, lastInjectionOn, latestWeight } from './body';
import { SYMPTOMS, dayKey, intake } from './meal';
import { avg, byDay, r1 } from './stats';
import type { BodyEntry, GiLoad, Glp1Item } from './types';

// 參考值：GLP-1 減重期間的常見營養建議（個人目標以醫師或營養師建議為準）
export const GLP1_REF = {
  proteinPerMeal: 25, // g
  proteinPerKg: 1.2, // g/kg/日
  proteinDefault: 70, // 沒有體重時的每日目標 g
  fiber: 25, // g/日
};

export const proteinGoal = (body: BodyEntry[]) => {
  const w = latestWeight(body);
  return w ? Math.round(w * GLP1_REF.proteinPerKg) : GLP1_REF.proteinDefault;
};

const hasSymptom = (i: Glp1Item) => (i.meta.symptoms?.length ?? 0) > 0;

export function weightRows(body: BodyEntry[], days: number | null) {
  let list = body;
  if (days != null) {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - (days - 1));
    const k = dayKey(from);
    list = body.filter((e) => e.date >= k);
  }
  return list.map((e) => {
    const d = new Date(`${e.date}T00:00`);
    return { key: e.date, label: `${d.getMonth() + 1}/${d.getDate()}`, weight: e.weightKg, injected: !!e.injected, dose: e.doseMg };
  });
}

export function glp1Summary(items: Glp1Item[], body: BodyEntry[], days: number | null) {
  const rows = byDay(items);
  const w = weightRows(body, days).filter((r) => r.weight != null);
  const goal = proteinGoal(body);
  return {
    meals: items.length,
    days: rows.length,
    score: r1(avg(items.map((i) => i.analysisResult.glp1Score))),
    kcalPerDay: Math.round(avg(rows.map((d) => d.calories))),
    proteinPerDay: Math.round(avg(rows.map((d) => d.protein))),
    proteinGoal: goal,
    proteinDays: rows.length ? Math.round((rows.filter((d) => d.protein >= goal * 0.9).length / rows.length) * 100) : 0,
    weightChange: w.length >= 2 ? r1(w[w.length - 1].weight! - w[0].weight!) : null,
    weightNow: w.length ? w[w.length - 1].weight! : latestWeight(body),
    symptomRate: items.length ? Math.round((items.filter(hasSymptom).length / items.length) * 100) : 0,
  };
}

/** 每日熱量與蛋白質，順便標出打針日 */
export function dailyWithShots(items: Glp1Item[], body: BodyEntry[]) {
  const shots = new Set(body.filter((e) => e.injected).map((e) => e.date));
  return byDay(items).map((r) => ({ ...r, injected: shots.has(r.key) }));
}

/** 每一餐的蛋白質 */
export function proteinPerMeal(items: Glp1Item[]) {
  return [...items]
    .sort((a, b) => a.meta.eatenAt.localeCompare(b.meta.eatenAt))
    .map((i) => {
      const d = new Date(i.meta.eatenAt);
      return {
        id: i.id,
        name: i.analysisResult.foodName,
        mealType: i.meta.mealType,
        time: d.getTime(),
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        protein: Math.round(intake(i).protein),
        ateRatio: i.meta.ateRatio ?? 1,
      };
    });
}

/** 打針後第幾天：食量、吃完比例、不適比例。看出藥效高峰與「吃不下」的日子 */
export function byShotDay(items: Glp1Item[], body: BodyEntry[]) {
  const days = new Map<string, Glp1Item[]>();
  for (const i of items) {
    const k = dayKey(new Date(i.meta.eatenAt));
    days.set(k, [...(days.get(k) ?? []), i]);
  }
  const buckets = Array.from({ length: 7 }, () => ({ kcal: [] as number[], protein: [] as number[], ate: [] as number[], meals: 0, sick: 0 }));
  for (const [k, list] of days) {
    const shot = lastInjectionOn(body, k);
    if (!shot) continue;
    const n = Math.min(6, daysBetween(shot.date, k));
    const b = buckets[n];
    b.kcal.push(list.reduce((s, i) => s + intake(i).calories, 0));
    b.protein.push(list.reduce((s, i) => s + intake(i).protein, 0));
    for (const i of list) {
      b.ate.push(i.meta.ateRatio ?? 1);
      b.meals++;
      if (hasSymptom(i)) b.sick++;
    }
  }
  return buckets
    .map((b, n) => ({
      name: n === 0 ? '打針當天' : n === 6 ? '第 6 天以上' : `第 ${n} 天`,
      kcal: Math.round(avg(b.kcal)),
      protein: Math.round(avg(b.protein)),
      ate: Math.round(avg(b.ate) * 100),
      sick: b.meals ? Math.round((b.sick / b.meals) * 100) : 0,
      days: b.kcal.length,
    }))
    .filter((r) => r.days > 0);
}

export function symptomCounts(items: Glp1Item[]) {
  return SYMPTOMS.map((s) => ({ name: s.label, count: items.filter((i) => i.meta.symptoms?.includes(s.key)).length })).filter((r) => r.count > 0);
}

/** 模型判斷的腸胃負擔，與實際有沒有不舒服對照 */
export function symptomByGiLoad(items: Glp1Item[]) {
  return (['low', 'medium', 'high'] as GiLoad[]).map((g) => {
    const list = items.filter((i) => i.analysisResult.giLoad === g);
    return { key: g, meals: list.length, rate: list.length ? Math.round((list.filter(hasSymptom).length / list.length) * 100) : 0 };
  });
}

/** 吃前多餓 vs 吃完多少 */
export function hungerVsAte(items: Glp1Item[]) {
  return [1, 2, 3, 4, 5]
    .map((h) => {
      const list = items.filter((i) => i.meta.hungerBefore === h);
      return { hunger: h, meals: list.length, ate: Math.round(avg(list.map((i) => i.meta.ateRatio ?? 1)) * 100), kcal: Math.round(avg(list.map((i) => intake(i).calories))) };
    })
    .filter((r) => r.meals > 0);
}

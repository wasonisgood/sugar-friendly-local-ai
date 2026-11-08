import { dayKey } from './meal';
import type { BodyEntry } from './types';

// 瘦瘦針模式的體重與打針紀錄，一天一筆
const BODY_KEY = 'sugar-friendly:glp1-body';

const byDateAsc = (a: BodyEntry, b: BodyEntry) => a.date.localeCompare(b.date);

export function loadBody(): BodyEntry[] {
  try {
    return (JSON.parse(localStorage.getItem(BODY_KEY) ?? '[]') as BodyEntry[]).sort(byDateAsc);
  } catch {
    return [];
  }
}

function persist(list: BodyEntry[]): BodyEntry[] {
  const clean = list.filter((e) => e.weightKg != null || e.injected).sort(byDateAsc);
  try {
    localStorage.setItem(BODY_KEY, JSON.stringify(clean));
  } catch {
    /* ignore */
  }
  return clean;
}

/** 更新某一天；真實紀錄會取代同一天的示範資料 */
export function upsertBody(date: string, patch: Partial<BodyEntry>): BodyEntry[] {
  const list = loadBody();
  const old = list.find((e) => e.date === date && !e.isSample);
  const next: BodyEntry = { ...old, ...patch, date, isSample: undefined };
  return persist([...list.filter((e) => e.date !== date), next]);
}

export function clearBody(): BodyEntry[] {
  return persist(loadBody().filter((e) => e.isSample));
}

/** 某天往前最近一次打針；沒有就回傳 undefined */
export function lastInjectionOn(body: BodyEntry[], date: string): BodyEntry | undefined {
  let found: BodyEntry | undefined;
  for (const e of body) {
    if (e.date > date) break;
    if (e.injected) found = e;
  }
  return found;
}

export const daysBetween = (from: string, to: string) =>
  Math.round((new Date(`${to}T00:00`).getTime() - new Date(`${from}T00:00`).getTime()) / 86400000);

export function latestWeight(body: BodyEntry[]): number | undefined {
  for (let i = body.length - 1; i >= 0; i--) if (body[i].weightKg != null) return body[i].weightKg;
  return undefined;
}

export function addSampleBody(): BodyEntry[] {
  const real = loadBody().filter((e) => !e.isSample);
  const realDates = new Set(real.map((e) => e.date));
  return persist([...real, ...buildSampleBody().filter((e) => !realDates.has(e.date))]);
}

export function removeSampleBody(): BodyEntry[] {
  return persist(loadBody().filter((e) => !e.isSample));
}

export const todayKey = () => dayKey(new Date());

/** 四週示範：每週同一天打針，體重緩慢下降 */
export function buildSampleBody(days = 28): BodyEntry[] {
  const out: BodyEntry[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let w = 78.6;
  for (let d = days - 1; d >= 0; d--) {
    const at = new Date(today);
    at.setDate(at.getDate() - d);
    const injected = d % 7 === 3;
    w -= 0.09 + Math.sin(d * 1.7) * 0.12;
    out.push({
      date: dayKey(at),
      weightKg: d % 3 === 1 ? undefined : Math.round(w * 10) / 10,
      injected: injected || undefined,
      doseMg: injected ? (d > 14 ? 2.5 : 5) : undefined,
      isSample: true,
    });
  }
  return out;
}

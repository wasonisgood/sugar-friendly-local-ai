import { buildSampleRecords } from './sample';
import type { FoodAnalysisResult, MealMeta, ScanHistoryItem } from './types';

const STORAGE_KEY = 'sugar-friendly:scan-history';
const MAX_ITEMS = 300;

type LegacyItem = Omit<ScanHistoryItem, 'meta'> & { meta?: MealMeta; notes?: string };

// 第一版的紀錄沒有 meta，補上預設值
function migrate(raw: LegacyItem): ScanHistoryItem {
  if (raw.meta) return raw as ScanHistoryItem;
  const { notes, ...rest } = raw;
  return { ...rest, meta: { eatenAt: raw.timestamp, mealType: 'lunch', placeType: 'other', notes } };
}

const byEatenAtDesc = (a: ScanHistoryItem, b: ScanHistoryItem) => b.meta.eatenAt.localeCompare(a.meta.eatenAt);

export function loadHistory(): ScanHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LegacyItem[]).map(migrate).sort(byEatenAtDesc) : [];
  } catch {
    return [];
  }
}

function persist(items: ScanHistoryItem[]): ScanHistoryItem[] {
  let toSave = [...items].sort(byEatenAtDesc).slice(0, MAX_ITEMS);
  // 空間不足時先丟示範資料，再從最舊的開始丟
  while (toSave.length > 0) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      break;
    } catch {
      const sampleIdx = toSave.findLastIndex((i) => i.isSample);
      toSave = sampleIdx >= 0 ? toSave.filter((_, i) => i !== sampleIdx) : toSave.slice(0, -1);
    }
  }
  return toSave;
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function addHistory(
  thumbnail: string,
  analysisResult: FoodAnalysisResult,
  meta: MealMeta,
): { items: ScanHistoryItem[]; id: string } {
  const item: ScanHistoryItem = {
    id: newId(),
    thumbnail,
    analysisResult,
    timestamp: new Date().toISOString(),
    meta: { ...meta, notes: meta.notes?.trim() || undefined, placeName: meta.placeName?.trim() || undefined },
  };
  return { items: persist([item, ...loadHistory()]), id: item.id };
}

export function updateMeta(id: string, meta: MealMeta): ScanHistoryItem[] {
  return persist(loadHistory().map((i) => (i.id === id ? { ...i, meta } : i)));
}

export function removeHistory(id: string): ScanHistoryItem[] {
  return persist(loadHistory().filter((i) => i.id !== id));
}

export function clearHistory(): ScanHistoryItem[] {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return [];
}

export function addSampleData(): ScanHistoryItem[] {
  const real = loadHistory().filter((i) => !i.isSample);
  return persist([...real, ...buildSampleRecords()]);
}

export function removeSampleData(): ScanHistoryItem[] {
  return persist(loadHistory().filter((i) => !i.isSample));
}

import type { FoodAnalysisResult, ScanHistoryItem } from './types';

const STORAGE_KEY = 'sugar-friendly:scan-history';
const MAX_ITEMS = 60;

export function loadHistory(): ScanHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ScanHistoryItem[]) : [];
  } catch {
    return [];
  }
}

function persist(items: ScanHistoryItem[]): ScanHistoryItem[] {
  let toSave = items.slice(0, MAX_ITEMS);
  // 空間不足時從最舊的開始丟
  while (toSave.length > 0) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      break;
    } catch {
      toSave = toSave.slice(0, -1);
    }
  }
  return toSave;
}

export function addHistory(
  thumbnail: string,
  analysisResult: FoodAnalysisResult,
  notes?: string,
  isSample = false,
): ScanHistoryItem[] {
  const item: ScanHistoryItem = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    thumbnail,
    analysisResult,
    timestamp: new Date().toISOString(),
    notes: notes?.trim() || undefined,
    isSample: isSample || undefined,
  };
  return persist([item, ...loadHistory()]);
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

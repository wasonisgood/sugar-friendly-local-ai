import type { Mode } from './modes';
import { buildSampleRecords } from './sample';
import { buildGlp1SampleRecords } from './sampleGlp1';
import type { AnyItem, BaseAnalysis, MealMeta, ScanHistoryItem } from './types';

const MAX_ITEMS = 300;

type LegacyItem = Omit<AnyItem, 'meta'> & { meta?: MealMeta; notes?: string };

// 第一版的紀錄沒有 meta，補上預設值
function migrate(raw: LegacyItem): AnyItem {
  if (raw.meta) return raw as AnyItem;
  const { notes, ...rest } = raw;
  return { ...rest, meta: { eatenAt: raw.timestamp, mealType: 'lunch', placeType: 'other', notes } };
}

const byEatenAtDesc = (a: AnyItem, b: AnyItem) => b.meta.eatenAt.localeCompare(a.meta.eatenAt);
const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** 每個模式一份獨立的紀錄，互不混雜 */
function makeStore<R extends BaseAnalysis>(key: string, buildSamples: () => ScanHistoryItem<R>[]) {
  type Item = ScanHistoryItem<R>;

  function load(): Item[] {
    try {
      const raw = localStorage.getItem(key);
      return raw ? ((JSON.parse(raw) as LegacyItem[]).map(migrate) as Item[]).sort(byEatenAtDesc) : [];
    } catch {
      return [];
    }
  }

  function persist(items: Item[]): Item[] {
    let toSave = [...items].sort(byEatenAtDesc).slice(0, MAX_ITEMS);
    // 空間不足時先丟示範資料，再從最舊的開始丟
    while (toSave.length > 0) {
      try {
        localStorage.setItem(key, JSON.stringify(toSave));
        break;
      } catch {
        const sampleIdx = toSave.findLastIndex((i) => i.isSample);
        toSave = sampleIdx >= 0 ? toSave.filter((_, i) => i !== sampleIdx) : toSave.slice(0, -1);
      }
    }
    return toSave;
  }

  return {
    load,
    add(thumbnail: string, analysisResult: R, meta: MealMeta): { items: Item[]; id: string } {
      const item: Item = {
        id: newId(),
        thumbnail,
        analysisResult,
        timestamp: new Date().toISOString(),
        meta: { ...meta, notes: meta.notes?.trim() || undefined, placeName: meta.placeName?.trim() || undefined },
      };
      return { items: persist([item, ...load()]), id: item.id };
    },
    updateMeta: (id: string, meta: MealMeta) => persist(load().map((i) => (i.id === id ? { ...i, meta } : i))),
    remove: (id: string) => persist(load().filter((i) => i.id !== id)),
    clear(): Item[] {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
      return [];
    },
    addSamples: () => persist([...load().filter((i) => !i.isSample), ...buildSamples()]),
    removeSamples: () => persist(load().filter((i) => !i.isSample)),
  };
}

export const sugarStore = makeStore('sugar-friendly:scan-history', buildSampleRecords);
export const glp1Store = makeStore('sugar-friendly:glp1-history', buildGlp1SampleRecords);

export const storeFor = (mode: Mode) => (mode === 'glp1' ? glp1Store : sugarStore);

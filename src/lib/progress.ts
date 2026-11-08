// 從模型串流中的 JSON 片段推測目前進度。
// 欄位順序依 localModel.ts 的 schema：foodName → nutritionalInfo → recommendations / 建議 …

import type { Mode } from './modes';

export const STEPS: Record<Mode, readonly string[]> = {
  sugar: ['看照片', '認出食物', '估算營養', '寫給糖友的建議'],
  glp1: ['看照片', '認出食物', '估算蛋白質與營養', '寫飲控建議'],
};

export interface StreamProgress {
  step: number; // 0..STEPS.length-1
  ratio: number; // 0..1
  foodName?: string;
}

const STATS_KEY = 'sugar-friendly:analysis-stats';
const DEFAULT_STATS = { ms: 30000, firstMs: 9000, chars: 700 };

export type AnalysisStats = typeof DEFAULT_STATS;

// 瘦瘦針模式多三個文字欄位，輸出比較長，分開統計
const statsKey = (mode: Mode) => (mode === 'sugar' ? STATS_KEY : `${STATS_KEY}:${mode}`);

/** 以最近幾次辨識的平均值估計這次要多久 */
export function loadStats(mode: Mode): AnalysisStats {
  try {
    const runs = JSON.parse(localStorage.getItem(statsKey(mode)) ?? '[]') as AnalysisStats[];
    if (!runs.length) return mode === 'sugar' ? DEFAULT_STATS : { ...DEFAULT_STATS, ms: 36000, chars: 900 };
    const avg = (k: keyof AnalysisStats) => runs.reduce((s, r) => s + r[k], 0) / runs.length;
    return { ms: avg('ms'), firstMs: avg('firstMs'), chars: avg('chars') };
  } catch {
    return DEFAULT_STATS;
  }
}

export function saveStats(mode: Mode, run: AnalysisStats) {
  try {
    const runs = JSON.parse(localStorage.getItem(statsKey(mode)) ?? '[]') as AnalysisStats[];
    localStorage.setItem(statsKey(mode), JSON.stringify([run, ...runs].slice(0, 5)));
  } catch {
    /* ignore */
  }
}

export function readProgress(text: string, elapsedMs: number, stats: AnalysisStats): StreamProgress {
  if (!text) {
    // 還沒有任何輸出：模型正在處理影像，依過去經驗緩慢推進到 25%
    return { step: 0, ratio: 0.25 * Math.min(1, elapsedMs / stats.firstMs) * 0.95 };
  }
  const has = (k: string) => text.includes(`"${k}"`);
  let step = 1;
  if (has('nutritionalInfo')) step = 2;
  if (has('recommendations') || has('diabeticAdvice') || has('coachAdvice') || has('warnings')) step = 3;
  const name = text.match(/"foodName"\s*:\s*"([^"]*)("?)/);
  return {
    step,
    ratio: Math.min(0.97, 0.25 + 0.72 * Math.min(1, text.length / stats.chars)),
    foodName: name && name[1] ? name[1] + (name[2] ? '' : '…') : undefined,
  };
}

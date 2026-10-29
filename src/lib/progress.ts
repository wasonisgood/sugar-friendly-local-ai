// 從模型串流中的 JSON 片段推測目前進度。
// 欄位順序依 RESPONSE_SCHEMA：foodName → nutritionalInfo → recommendations / diabeticAdvice …

export const STEPS = ['看照片', '認出食物', '估算營養', '寫給糖友的建議'] as const;

export interface StreamProgress {
  step: number; // 0..STEPS.length-1
  ratio: number; // 0..1
  foodName?: string;
}

const STATS_KEY = 'sugar-friendly:analysis-stats';
const DEFAULT_STATS = { ms: 30000, firstMs: 9000, chars: 700 };

export type AnalysisStats = typeof DEFAULT_STATS;

/** 以最近幾次辨識的平均值估計這次要多久 */
export function loadStats(): AnalysisStats {
  try {
    const runs = JSON.parse(localStorage.getItem(STATS_KEY) ?? '[]') as AnalysisStats[];
    if (!runs.length) return DEFAULT_STATS;
    const avg = (k: keyof AnalysisStats) => runs.reduce((s, r) => s + r[k], 0) / runs.length;
    return { ms: avg('ms'), firstMs: avg('firstMs'), chars: avg('chars') };
  } catch {
    return DEFAULT_STATS;
  }
}

export function saveStats(run: AnalysisStats) {
  try {
    const runs = JSON.parse(localStorage.getItem(STATS_KEY) ?? '[]') as AnalysisStats[];
    localStorage.setItem(STATS_KEY, JSON.stringify([run, ...runs].slice(0, 5)));
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
  if (has('recommendations') || has('diabeticAdvice') || has('warnings')) step = 3;
  const name = text.match(/"foodName"\s*:\s*"([^"]*)("?)/);
  return {
    step,
    ratio: Math.min(0.97, 0.25 + 0.72 * Math.min(1, text.length / stats.chars)),
    foodName: name && name[1] ? name[1] + (name[2] ? '' : '…') : undefined,
  };
}

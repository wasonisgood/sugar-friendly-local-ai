import { useEffect, useRef, useState } from 'react';
import { STEPS, readProgress, type AnalysisStats } from '../lib/progress';
import { isEdge } from '../lib/localModel';
import type { Mode } from '../lib/modes';
import Mascot from './Mascot';
import SurfGame from './SurfGame';

function useElapsed(since: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, []);
  return Math.max(0, now - since);
}

const sec = (ms: number) => Math.max(1, Math.round(ms / 1000));

function fmtLeft(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return '快好了';
  const s = Math.round(ms / 1000);
  if (s < 60) return `大約還要 ${s} 秒`;
  return `大約還要 ${Math.ceil(s / 60)} 分鐘`;
}

/** 辨識中：吉祥物拿放大鏡＋四個步驟＋進度條 */
export function AnalyzingCard({
  mode,
  text,
  startedAt,
  stats,
  onCancel,
}: {
  mode: Mode;
  text: string;
  startedAt: number;
  stats: AnalysisStats;
  onCancel: () => void;
}) {
  const elapsed = useElapsed(startedAt);
  const p = readProgress(text, elapsed, stats);
  const left = Math.max(0, stats.ms - elapsed);

  return (
    <div className="analyzing">
    <div className="loading" role="status" aria-live="polite">
      <Mascot mode="scan" />
      <div className="loading-body">
        <p className="loading-title">
          {p.step === 0 ? '小葉子正在仔細看這張照片' : p.foodName ? <>看起來是 <b>{p.foodName}</b></> : '認出來了，正在整理'}
        </p>
        <div className="bar" aria-label={`進度 ${Math.round(p.ratio * 100)}%`}>
          <span style={{ width: `${p.ratio * 100}%` }} />
        </div>
        <ol className="loading-steps">
          {STEPS[mode].map((s, i) => (
            <li key={s} className={i < p.step ? 'is-done' : i === p.step ? 'is-now' : undefined}>
              <i aria-hidden="true" />
              {s}
            </li>
          ))}
        </ol>
        <p className="loading-meta">
          已經過 {sec(elapsed)} 秒・{elapsed < stats.ms ? fmtLeft(left) : '這張比較複雜，再等一下'}
          <button type="button" className="link-btn" onClick={onCancel}>
            取消
          </button>
        </p>
      </div>
    </div>
    <SurfGame mode={mode} />
    </div>
  );
}

/** 下載模型：吉祥物等飯碗裝滿，依下載速率估算剩餘時間 */
export function DownloadCard({ ratio }: { ratio: number | null }) {
  const start = useRef<{ t: number; r: number } | null>(null);
  useElapsed(0); // 每半秒重繪，讓剩餘時間跟著更新
  const r = ratio ?? 0;
  if (!start.current && r > 0) start.current = { t: Date.now(), r };
  let eta = Infinity;
  if (start.current && r > start.current.r) {
    const spent = Date.now() - start.current.t;
    eta = (spent / (r - start.current.r)) * (1 - r);
  }

  return (
    <div className="loading" role="status" aria-live="polite">
      <Mascot mode="download" fill={r} />
      <div className="loading-body">
        <p className="loading-title">
          正在下載本機模型 <b className="num">{Math.round(r * 100)}%</b>
        </p>
        <div className="bar bar-rice">
          <span style={{ width: `${r * 100}%` }} />
        </div>
        <p className="loading-meta">
          模型約 2 GB，只需下載一次。{r > 0.01 ? fmtLeft(eta) : '正在連線⋯'}
          <br />
          詳細進度也能在 {isEdge() ? 'edge://on-device-internals' : 'chrome://on-device-internals'} 查看。
        </p>
      </div>
    </div>
  );
}

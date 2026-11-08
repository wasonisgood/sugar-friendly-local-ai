import { useMemo, useState, type ReactNode } from 'react';
import { TONE_COLOR, dayKey, mealInfo, scoreTone } from '../lib/meal';
import type { ModeProfile } from '../lib/modes';
import { byDay, inPeriod, type mealPoints } from '../lib/stats';
import type { AnyItem } from '../lib/types';
import PageHead from './PageHead';

// 兩種模式共用的圖表外框：期間切換、摘要列、可勾選的圖表清單

export function chartKit(p: ModeProfile) {
  const c = p.colors;
  return {
    C: {
      green: '#5E9152',
      orange: '#E9B949',
      red: '#D9694A',
      blue: '#6C9BC4',
      purple: '#A584A8',
      peach: '#F2A96E',
      main: c.main,
      mid: c.mid,
      deep: c.deep,
      soft: c.soft,
      grid: c.grid,
      axis: '#8C9686',
    },
    axis: { stroke: '#8C9686', fontSize: 12, tickLine: false, axisLine: { stroke: c.line } },
    tooltipStyle: {
      contentStyle: { borderRadius: 6, border: `1px solid ${c.line}`, boxShadow: '0 4px 14px rgba(60,80,50,.08)', background: '#FFFFFF', fontSize: 13 },
      labelStyle: { color: c.ink, fontWeight: 600 },
    },
  };
}

export const PERIODS = [
  { days: 7, label: '7 天' },
  { days: 30, label: '30 天' },
  { days: 90, label: '90 天' },
  { days: null, label: '全部' },
] as const;

export function NoData({ children = '這段期間沒有資料' }: { children?: ReactNode }) {
  return <div className="chart-empty">{children}</div>;
}

export interface ChartDef<Id extends string> {
  id: Id;
  title: string;
  desc: string;
}

function loadPref<Id extends string>(key: string, charts: ChartDef<Id>[], defaults: Id[]): Id[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (Array.isArray(v)) return v.filter((x) => charts.some((c) => c.id === x));
  } catch {
    /* ignore */
  }
  return defaults;
}

function savePref(key: string, v: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

export default function ChartBoard<Id extends string, T extends AnyItem>({
  items,
  charts,
  wide,
  defaults,
  prefKey,
  emptyText,
  onSample,
  strip,
  render,
}: {
  items: T[];
  charts: ChartDef<Id>[];
  wide: Set<Id>;
  defaults: Id[];
  prefKey: string;
  emptyText: string;
  onSample: (on: boolean) => void;
  strip: (data: T[], period: number | null) => ReactNode;
  render: (id: Id, data: T[], period: number | null) => ReactNode;
}) {
  const [period, setPeriod] = useState<number | null>(30);
  const [selected, setSelected] = useState<Id[]>(() => loadPref(prefKey, charts, defaults));
  const [picking, setPicking] = useState(false);

  const data = useMemo(() => inPeriod(items, period), [items, period]);

  const toggle = (id: Id) => {
    // 依 charts 的順序排列，不依點選順序
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : charts.map((c) => c.id).filter((x) => x === id || selected.includes(x));
    setSelected(next);
    savePref(prefKey, next);
  };

  if (items.length === 0) {
    return (
      <>
        <PageHead eyebrow="健康圖表" title="還沒有資料可以畫" />
        <div className="blank">
          <p>{emptyText}</p>
          <p>也可以先放入四週的示範資料看看。</p>
          <button type="button" className="btn btn-quiet" onClick={() => onSample(true)}>
            放入示範資料
          </button>
        </div>
      </>
    );
  }

  const shown = charts.filter((c) => selected.includes(c.id));

  return (
    <>
      <PageHead
        eyebrow="健康圖表"
        title={period ? `最近 ${period} 天` : '全部紀錄'}
        aside={
          <div className="tabs" role="tablist" aria-label="期間">
            {PERIODS.map((p) => (
              <button key={p.label} type="button" role="tab" aria-selected={period === p.days} className="tab" onClick={() => setPeriod(p.days)}>
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      {strip(data, period)}

      <div className="charts-layout">
        <aside className="picker">
          <button type="button" className="picker-toggle" aria-expanded={picking} onClick={() => setPicking((v) => !v)}>
            顯示的圖表 <b>{selected.length}</b>／{charts.length}
          </button>
          <div className={`picker-body${picking ? ' is-open' : ''}`}>
            <ul className="picker-list">
              {charts.map((c) => (
                <li key={c.id}>
                  <label className="picker-item">
                    <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} />
                    <span>{c.title}</span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="picker-actions">
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  const all = charts.map((c) => c.id);
                  setSelected(all);
                  savePref(prefKey, all);
                }}
              >
                全部顯示
              </button>
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setSelected(defaults);
                  savePref(prefKey, defaults);
                }}
              >
                恢復預設
              </button>
            </div>
          </div>
        </aside>

        <div className="chart-flow">
          {data.length === 0 && <NoData>這段期間沒有紀錄，換個期間看看。</NoData>}
          {data.length > 0 &&
            shown.map((c, i) => (
              <section key={c.id} className={`chart${wide.has(c.id) ? ' chart-wide' : ''}`}>
                <header>
                  <span className="chart-no">{String(i + 1).padStart(2, '0')}</span>
                  <h2>{c.title}</h2>
                  <p>{c.desc}</p>
                </header>
                {render(c.id, data, period)}
              </section>
            ))}
          {data.length > 0 && shown.length === 0 && <NoData>左邊勾選想看的圖表。</NoData>}
        </div>
      </div>
    </>
  );
}

export function PointTip({
  active,
  payload,
  scoreLabel,
}: {
  active?: boolean;
  payload?: { payload: ReturnType<typeof mealPoints>[number] }[];
  scoreLabel: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const d = new Date(p.time);
  return (
    <div className="tip">
      <b>{p.name}</b>
      <span>
        {d.getMonth() + 1}/{d.getDate()} {d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })} · {mealInfo(p.mealType).label}
      </span>
      <span>
        {scoreLabel} {p.score} · 碳水 {p.carbs} 公克 · 蛋白質 {p.protein} 公克
      </span>
      {p.rise != null && <span>餐後上升 {p.rise} mg/dL</span>}
    </div>
  );
}

export function CalendarHeat({ items, extra }: { items: AnyItem[]; extra?: (key: string) => ReactNode }) {
  const rows = byDay(items);
  const map = new Map(rows.map((r) => [r.key, r]));
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 28 - start.getDay()); // 從四週前的週日開始，共五列
  const cells: { key: string; date: Date }[] = [];
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) cells.push({ key: dayKey(d), date: new Date(d) });

  return (
    <div className="heat">
      <div className="heat-week">
        {['日', '一', '二', '三', '四', '五', '六'].map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="heat-grid">
        {cells.map((c) => {
          const r = map.get(c.key);
          const color = r ? TONE_COLOR[scoreTone(r.score)] : undefined;
          return (
            <span
              key={c.key}
              className={`heat-cell${r ? '' : ' is-empty'}`}
              style={color ? { background: `color-mix(in srgb, ${color} ${Math.min(100, 35 + r!.meals * 15)}%, white)` } : undefined}
              title={r ? `${c.date.getMonth() + 1}/${c.date.getDate()}：平均 ${r.score} 分，${r.meals} 餐，${r.calories} 大卡` : `${c.date.getMonth() + 1}/${c.date.getDate()}：沒有紀錄`}
            >
              {c.date.getDate()}
              {extra?.(c.key)}
            </span>
          );
        })}
      </div>
      <div className="heat-legend small muted">
        <span>
          <i style={{ background: TONE_COLOR.good }} /> 8 分以上
        </span>
        <span>
          <i style={{ background: TONE_COLOR.fair }} /> 6–7 分
        </span>
        <span>
          <i style={{ background: TONE_COLOR.poor }} /> 6 分以下
        </span>
        <span>顏色越深代表記錄的餐數越多</span>
      </div>
    </div>
  );
}

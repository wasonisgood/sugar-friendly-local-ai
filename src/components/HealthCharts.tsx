import { useMemo, useState, type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { MEAL_TYPES, TONE_COLOR, dayKey, mealInfo, scoreTone } from '../lib/meal';
import {
  REFERENCE,
  byCategory,
  byDay,
  byMealType,
  byPlace,
  inPeriod,
  macroShare,
  mealPoints,
  nutrientVsReference,
  summary,
} from '../lib/stats';
import type { ScanHistoryItem } from '../lib/types';
import Icon from './Icon';

const C = {
  green: '#4CAF50',
  orange: '#FF9800',
  red: '#F44336',
  blue: '#2196F3',
  purple: '#9C27B0',
  grid: '#EEEEEE',
  axis: '#9E9E9E',
};

const axis = { stroke: C.axis, fontSize: 12, tickLine: false, axisLine: { stroke: '#E0E0E0' } };
const tooltipStyle = {
  contentStyle: { borderRadius: 8, border: '1px solid #E0E0E0', boxShadow: '0 2px 8px rgba(0,0,0,.08)', fontSize: 13 },
  labelStyle: { color: '#2C3E50', fontWeight: 600 },
};

type ChartId =
  | 'daily-intake'
  | 'score-trend'
  | 'macro'
  | 'meal-type'
  | 'time-of-day'
  | 'place'
  | 'blood-sugar'
  | 'carb-rise'
  | 'nutrient-ref'
  | 'calendar'
  | 'category';

const CHARTS: { id: ChartId; title: string; desc: string }[] = [
  { id: 'daily-intake', title: '每日熱量與碳水', desc: '長條是熱量，折線是碳水化合物' },
  { id: 'score-trend', title: '糖友善度趨勢', desc: '每天平均分數，綠色區間為 8 分以上' },
  { id: 'calendar', title: '飲食日曆', desc: '最近五週每天的平均糖友善度' },
  { id: 'macro', title: '三大營養素比例', desc: '依熱量計算碳水、蛋白質、脂肪的占比' },
  { id: 'meal-type', title: '各餐別比較', desc: '每一餐平均的碳水與糖友善度' },
  { id: 'time-of-day', title: '用餐時間分布', desc: '幾點吃、吃得友不友善，點越大碳水越多' },
  { id: 'place', title: '用餐地點比較', desc: '在哪裡吃比較容易吃得健康' },
  { id: 'blood-sugar', title: '餐前餐後血糖', desc: '有填血糖的餐次，灰色帶為餐前目標' },
  { id: 'carb-rise', title: '碳水與血糖上升', desc: '每一餐碳水量與餐後血糖上升幅度' },
  { id: 'nutrient-ref', title: '糖、鈉、纖維與每日建議量', desc: '每日平均攝取占建議量的百分比' },
  { id: 'category', title: '食物類別', desc: '各類食物出現的次數' },
];

const DEFAULT_CHARTS: ChartId[] = ['daily-intake', 'score-trend', 'calendar', 'macro', 'meal-type', 'blood-sugar'];
const PREF_KEY = 'sugar-friendly:charts';

const PERIODS = [
  { days: 7, label: '7 天' },
  { days: 30, label: '30 天' },
  { days: 90, label: '90 天' },
  { days: null, label: '全部' },
] as const;

function loadPref(): ChartId[] {
  try {
    const v = JSON.parse(localStorage.getItem(PREF_KEY) ?? 'null');
    if (Array.isArray(v)) return v.filter((x) => CHARTS.some((c) => c.id === x));
  } catch {
    /* ignore */
  }
  return DEFAULT_CHARTS;
}

function NoData({ children = '這段期間沒有資料' }: { children?: ReactNode }) {
  return <div className="chart-empty">{children}</div>;
}

export default function HealthCharts({ items, onSample }: { items: ScanHistoryItem[]; onSample: (on: boolean) => void }) {
  const [period, setPeriod] = useState<number | null>(30);
  const [selected, setSelected] = useState<ChartId[]>(loadPref);
  const [picking, setPicking] = useState(false);

  const data = useMemo(() => inPeriod(items, period), [items, period]);
  const s = useMemo(() => summary(data), [data]);

  const toggle = (id: ChartId) => {
    // 依 CHARTS 的順序排列，不依點選順序
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : CHARTS.map((c) => c.id).filter((x) => x === id || selected.includes(x));
    setSelected(next);
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  if (items.length === 0) {
    return (
      <div className="card empty">
        <Icon name="chart" size={36} />
        <h3>還沒有資料可以畫圖</h3>
        <p className="muted">記錄幾餐之後，這裡會出現熱量、碳水、血糖等圖表。也可以先載入四週的示範資料看看。</p>
        <button type="button" className="btn btn-outline" onClick={() => onSample(true)}>
          載入示範資料
        </button>
      </div>
    );
  }

  return (
    <div className="charts">
      <div className="charts-bar">
        <div className="tabs" role="tablist" aria-label="期間">
          {PERIODS.map((p) => (
            <button key={p.label} type="button" role="tab" aria-selected={period === p.days} className="tab" onClick={() => setPeriod(p.days)}>
              {p.label}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-outline btn-small" aria-expanded={picking} onClick={() => setPicking((v) => !v)}>
          <Icon name="chart" size={16} /> 選擇圖表（{selected.length}）
        </button>
      </div>

      {picking && (
        <div className="card picker">
          <div className="picker-head">
            <h3>要顯示哪些圖表</h3>
            <span className="picker-actions">
              <button type="button" className="btn-text" onClick={() => CHARTS.forEach((c) => !selected.includes(c.id) && toggle(c.id))}>
                全選
              </button>
              <button
                type="button"
                className="btn-text"
                onClick={() => {
                  setSelected(DEFAULT_CHARTS);
                  try {
                    localStorage.setItem(PREF_KEY, JSON.stringify(DEFAULT_CHARTS));
                  } catch {
                    /* ignore */
                  }
                }}
              >
                恢復預設
              </button>
            </span>
          </div>
          <ul className="picker-list">
            {CHARTS.map((c) => (
              <li key={c.id}>
                <label className="picker-item">
                  <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} />
                  <span>
                    <b>{c.title}</b>
                    <span className="muted small">{c.desc}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="tiles">
        <div className="tile">
          <span className="tile-label">記錄餐數</span>
          <span className="tile-value">{s.meals}</span>
          <span className="tile-sub">{s.days} 天有紀錄</span>
        </div>
        <div className="tile">
          <span className="tile-label">平均糖友善度</span>
          <span className="tile-value" style={{ color: TONE_COLOR[scoreTone(s.score)] }}>
            {s.score}
          </span>
          <span className="tile-sub">滿分 10</span>
        </div>
        <div className="tile">
          <span className="tile-label">每日熱量</span>
          <span className="tile-value">{s.kcalPerDay}</span>
          <span className="tile-sub">大卡（平均）</span>
        </div>
        <div className="tile">
          <span className="tile-label">每日碳水</span>
          <span className="tile-value">{s.carbsPerDay}</span>
          <span className="tile-sub">公克（平均）</span>
        </div>
        <div className="tile">
          <span className="tile-label">餐後血糖達標</span>
          <span className="tile-value">{s.bgInRange != null ? `${s.bgInRange}%` : '—'}</span>
          <span className="tile-sub">{s.bgAfterAvg != null ? `平均 ${s.bgAfterAvg} mg/dL` : '尚未填寫血糖'}</span>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="card">
          <NoData>這段期間沒有紀錄，換個期間看看。</NoData>
        </div>
      ) : (
        <div className="chart-grid">
          {selected.map((id) => {
            const meta = CHARTS.find((c) => c.id === id)!;
            return (
              <section key={id} className={`card chart${id === 'daily-intake' || id === 'blood-sugar' ? ' chart-wide' : ''}`}>
                <header>
                  <h3>{meta.title}</h3>
                  <p className="muted small">{meta.desc}</p>
                </header>
                <ChartBody id={id} items={data} />
              </section>
            );
          })}
          {selected.length === 0 && (
            <div className="card">
              <NoData>
                目前沒有選任何圖表。
                <button type="button" className="btn-text" onClick={() => setPicking(true)}>
                  選擇圖表
                </button>
              </NoData>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChartBody({ id, items }: { id: ChartId; items: ScanHistoryItem[] }) {
  switch (id) {
    case 'daily-intake': {
      const rows = byDay(items);
      return (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="label" {...axis} minTickGap={12} />
            <YAxis yAxisId="kcal" {...axis} />
            <YAxis yAxisId="g" orientation="right" {...axis} />
            <Tooltip {...tooltipStyle} formatter={(v, n) => [`${v} ${n === '熱量' ? '大卡' : '公克'}`, n]} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
            <Bar yAxisId="kcal" dataKey="calories" name="熱量" fill="#A5D6A7" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Line yAxisId="g" dataKey="carbs" name="碳水" stroke={C.orange} strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      );
    }

    case 'score-trend': {
      const rows = byDay(items);
      return (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={rows} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <ReferenceArea y1={8} y2={10} fill={C.green} fillOpacity={0.08} />
            <XAxis dataKey="label" {...axis} minTickGap={12} />
            <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} {...axis} />
            <Tooltip {...tooltipStyle} formatter={(v) => [`${v} 分`, '平均糖友善度']} />
            <Line dataKey="score" stroke={C.green} strokeWidth={2} dot={(p) => {
              const { cx, cy, payload, index } = p as { cx: number; cy: number; payload: { score: number }; index: number };
              return <circle key={index} cx={cx} cy={cy} r={3.5} fill="#fff" stroke={TONE_COLOR[scoreTone(payload.score)]} strokeWidth={2} />;
            }} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    case 'calendar':
      return <CalendarHeat items={items} />;

    case 'macro': {
      const rows = macroShare(items);
      return (
        <div className="donut">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={rows} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={2} stroke="none">
                {rows.map((r) => (
                  <Cell key={r.name} fill={r.color} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} formatter={(v, n) => [`${v} 大卡`, n]} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="legend-list">
            {rows.map((r) => (
              <li key={r.name}>
                <span className="dot" style={{ background: r.color }} />
                {r.name}
                <b>{r.pct}%</b>
              </li>
            ))}
            <li className="muted small">糖友碳水占比通常建議在 45% 左右，實際依醫師或營養師建議</li>
          </ul>
        </div>
      );
    }

    case 'meal-type': {
      const rows = byMealType(items);
      return (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="name" {...axis} />
            <YAxis yAxisId="g" {...axis} />
            <YAxis yAxisId="s" orientation="right" domain={[0, 10]} {...axis} />
            <Tooltip {...tooltipStyle} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
            <Bar yAxisId="g" dataKey="carbs" name="平均碳水（公克）" radius={[4, 4, 0, 0]} maxBarSize={36}>
              {rows.map((r) => (
                <Cell key={r.name} fill={r.color} />
              ))}
            </Bar>
            <Bar yAxisId="s" dataKey="score" name="平均糖友善度" fill={C.green} fillOpacity={0.25} radius={[4, 4, 0, 0]} maxBarSize={14} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case 'time-of-day': {
      const pts = mealPoints(items);
      return (
        <ResponsiveContainer width="100%" height={260}>
          <ScatterChart margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} />
            <XAxis type="number" dataKey="hour" name="時間" domain={[0, 24]} ticks={[0, 6, 9, 12, 15, 18, 21, 24]} tickFormatter={(h) => `${h}時`} {...axis} />
            <YAxis type="number" dataKey="score" name="糖友善度" domain={[0, 10]} {...axis} />
            <ZAxis type="number" dataKey="carbs" range={[30, 260]} name="碳水" />
            <Tooltip {...tooltipStyle} cursor={{ strokeDasharray: '3 3' }} content={<PointTip />} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
            {MEAL_TYPES.map((m) => (
              <Scatter key={m.key} name={m.label} data={pts.filter((p) => p.mealType === m.key)} fill={m.color} fillOpacity={0.75} />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      );
    }

    case 'place': {
      const rows = byPlace(items);
      return (
        <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 44)}>
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} horizontal={false} />
            <XAxis type="number" domain={[0, 10]} {...axis} />
            <YAxis type="category" dataKey="name" width={72} {...axis} />
            <Tooltip
              {...tooltipStyle}
              formatter={(v, _n, p) => [`${v} 分（${(p.payload as { count: number }).count} 餐，平均碳水 ${(p.payload as { carbs: number }).carbs} 公克）`, '糖友善度']}
            />
            <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={22} label={{ position: 'right', fontSize: 12, fill: '#555' }}>
              {rows.map((r) => (
                <Cell key={r.name} fill={TONE_COLOR[scoreTone(r.score)]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case 'blood-sugar': {
      const pts = mealPoints(items)
        .filter((p) => p.before != null || p.after != null)
        .sort((a, b) => a.time - b.time)
        .slice(-30)
        .map((p) => {
          const d = new Date(p.time);
          return { ...p, label: `${d.getMonth() + 1}/${d.getDate()} ${mealInfo(p.mealType).label}` };
        });
      if (pts.length === 0) return <NoData>還沒有填過血糖。辨識時或在紀錄裡按「修改用餐資訊」就能補填。</NoData>;
      return (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={pts} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <ReferenceArea y1={REFERENCE.bgBefore[0]} y2={REFERENCE.bgBefore[1]} fill="#9E9E9E" fillOpacity={0.1} />
            <ReferenceLine y={REFERENCE.bgAfter} stroke={C.red} strokeDasharray="4 4" label={{ value: `餐後上限 ${REFERENCE.bgAfter}`, position: 'insideTopRight', fontSize: 11, fill: C.red }} />
            <XAxis dataKey="label" {...axis} minTickGap={16} />
            <YAxis domain={[60, 'auto']} {...axis} />
            <Tooltip {...tooltipStyle} formatter={(v, n) => [`${v} mg/dL`, n]} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
            <Line dataKey="before" name="餐前" stroke={C.blue} strokeWidth={2} dot={{ r: 3 }} connectNulls />
            <Line dataKey="after" name="餐後 2 小時" stroke={C.orange} strokeWidth={2} dot={{ r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    case 'carb-rise': {
      const pts = mealPoints(items).filter((p) => p.rise != null);
      if (pts.length === 0) return <NoData>需要同時填餐前與餐後血糖的紀錄。</NoData>;
      return (
        <ResponsiveContainer width="100%" height={260}>
          <ScatterChart margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} />
            <XAxis type="number" dataKey="carbs" name="碳水" unit="g" {...axis} />
            <YAxis type="number" dataKey="rise" name="上升" {...axis} />
            <ReferenceLine y={50} stroke={C.orange} strokeDasharray="4 4" label={{ value: '上升 50', position: 'insideTopRight', fontSize: 11, fill: C.orange }} />
            <Tooltip {...tooltipStyle} content={<PointTip />} />
            <Scatter data={pts} fill={C.purple} fillOpacity={0.7} />
          </ScatterChart>
        </ResponsiveContainer>
      );
    }

    case 'nutrient-ref': {
      const rows = nutrientVsReference(items);
      return (
        <div className="ref-bars">
          {rows.map((r) => {
            const over = r.kind === 'limit' ? r.pct > 100 : r.pct < 100;
            const color = over ? (r.kind === 'limit' ? C.red : C.orange) : C.green;
            return (
              <div key={r.name} className="ref-row">
                <div className="ref-label">
                  <b>{r.name}</b>
                  <span className="muted small">
                    每日平均 {r.actual} {r.unit} / {r.kind === 'limit' ? '上限' : '建議至少'} {r.ref} {r.unit}
                  </span>
                </div>
                <div className="ref-track">
                  <span className="ref-fill" style={{ width: `${Math.min(r.pct, 150) / 1.5}%`, background: color }} />
                  <span className="ref-mark" style={{ left: `${100 / 1.5}%` }} />
                </div>
                <span className="ref-pct" style={{ color }}>
                  {r.pct}%
                </span>
              </div>
            );
          })}
          <p className="muted small">直線為 100%。糖以食物總糖量估算，會高於實際的添加糖。</p>
        </div>
      );
    }

    case 'category': {
      const rows = byCategory(items);
      const palette = [C.green, C.orange, C.blue, C.purple, '#FFC107', '#795548', '#607D8B'];
      return (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={rows} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="name" {...axis} />
            <YAxis allowDecimals={false} {...axis} />
            <Tooltip {...tooltipStyle} formatter={(v) => [`${v} 次`, '出現']} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {rows.map((r, i) => (
                <Cell key={r.name} fill={palette[i % palette.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }
  }
}

function PointTip({ active, payload }: { active?: boolean; payload?: { payload: ReturnType<typeof mealPoints>[number] }[] }) {
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
        糖友善度 {p.score} · 碳水 {p.carbs} 公克
      </span>
      {p.rise != null && <span>餐後上升 {p.rise} mg/dL</span>}
    </div>
  );
}

function CalendarHeat({ items }: { items: ScanHistoryItem[] }) {
  const rows = byDay(items);
  const map = new Map(rows.map((r) => [r.key, r]));
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 34 - start.getDay()); // 從週日開始，約五週
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

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
import {
  GLP1_REF,
  byShotDay,
  dailyWithShots,
  glp1Summary,
  hungerVsAte,
  proteinGoal,
  proteinPerMeal,
  symptomByGiLoad,
  symptomCounts,
  weightRows,
} from '../lib/glp1Stats';
import { GI_LOAD, HUNGER, MEAL_TYPES, TONE_COLOR, scoreTone } from '../lib/meal';
import { MODES } from '../lib/modes';
import { byCategory, byDay, byMealType, macroShare, mealPoints, nutrientVsReference } from '../lib/stats';
import type { BodyEntry, Glp1Item } from '../lib/types';
import ChartBoard, { CalendarHeat, NoData, PointTip, chartKit, type ChartDef } from './ChartBoard';

const { C, axis, tooltipStyle } = chartKit(MODES.glp1);
const GOOD = '#4E9479';

type ChartId =
  | 'daily-intake'
  | 'weight'
  | 'score-trend'
  | 'calendar'
  | 'protein-meal'
  | 'shot-day'
  | 'gi'
  | 'symptoms'
  | 'hunger'
  | 'macro'
  | 'meal-type'
  | 'time-of-day'
  | 'nutrient-ref'
  | 'category';

const CHARTS: ChartDef<ChartId>[] = [
  { id: 'daily-intake', title: '每日熱量與蛋白質', desc: '長條是熱量，折線是蛋白質，虛線為每日蛋白質目標' },
  { id: 'weight', title: '體重趨勢', desc: '直線標示打針日' },
  { id: 'protein-meal', title: '每餐蛋白質', desc: `最近 40 餐，虛線為每餐 ${GLP1_REF.proteinPerMeal} 公克` },
  { id: 'shot-day', title: '打針後的食量變化', desc: '依打針後第幾天，看每日熱量、吃完比例與不適比例' },
  { id: 'calendar', title: '飲食日曆', desc: '最近五週每天的平均飲控友善度，小點是打針日' },
  { id: 'gi', title: '腸胃負擔與不舒服', desc: '模型判斷的腸胃負擔，對照你實際記下的不適' },
  { id: 'score-trend', title: '飲控友善度趨勢', desc: '每天平均分數，淺色區間為 8 分以上' },
  { id: 'symptoms', title: '餐後不適', desc: '各種不適出現的次數' },
  { id: 'hunger', title: '飢餓感與吃完比例', desc: '吃之前多餓，最後吃完了多少' },
  { id: 'macro', title: '三大營養素比例', desc: '依熱量計算碳水、蛋白質、脂肪的占比' },
  { id: 'meal-type', title: '各餐別比較', desc: '每一餐平均的蛋白質與飲控友善度' },
  { id: 'nutrient-ref', title: '糖、鈉、纖維與每日建議量', desc: '纖維不夠容易便秘，是打針期間常見的問題' },
  { id: 'time-of-day', title: '用餐時間分布', desc: '幾點吃、吃得好不好，點越大蛋白質越多' },
  { id: 'category', title: '食物類別', desc: '各類食物出現的次數' },
];

const WIDE = new Set<ChartId>(['daily-intake', 'weight', 'shot-day', 'protein-meal']);
const DEFAULT_CHARTS: ChartId[] = ['daily-intake', 'weight', 'protein-meal', 'shot-day', 'calendar', 'gi'];

export default function Glp1Charts({ items, body, onSample }: { items: Glp1Item[]; body: BodyEntry[]; onSample: (on: boolean) => void }) {
  return (
    <ChartBoard
      items={items}
      charts={CHARTS}
      wide={WIDE}
      defaults={DEFAULT_CHARTS}
      prefKey="sugar-friendly:glp1-charts"
      emptyText="記錄幾餐、填上體重與打針日之後，這裡會畫出蛋白質、體重與打針後食量的變化。"
      onSample={onSample}
      strip={(data, period) => <Strip items={data} body={body} period={period} />}
      render={(id, data, period) => <ChartBody id={id} items={data} body={body} period={period} />}
    />
  );
}

function Strip({ items, body, period }: { items: Glp1Item[]; body: BodyEntry[]; period: number | null }) {
  const s = glp1Summary(items, body, period);
  return (
    <dl className="strip">
      <div>
        <dt>記錄</dt>
        <dd>
          {s.meals}
          <small>餐・{s.days} 天</small>
        </dd>
      </div>
      <div>
        <dt>平均飲控友善度</dt>
        <dd style={{ color: TONE_COLOR[scoreTone(s.score)] }}>
          {s.score}
          <small>/10</small>
        </dd>
      </div>
      <div>
        <dt>每日蛋白質</dt>
        <dd>
          {s.proteinPerDay}
          <small>／{s.proteinGoal} 克</small>
        </dd>
      </div>
      <div>
        <dt>體重變化</dt>
        <dd style={s.weightChange != null && s.weightChange < 0 ? { color: GOOD } : undefined}>
          {s.weightChange != null ? `${s.weightChange > 0 ? '+' : ''}${s.weightChange}` : '—'}
          <small>{s.weightChange != null ? `公斤・現在 ${s.weightNow}` : s.weightNow ? `現在 ${s.weightNow} 公斤` : '尚未填寫'}</small>
        </dd>
      </div>
      <div>
        <dt>餐後不適</dt>
        <dd>
          {s.symptomRate}
          <small>% 的餐</small>
        </dd>
      </div>
    </dl>
  );
}

const shotLines = (rows: { label: string; injected: boolean }[]) =>
  rows
    .filter((r) => r.injected)
    .map((r) => <ReferenceLine key={`shot-${r.label}`} x={r.label} stroke={C.peach} strokeDasharray="3 3" label={{ value: '打針', position: 'insideTop', fontSize: 11, fill: '#B5652A' }} />);

function ChartBody({ id, items, body, period }: { id: ChartId; items: Glp1Item[]; body: BodyEntry[]; period: number | null }) {
  switch (id) {
    case 'daily-intake': {
      const rows = dailyWithShots(items, body);
      const goal = proteinGoal(body);
      return (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="label" {...axis} minTickGap={12} />
            <YAxis yAxisId="kcal" {...axis} />
            <YAxis yAxisId="g" orientation="right" {...axis} />
            <Tooltip {...tooltipStyle} formatter={(v, n) => [`${v} ${n === '熱量' ? '大卡' : '公克'}`, n]} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
            <Bar yAxisId="kcal" dataKey="calories" name="熱量" fill={C.mid} radius={[4, 4, 0, 0]} maxBarSize={28}>
              {rows.map((r) => (
                <Cell key={r.key} fill={r.injected ? C.peach : C.mid} />
              ))}
            </Bar>
            <ReferenceLine yAxisId="g" y={goal} stroke={C.deep} strokeDasharray="4 4" label={{ value: `蛋白質目標 ${goal}`, position: 'insideTopRight', fontSize: 11, fill: C.deep }} />
            <Line yAxisId="g" dataKey="protein" name="蛋白質" stroke={C.deep} strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      );
    }

    case 'weight': {
      const rows = weightRows(body, period);
      if (!rows.some((r) => r.weight != null)) return <NoData>還沒有體重紀錄。在「記錄一餐」頁上方的身體紀錄填今天的體重。</NoData>;
      return (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={rows} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="label" {...axis} minTickGap={12} />
            <YAxis domain={['dataMin - 1', 'dataMax + 1']} tickFormatter={(v) => Number(v).toFixed(0)} {...axis} />
            <Tooltip
              {...tooltipStyle}
              formatter={(v) => [`${v} 公斤`, '體重']}
              labelFormatter={(l, p) => {
                const r = p?.[0]?.payload as { injected?: boolean; dose?: number } | undefined;
                return r?.injected ? `${l}・打針${r.dose ? ` ${r.dose} mg` : ''}` : l;
              }}
            />
            {shotLines(rows)}
            <Line dataKey="weight" name="體重" stroke={C.deep} strokeWidth={2.5} dot={{ r: 3, fill: '#fff' }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    case 'score-trend': {
      const rows = byDay(items);
      return (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={rows} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <ReferenceArea y1={8} y2={10} fill={C.main} fillOpacity={0.12} />
            <XAxis dataKey="label" {...axis} minTickGap={12} />
            <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} {...axis} />
            <Tooltip {...tooltipStyle} formatter={(v) => [`${v} 分`, '平均飲控友善度']} />
            <Line dataKey="score" stroke={C.deep} strokeWidth={2} dot={(p) => {
              const { cx, cy, payload, index } = p as { cx: number; cy: number; payload: { score: number }; index: number };
              return <circle key={index} cx={cx} cy={cy} r={3.5} fill="#fff" stroke={TONE_COLOR[scoreTone(payload.score)]} strokeWidth={2} />;
            }} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    case 'calendar': {
      const shots = new Set(body.filter((e) => e.injected).map((e) => e.date));
      return <CalendarHeat items={items} extra={(k) => (shots.has(k) ? <i className="heat-shot" title="打針" /> : null)} />;
    }

    case 'protein-meal': {
      const rows = proteinPerMeal(items).slice(-40);
      return (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={rows} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="label" {...axis} minTickGap={16} />
            <YAxis {...axis} />
            <Tooltip
              {...tooltipStyle}
              labelFormatter={(_l, p) => (p?.[0]?.payload as { name?: string } | undefined)?.name ?? ''}
              formatter={(v, _n, p) => {
                const ate = (p.payload as { ateRatio: number }).ateRatio;
                return [`${v} 公克${ate < 1 ? `（吃了 ${Math.round(ate * 100)}%）` : ''}`, '蛋白質'];
              }}
            />
            <ReferenceLine y={GLP1_REF.proteinPerMeal} stroke={C.deep} strokeDasharray="4 4" />
            <Bar dataKey="protein" radius={[3, 3, 0, 0]} maxBarSize={16}>
              {rows.map((r) => (
                <Cell key={r.id} fill={r.protein >= GLP1_REF.proteinPerMeal ? C.main : C.peach} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case 'shot-day': {
      const rows = byShotDay(items, body);
      if (rows.length === 0) return <NoData>還沒有打針紀錄。在「記錄一餐」頁上方勾選「今天打針」，就能看出打針後幾天食量的變化。</NoData>;
      return (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="name" {...axis} />
            <YAxis yAxisId="kcal" {...axis} />
            <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} unit="%" {...axis} />
            <Tooltip {...tooltipStyle} formatter={(v, n) => [n === '每日熱量' ? `${v} 大卡` : `${v}%`, n]} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
            <Bar yAxisId="kcal" dataKey="kcal" name="每日熱量" fill={C.mid} radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Line yAxisId="pct" dataKey="ate" name="平均吃完" stroke={C.deep} strokeWidth={2} dot={{ r: 3 }} />
            <Line yAxisId="pct" dataKey="sick" name="不適比例" stroke={C.red} strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      );
    }

    case 'gi': {
      const rows = symptomByGiLoad(items).map((r) => ({ ...r, name: `負擔${GI_LOAD[r.key].label}` }));
      if (!rows.some((r) => r.meals > 0)) return <NoData>這段期間沒有資料。</NoData>;
      return (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={rows} margin={{ top: 16, right: 8, left: -24, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="name" {...axis} />
            <YAxis domain={[0, 100]} unit="%" {...axis} />
            <Tooltip {...tooltipStyle} formatter={(v, _n, p) => [`${v}%（共 ${(p.payload as { meals: number }).meals} 餐）`, '吃完不舒服']} />
            <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={48} label={{ position: 'top', fontSize: 12, fill: '#55604F', formatter: (v: unknown) => `${v}%` }}>
              {rows.map((r) => (
                <Cell key={r.key} fill={GI_LOAD[r.key].color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case 'symptoms': {
      const rows = symptomCounts(items);
      if (rows.length === 0) return <NoData>這段期間沒有記下任何不適，很好。</NoData>;
      return (
        <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 44)}>
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 32, left: 8, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} horizontal={false} />
            <XAxis type="number" allowDecimals={false} {...axis} />
            <YAxis type="category" dataKey="name" width={72} {...axis} />
            <Tooltip {...tooltipStyle} formatter={(v) => [`${v} 次`, '出現']} />
            <Bar dataKey="count" fill={C.peach} radius={[0, 4, 4, 0]} maxBarSize={22} label={{ position: 'right', fontSize: 12, fill: '#55604F' }} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case 'hunger': {
      const rows = hungerVsAte(items).map((r) => ({ ...r, name: HUNGER[r.hunger - 1] }));
      if (rows.length === 0) return <NoData>記錄時填上「吃之前多餓」，就能看出飢餓感與食量的關係。</NoData>;
      return (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="name" {...axis} />
            <YAxis yAxisId="pct" domain={[0, 100]} unit="%" {...axis} />
            <YAxis yAxisId="kcal" orientation="right" {...axis} />
            <Tooltip {...tooltipStyle} formatter={(v, n) => [n === '平均吃完' ? `${v}%` : `${v} 大卡`, n]} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
            <Bar yAxisId="pct" dataKey="ate" name="平均吃完" fill={C.main} radius={[4, 4, 0, 0]} maxBarSize={32} />
            <Bar yAxisId="kcal" dataKey="kcal" name="每餐熱量" fill={C.peach} fillOpacity={0.6} radius={[4, 4, 0, 0]} maxBarSize={14} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case 'macro': {
      const rows = macroShare(items, C.deep);
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
            <li className="muted small">減重期間吃得少，蛋白質占熱量 25–30% 比較能保留肌肉，實際依醫師或營養師建議</li>
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
            <ReferenceLine yAxisId="g" y={GLP1_REF.proteinPerMeal} stroke={C.deep} strokeDasharray="4 4" />
            <Bar yAxisId="g" dataKey="protein" name="平均蛋白質（公克，依餐別上色）" fill={C.axis} radius={[4, 4, 0, 0]} maxBarSize={36}>
              {rows.map((r) => (
                <Cell key={r.name} fill={r.color} />
              ))}
            </Bar>
            <Bar yAxisId="s" dataKey="score" name="平均飲控友善度" fill={C.deep} fillOpacity={0.25} radius={[4, 4, 0, 0]} maxBarSize={14} />
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
            <YAxis type="number" dataKey="score" name="飲控友善度" domain={[0, 10]} {...axis} />
            <ZAxis type="number" dataKey="protein" range={[30, 260]} name="蛋白質" />
            <Tooltip {...tooltipStyle} cursor={{ strokeDasharray: '3 3' }} content={<PointTip scoreLabel="飲控友善度" />} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
            {MEAL_TYPES.map((m) => (
              <Scatter key={m.key} name={m.label} data={pts.filter((p) => p.mealType === m.key)} fill={m.color} fillOpacity={0.75} />
            ))}
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
            const color = over ? (r.kind === 'limit' ? C.red : C.peach) : GOOD;
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
          <p className="muted small">直線為 100%。食量變小時纖維很容易不夠，可多吃蔬菜、菇類與豆類，並記得喝水。</p>
        </div>
      );
    }

    case 'category': {
      const rows = byCategory(items);
      const palette = [C.main, C.peach, C.deep, C.mid, C.blue, C.soft, '#8D9488'];
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

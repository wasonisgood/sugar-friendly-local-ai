import { useEffect, useState } from 'react';
import { daysBetween, lastInjectionOn, todayKey } from '../lib/body';
import type { BodyEntry } from '../lib/types';
import Icon from './Icon';

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

/** 瘦瘦針模式首頁：今天的體重與打針 */
export default function BodyCard({ body, onChange }: { body: BodyEntry[]; onChange: (date: string, patch: Partial<BodyEntry>) => void }) {
  const today = todayKey();
  const entry = body.find((e) => e.date === today && !e.isSample);
  const [weight, setWeight] = useState(entry?.weightKg?.toString() ?? '');
  useEffect(() => setWeight(entry?.weightKg?.toString() ?? ''), [entry?.weightKg]);

  const real = body.filter((e) => !e.isSample);
  const last = lastInjectionOn(real, today);
  const since = last ? daysBetween(last.date, today) : null;
  const prevWeight = [...real].reverse().find((e) => e.date < today && e.weightKg != null)?.weightKg;
  const lastDose = [...real].reverse().find((e) => e.doseMg != null)?.doseMg;

  let shotHint = '還沒有打針紀錄';
  if (last && since === 0) shotHint = '今天已打針。這兩天食量會比較小，記得先吃蛋白質、多喝水。';
  else if (last && since != null) {
    const next = new Date(`${last.date}T00:00`);
    next.setDate(next.getDate() + 7);
    shotHint = since >= 7 ? `上次打針是 ${since} 天前，該打了嗎？` : `上次打針 ${since} 天前，下次大約是週${WEEK[next.getDay()]}`;
  }

  const saveWeight = () => {
    const v = weight.trim() === '' ? undefined : Math.round(Number(weight) * 10) / 10;
    if (v === entry?.weightKg) return;
    if (v != null && !(v > 20 && v < 400)) return;
    onChange(today, { weightKg: v });
  };

  return (
    <section className="body-card" aria-label="今天的身體紀錄">
      <div className="body-field">
        <label htmlFor="body-weight">
          <Icon name="scale" size={16} /> 今天體重
        </label>
        <span className="unit-input">
          <input
            id="body-weight"
            type="number"
            inputMode="decimal"
            step="0.1"
            min={20}
            max={400}
            className="input"
            placeholder={prevWeight ? String(prevWeight) : '—'}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            onBlur={saveWeight}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
          <span>公斤</span>
        </span>
        {entry?.weightKg != null && prevWeight != null && (
          <small className={entry.weightKg <= prevWeight ? 'body-down' : 'body-up'}>
            比上次 {entry.weightKg - prevWeight > 0 ? '+' : ''}
            {(Math.round((entry.weightKg - prevWeight) * 10) / 10).toFixed(1)}
          </small>
        )}
      </div>

      <div className="body-field">
        <span className="body-label">
          <Icon name="drop" size={16} /> 今天打針
        </span>
        <div className="inline">
          <button
            type="button"
            className="toggle"
            aria-pressed={!!entry?.injected}
            onClick={() => onChange(today, entry?.injected ? { injected: undefined, doseMg: undefined } : { injected: true, doseMg: lastDose })}
          >
            {entry?.injected ? <><Icon name="check" size={14} /> 已打</> : '記一筆'}
          </button>
          {entry?.injected && (
            <span className="unit-input unit-input-dose">
              <input
                type="number"
                inputMode="decimal"
                step="0.25"
                min={0}
                className="input"
                aria-label="劑量"
                placeholder="劑量"
                value={entry.doseMg ?? ''}
                onChange={(e) => onChange(today, { doseMg: e.target.value === '' ? undefined : Number(e.target.value) })}
              />
              <span>mg</span>
            </span>
          )}
        </div>
      </div>

      <p className="body-hint">{shotHint}</p>
    </section>
  );
}

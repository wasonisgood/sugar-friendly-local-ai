import type { ReactNode } from 'react';
import { COMPANIONS, MEAL_TYPES, PLACE_TYPES, guessMealType, toLocalInput } from '../lib/meal';
import type { MealMeta } from '../lib/types';

const num = (v: string) => (v.trim() === '' ? undefined : Math.max(0, Number(v)));

function Row({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="f-row">
      <div className="f-label">
        {htmlFor ? <label htmlFor={htmlFor}>{label}</label> : <span>{label}</span>}
        {hint && <small>{hint}</small>}
      </div>
      <div className="f-field">{children}</div>
    </div>
  );
}

export default function MealForm({
  value,
  onChange,
  knownPlaces,
  estimatedGrams,
  photoTime,
  disabled,
  idPrefix = 'mf',
}: {
  value: MealMeta;
  onChange: (m: MealMeta) => void;
  knownPlaces: string[];
  estimatedGrams?: number;
  photoTime?: Date;
  disabled?: boolean;
  idPrefix?: string;
}) {
  const set = <K extends keyof MealMeta>(k: K, v: MealMeta[K]) => onChange({ ...value, [k]: v });
  const id = (s: string) => `${idPrefix}-${s}`;

  return (
    <fieldset className="meal-form" disabled={disabled}>
      <Row label="時間" htmlFor={id('time')}>
        <div className="inline">
          <input
            id={id('time')}
            type="datetime-local"
            className="input input-time"
            value={toLocalInput(value.eatenAt)}
            onChange={(e) => {
              if (!e.target.value) return;
              const d = new Date(e.target.value);
              // 改時間時順便猜餐別，使用者之後仍可手動改
              onChange({ ...value, eatenAt: d.toISOString(), mealType: guessMealType(d) });
            }}
          />
          <button type="button" className="link-btn" onClick={() => onChange({ ...value, eatenAt: new Date().toISOString() })}>
            現在
          </button>
          {photoTime && (
            <button
              type="button"
              className="link-btn"
              title={photoTime.toLocaleString('zh-TW')}
              onClick={() => onChange({ ...value, eatenAt: photoTime.toISOString(), mealType: guessMealType(photoTime) })}
            >
              照片拍攝時間
            </button>
          )}
        </div>
      </Row>

      <Row label="餐別">
        <div className="seg" role="radiogroup" aria-label="餐別">
          {MEAL_TYPES.map((m) => (
            <button
              key={m.key}
              type="button"
              role="radio"
              aria-checked={value.mealType === m.key}
              className="seg-item"
              style={{ ['--meal' as string]: m.color }}
              onClick={() => set('mealType', m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </Row>

      <Row label="地點" htmlFor={id('place')}>
        <div className="toggles">
          {PLACE_TYPES.map((p) => (
            <button key={p.key} type="button" className="toggle" aria-pressed={value.placeType === p.key} onClick={() => set('placeType', p.key)}>
              {p.label}
            </button>
          ))}
        </div>
        <input
          id={id('place')}
          className="input"
          list={id('places')}
          placeholder="店名或地點，例如：公司附近自助餐"
          value={value.placeName ?? ''}
          maxLength={40}
          onChange={(e) => set('placeName', e.target.value)}
        />
        <datalist id={id('places')}>
          {knownPlaces.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </Row>

      <Row label="同桌">
        <div className="toggles">
          {COMPANIONS.map((c) => (
            <button
              key={c.key}
              type="button"
              className="toggle"
              aria-pressed={value.companion === c.key}
              onClick={() => set('companion', value.companion === c.key ? undefined : c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </Row>

      <Row label="份量" hint={estimatedGrams ? `模型估 ${estimatedGrams} 克` : '空白則由模型估'} htmlFor={id('grams')}>
        <span className="unit-input unit-input-short">
          <input
            id={id('grams')}
            type="number"
            inputMode="numeric"
            min={0}
            max={3000}
            className="input"
            placeholder={estimatedGrams ? String(estimatedGrams) : '—'}
            value={value.servingGrams ?? ''}
            onChange={(e) => set('servingGrams', num(e.target.value))}
          />
          <span>公克</span>
        </span>
      </Row>

      <Row label="血糖" hint="mg/dL，餐後可之後補">
        <div className="pair">
          <label className="pair-item">
            <span className="pair-label">餐前</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={600}
              className="input"
              value={value.bloodSugarBefore ?? ''}
              onChange={(e) => set('bloodSugarBefore', num(e.target.value))}
            />
          </label>
          <label className="pair-item">
            <span className="pair-label">餐後 2 小時</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={600}
              className="input"
              value={value.bloodSugarAfter ?? ''}
              onChange={(e) => set('bloodSugarAfter', num(e.target.value))}
            />
          </label>
        </div>
      </Row>

      <Row label="備註" htmlFor={id('notes')}>
        <textarea
          id={id('notes')}
          className="input"
          rows={2}
          maxLength={120}
          placeholder="少飯、醬料另外放、兩人分食⋯⋯"
          value={value.notes ?? ''}
          onChange={(e) => set('notes', e.target.value)}
        />
      </Row>
    </fieldset>
  );
}

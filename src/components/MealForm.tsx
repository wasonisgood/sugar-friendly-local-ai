import { COMPANIONS, MEAL_TYPES, PLACE_TYPES, guessMealType, toLocalInput } from '../lib/meal';
import type { MealMeta } from '../lib/types';
import Icon from './Icon';

const num = (v: string) => (v.trim() === '' ? undefined : Math.max(0, Number(v)));

export default function MealForm({
  value,
  onChange,
  knownPlaces,
  estimatedGrams,
  photoTime,
  disabled,
}: {
  value: MealMeta;
  onChange: (m: MealMeta) => void;
  knownPlaces: string[];
  estimatedGrams?: number;
  photoTime?: Date;
  disabled?: boolean;
}) {
  const set = <K extends keyof MealMeta>(k: K, v: MealMeta[K]) => onChange({ ...value, [k]: v });

  return (
    <fieldset className="meal-form" disabled={disabled}>
      <div className="form-row">
        <label className="form-label" htmlFor="eatenAt">
          <Icon name="clock" /> 用餐時間
        </label>
        <div className="inline">
          <input
            id="eatenAt"
            type="datetime-local"
            className="input"
            value={toLocalInput(value.eatenAt)}
            onChange={(e) => {
              if (!e.target.value) return;
              const d = new Date(e.target.value);
              // 改時間時順便猜餐別，使用者之後仍可手動改
              onChange({ ...value, eatenAt: d.toISOString(), mealType: guessMealType(d) });
            }}
          />
          <button type="button" className="chip" onClick={() => onChange({ ...value, eatenAt: new Date().toISOString() })}>
            現在
          </button>
          {photoTime && (
            <button
              type="button"
              className="chip"
              title={photoTime.toLocaleString('zh-TW')}
              onClick={() => onChange({ ...value, eatenAt: photoTime.toISOString(), mealType: guessMealType(photoTime) })}
            >
              用照片時間
            </button>
          )}
        </div>
      </div>

      <div className="form-row">
        <span className="form-label">餐別</span>
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
      </div>

      <div className="form-row">
        <span className="form-label">
          <Icon name="pin" /> 地點
        </span>
        <div className="chips">
          {PLACE_TYPES.map((p) => (
            <button
              key={p.key}
              type="button"
              className="chip"
              aria-pressed={value.placeType === p.key}
              onClick={() => set('placeType', p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <input
          className="input"
          list="known-places"
          placeholder="店名或地點（選填），例如：公司附近自助餐"
          value={value.placeName ?? ''}
          maxLength={40}
          onChange={(e) => set('placeName', e.target.value)}
        />
        <datalist id="known-places">
          {knownPlaces.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </div>

      <div className="form-row">
        <span className="form-label">
          <Icon name="people" /> 和誰一起
        </span>
        <div className="chips">
          {COMPANIONS.map((c) => (
            <button
              key={c.key}
              type="button"
              className="chip"
              aria-pressed={value.companion === c.key}
              onClick={() => set('companion', value.companion === c.key ? undefined : c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-grid">
        <label className="form-row">
          <span className="form-label">
            <Icon name="scale" /> 份量
          </span>
          <span className="unit-input">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={3000}
              className="input"
              placeholder={estimatedGrams ? String(estimatedGrams) : '自動估算'}
              value={value.servingGrams ?? ''}
              onChange={(e) => set('servingGrams', num(e.target.value))}
            />
            <span>公克</span>
          </span>
        </label>
        <label className="form-row">
          <span className="form-label">
            <Icon name="drop" /> 餐前血糖
          </span>
          <span className="unit-input">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={600}
              className="input"
              placeholder="選填"
              value={value.bloodSugarBefore ?? ''}
              onChange={(e) => set('bloodSugarBefore', num(e.target.value))}
            />
            <span>mg/dL</span>
          </span>
        </label>
        <label className="form-row">
          <span className="form-label">
            <Icon name="drop" /> 餐後 2 小時
          </span>
          <span className="unit-input">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={600}
              className="input"
              placeholder="可之後補"
              value={value.bloodSugarAfter ?? ''}
              onChange={(e) => set('bloodSugarAfter', num(e.target.value))}
            />
            <span>mg/dL</span>
          </span>
        </label>
      </div>

      <label className="form-row">
        <span className="form-label">
          <Icon name="note" /> 備註
        </span>
        <textarea
          className="input"
          rows={2}
          maxLength={120}
          placeholder="例如：少飯、醬料另外放、這是兩人份"
          value={value.notes ?? ''}
          onChange={(e) => set('notes', e.target.value)}
        />
      </label>
    </fieldset>
  );
}

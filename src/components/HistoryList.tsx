import { useMemo, useState } from 'react';
import { MEAL_TYPES, PLACE_TYPES, TONE_COLOR, dayKey, intake, mealInfo, placeLabel, scoreTone } from '../lib/meal';
import type { MealType, PlaceType, ScanHistoryItem } from '../lib/types';
import Icon from './Icon';

export default function HistoryList({
  items,
  onOpen,
  onRemove,
  onClear,
  onSample,
}: {
  items: ScanHistoryItem[];
  onOpen: (item: ScanHistoryItem) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onSample: (on: boolean) => void;
}) {
  const [meal, setMeal] = useState<MealType | 'all'>('all');
  const [place, setPlace] = useState<PlaceType | 'all'>('all');
  const hasSample = items.some((i) => i.isSample);

  const filtered = useMemo(
    () => items.filter((i) => (meal === 'all' || i.meta.mealType === meal) && (place === 'all' || i.meta.placeType === place)),
    [items, meal, place],
  );

  const groups = useMemo(() => {
    const g = new Map<string, ScanHistoryItem[]>();
    for (const it of filtered) {
      const k = dayKey(new Date(it.meta.eatenAt));
      g.set(k, [...(g.get(k) ?? []), it]);
    }
    return [...g];
  }, [filtered]);

  if (items.length === 0) {
    return (
      <div className="card empty">
        <Icon name="list" size={36} />
        <h3>還沒有飲食紀錄</h3>
        <p className="muted">每次辨識完成會自動存在這個瀏覽器裡。想先看看紀錄和圖表的樣子，可以載入一份四週的示範資料。</p>
        <button type="button" className="btn btn-outline" onClick={() => onSample(true)}>
          載入示範資料
        </button>
      </div>
    );
  }

  return (
    <div className="history">
      <div className="toolbar card">
        <label>
          餐別
          <select className="input" value={meal} onChange={(e) => setMeal(e.target.value as MealType | 'all')}>
            <option value="all">全部</option>
            {MEAL_TYPES.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          地點
          <select className="input" value={place} onChange={(e) => setPlace(e.target.value as PlaceType | 'all')}>
            <option value="all">全部</option>
            {PLACE_TYPES.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <span className="toolbar-count">{filtered.length} 筆</span>
        <span className="toolbar-actions">
          {hasSample ? (
            <button type="button" className="btn-text" onClick={() => onSample(false)}>
              移除示範資料
            </button>
          ) : (
            <button type="button" className="btn-text" onClick={() => onSample(true)}>
              載入示範資料
            </button>
          )}
          <button
            type="button"
            className="btn-text btn-text-danger"
            onClick={() => {
              if (window.confirm('確定要清除全部紀錄嗎？這個動作無法復原。')) onClear();
            }}
          >
            全部清除
          </button>
        </span>
      </div>

      {groups.map(([day, list]) => {
        const d = new Date(`${day}T00:00`);
        const kcal = list.reduce((s, i) => s + intake(i).calories, 0);
        const carbs = list.reduce((s, i) => s + intake(i).carbs, 0);
        return (
          <section key={day} className="card day">
            <header className="day-head">
              <h3>{d.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'short' })}</h3>
              <span className="muted small">
                {Math.round(kcal)} 大卡 · 碳水 {Math.round(carbs)} 公克
              </span>
            </header>
            <ul className="rows">
              {list.map((it) => {
                const r = it.analysisResult;
                const m = mealInfo(it.meta.mealType);
                const tone = scoreTone(r.sugarFriendlyScore);
                return (
                  <li key={it.id} className="row-item">
                    <button type="button" className="row-open" onClick={() => onOpen(it)}>
                      <img src={it.thumbnail} alt="" />
                      <span className="row-text">
                        <span className="row-top">
                          <span className="tag tag-small" style={{ ['--meal' as string]: m.color }}>
                            {m.label}
                          </span>
                          <span className="muted small">
                            {new Date(it.meta.eatenAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })} ·{' '}
                            {it.meta.placeName || placeLabel(it.meta.placeType)}
                          </span>
                        </span>
                        <span className="row-name">{r.foodName}</span>
                        <span className="muted small">
                          {Math.round(intake(it).calories)} 大卡 · 碳水 {Math.round(intake(it).carbs)} 公克
                          {it.meta.bloodSugarAfter != null && ` · 餐後 ${it.meta.bloodSugarAfter}`}
                        </span>
                      </span>
                      <span className="row-score" style={{ ['--tone' as string]: TONE_COLOR[tone] }}>
                        {r.sugarFriendlyScore}
                      </span>
                    </button>
                    <button type="button" className="icon-btn" aria-label={`刪除 ${r.foodName}`} onClick={() => onRemove(it.id)}>
                      <Icon name="trash" size={16} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {filtered.length === 0 && <p className="card empty muted">沒有符合篩選條件的紀錄。</p>}
    </div>
  );
}

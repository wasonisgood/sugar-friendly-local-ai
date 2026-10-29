import { useMemo, useState } from 'react';
import { MEAL_TYPES, PLACE_TYPES, TONE_COLOR, dayKey, intake, mealInfo, placeLabel, scoreTone } from '../lib/meal';
import type { MealType, PlaceType, ScanHistoryItem } from '../lib/types';
import Icon from './Icon';
import PageHead from './PageHead';

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
      <>
        <PageHead eyebrow="飲食紀錄" title="這裡還是空的" />
        <div className="blank">
          <p>每次辨識完成，那一餐會連同時間、地點與血糖存在這裡，只留在這個瀏覽器。</p>
          <p>想先看看排起來的樣子，可以放入四週的示範資料，之後一鍵移除。</p>
          <button type="button" className="btn btn-quiet" onClick={() => onSample(true)}>
            放入示範資料
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHead
        eyebrow="飲食紀錄"
        title={`${items.length} 餐`}
        aside={
          <div className="filters">
            <label>
              <span>餐別</span>
              <select className="select" value={meal} onChange={(e) => setMeal(e.target.value as MealType | 'all')}>
                <option value="all">全部</option>
                {MEAL_TYPES.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>地點</span>
              <select className="select" value={place} onChange={(e) => setPlace(e.target.value as PlaceType | 'all')}>
                <option value="all">全部</option>
                {PLACE_TYPES.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        }
      >
        {filtered.length !== items.length && `篩選後 ${filtered.length} 餐。`}
        點一列看完整分析，也能補填餐後血糖。
      </PageHead>

      <div className="timeline">
        {groups.map(([day, list]) => {
          const d = new Date(`${day}T00:00`);
          const kcal = list.reduce((s, i) => s + intake(i).calories, 0);
          const carbs = list.reduce((s, i) => s + intake(i).carbs, 0);
          return (
            <section key={day} className="tl-day">
              <div className="tl-date">
                <span className="tl-d">{d.getDate()}</span>
                <span className="tl-m">
                  {d.getMonth() + 1} 月・{d.toLocaleDateString('zh-TW', { weekday: 'short' })}
                </span>
                <span className="tl-sum">
                  <span>{Math.round(kcal).toLocaleString()} 大卡</span>
                  <span>碳水 {Math.round(carbs)} 克</span>
                </span>
              </div>
              <ul className="tl-meals">
                {list.map((it) => {
                  const r = it.analysisResult;
                  const m = mealInfo(it.meta.mealType);
                  const tone = scoreTone(r.sugarFriendlyScore);
                  return (
                    <li key={it.id} className="tl-meal" style={{ ['--meal' as string]: m.color, ['--tone' as string]: TONE_COLOR[tone] }}>
                      <button type="button" className="tl-open" onClick={() => onOpen(it)}>
                        <span className="tl-time">
                          {new Date(it.meta.eatenAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })}
                          <b>{m.label}</b>
                        </span>
                        <img src={it.thumbnail} alt="" />
                        <span className="tl-text">
                          <span className="tl-name">{r.foodName}</span>
                          <span className="tl-sub">
                            {it.meta.placeName || placeLabel(it.meta.placeType)}・{Math.round(intake(it).calories)} 大卡・碳水 {Math.round(intake(it).carbs)} 克
                            {it.meta.bloodSugarAfter != null && `・餐後 ${it.meta.bloodSugarAfter}`}
                            {it.isSample && '・示範'}
                          </span>
                        </span>
                        <span className="tl-score">{r.sugarFriendlyScore}</span>
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
        {filtered.length === 0 && <p className="blank">沒有符合篩選條件的紀錄。</p>}
      </div>

      <div className="page-foot">
        {hasSample ? (
          <button type="button" className="link-btn" onClick={() => onSample(false)}>
            移除示範資料
          </button>
        ) : (
          <button type="button" className="link-btn" onClick={() => onSample(true)}>
            放入示範資料
          </button>
        )}
        <button
          type="button"
          className="link-btn link-danger"
          onClick={() => {
            if (window.confirm('確定要清除全部紀錄嗎？這個動作無法復原。')) onClear();
          }}
        >
          清除全部紀錄
        </button>
      </div>
    </>
  );
}

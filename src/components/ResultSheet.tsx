import { TONE_COLOR, companionLabel, intake, mealInfo, placeLabel, scoreTone, servingGrams } from '../lib/meal';
import type { ScanHistoryItem } from '../lib/types';
import NutritionLabel from './NutritionLabel';

const VERDICT = { good: '適合糖友', fair: '注意份量', poor: '盡量少吃' } as const;

function Notes({ title, items, tone }: { title: string; items: string[]; tone?: 'warn' }) {
  if (items.length === 0) return null;
  return (
    <section className={`note${tone ? ` note-${tone}` : ''}`}>
      <h3>{title}</h3>
      <ul>
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </section>
  );
}

export default function ResultSheet({ item, onEdit }: { item: ScanHistoryItem; onEdit?: () => void }) {
  const r = item.analysisResult;
  const m = item.meta;
  const tone = scoreTone(r.sugarFriendlyScore);
  const meal = mealInfo(m.mealType);
  const grams = servingGrams(item);
  const portion = intake(item);
  const eaten = new Date(m.eatenAt);
  const rise = m.bloodSugarBefore != null && m.bloodSugarAfter != null ? m.bloodSugarAfter - m.bloodSugarBefore : null;
  const place = m.placeName ? `${m.placeName}・${placeLabel(m.placeType)}` : placeLabel(m.placeType);

  return (
    <article className="result" style={{ ['--tone' as string]: TONE_COLOR[tone], ['--meal' as string]: meal.color }}>
      {item.isSample && <p className="sample-flag">示範資料，不是真正的辨識結果</p>}

      <div className="result-hero">
        <figure className="result-photo">
          <img src={item.thumbnail} alt={r.foodName} />
        </figure>

        <div className="result-info">
          <p className="eyebrow">
            <span className="meal-dot" />
            {meal.label}
            <span className="sep">／</span>
            {eaten.toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
          <h1 className="result-name">{r.foodName}</h1>
          <p className="result-meta">
            {r.category}
            <span className="sep">・</span>
            {place}
            {m.companion && (
              <>
                <span className="sep">・</span>和{companionLabel(m.companion)}
              </>
            )}
          </p>

          <div className="scoreline">
            <span className="scoreline-num">{r.sugarFriendlyScore}</span>
            <div className="scoreline-body">
              <span className="scoreline-label">
                糖友善度 <b>{VERDICT[tone]}</b>
              </span>
              <span className="meter" aria-hidden="true">
                {Array.from({ length: 10 }, (_, i) => (
                  <i key={i} className={i < r.sugarFriendlyScore ? 'on' : undefined} />
                ))}
              </span>
            </div>
          </div>

          <dl className="figures">
            <div>
              <dt>這份熱量</dt>
              <dd>
                {Math.round(portion.calories)}
                <small>大卡</small>
              </dd>
            </div>
            <div>
              <dt>碳水</dt>
              <dd>
                {Math.round(portion.carbs)}
                <small>克</small>
              </dd>
            </div>
            <div>
              <dt>健康度</dt>
              <dd>
                {r.healthScore}
                <small>/10</small>
              </dd>
            </div>
            <div>
              <dt>血糖變化</dt>
              <dd>
                {rise != null ? (
                  <>
                    {rise > 0 ? '+' : ''}
                    {rise}
                    <small>mg/dL</small>
                  </>
                ) : (
                  <small>未填</small>
                )}
              </dd>
            </div>
          </dl>

          {onEdit && (
            <button type="button" className="link-btn" onClick={onEdit}>
              修改時間、地點或血糖 →
            </button>
          )}
        </div>
      </div>

      <div className="result-body">
        <div className="result-label">
          <NutritionLabel per100={r.nutritionalInfo} serving={portion} grams={grams} />
          <p className="fine">
            {m.servingGrams ? '份量為你填寫的重量' : r.estimatedServingGrams ? '份量由模型從照片估計' : '未估出份量，暫以 100 公克計'}
            ；辨識把握度 {Math.round(r.confidence * 100)}%。
          </p>
        </div>

        <div className="result-text">
          {r.diabeticAdvice && (
            <section className="lead-note">
              <h3>給糖友</h3>
              <p>{r.diabeticAdvice}</p>
            </section>
          )}
          {r.portionSizeAdvice && (
            <section className="note">
              <h3>建議份量</h3>
              <p>{r.portionSizeAdvice}</p>
            </section>
          )}
          <Notes title="需要注意" items={r.warnings} tone="warn" />
          <Notes title="可以這樣吃" items={r.recommendations} />
          <Notes title="營養上的好處" items={r.healthBenefits} />
          {r.generalHealthAdvice && (
            <section className="note">
              <h3>一般建議</h3>
              <p>{r.generalHealthAdvice}</p>
            </section>
          )}
          {m.notes && (
            <section className="note">
              <h3>備註</h3>
              <p>{m.notes}</p>
            </section>
          )}
        </div>
      </div>

      <p className="fine disclaimer">數值由瀏覽器內建模型從照片估算，可能有明顯誤差。調整飲食或用藥前，請與醫師或營養師討論。</p>
    </article>
  );
}

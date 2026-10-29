import { TONE_COLOR, companionLabel, intake, mealInfo, placeLabel, scoreTone, servingGrams } from '../lib/meal';
import type { ScanHistoryItem } from '../lib/types';
import Icon, { type IconName } from './Icon';
import NutritionLabel from './NutritionLabel';

const VERDICT = { good: '適合糖友', fair: '注意份量', poor: '盡量少吃' } as const;

function Notes({ title, icon, items, tone }: { title: string; icon: IconName; items: string[]; tone?: string }) {
  if (items.length === 0) return null;
  return (
    <section className={`advice${tone ? ` advice-${tone}` : ''}`}>
      <h4>
        <Icon name={icon} /> {title}
      </h4>
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
  const eaten = new Date(m.eatenAt);
  const rise = m.bloodSugarBefore != null && m.bloodSugarAfter != null ? m.bloodSugarAfter - m.bloodSugarBefore : null;

  return (
    <article className="card result">
      {item.isSample && <p className="flag">示範資料，不是真正的辨識結果</p>}

      <header className="result-head">
        <img className="result-thumb" src={item.thumbnail} alt={r.foodName} />
        <div className="result-title">
          <div className="tags">
            <span className="tag" style={{ ['--meal' as string]: meal.color }}>
              {meal.label}
            </span>
            <span className="tag tag-plain">{r.category}</span>
          </div>
          <h2>{r.foodName}</h2>
          <ul className="meta-line">
            <li>
              <Icon name="clock" size={15} />
              {eaten.toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })}
            </li>
            <li>
              <Icon name="pin" size={15} />
              {m.placeName ? `${m.placeName}（${placeLabel(m.placeType)}）` : placeLabel(m.placeType)}
            </li>
            {m.companion && (
              <li>
                <Icon name="people" size={15} />
                {companionLabel(m.companion)}
              </li>
            )}
          </ul>
          {onEdit && (
            <button type="button" className="btn btn-small btn-outline" onClick={onEdit}>
              <Icon name="edit" size={15} /> 修改用餐資訊
            </button>
          )}
        </div>
        <div className="score" style={{ ['--tone' as string]: TONE_COLOR[tone] }}>
          <span className="score-num">{r.sugarFriendlyScore}</span>
          <span className="score-of">/ 10</span>
          <span className="score-label">糖友善度</span>
          <span className="score-verdict">{VERDICT[tone]}</span>
        </div>
      </header>

      <div className="stat-row">
        <div className="stat">
          <span className="stat-label">這份熱量</span>
          <span className="stat-value">{Math.round(intake(item).calories)}<small> 大卡</small></span>
        </div>
        <div className="stat">
          <span className="stat-label">這份碳水</span>
          <span className="stat-value">{Math.round(intake(item).carbs)}<small> 公克</small></span>
        </div>
        <div className="stat">
          <span className="stat-label">健康度</span>
          <span className="stat-value">{r.healthScore}<small> / 10</small></span>
        </div>
        <div className="stat">
          <span className="stat-label">血糖變化</span>
          <span className="stat-value">
            {rise != null ? (
              <>
                {rise > 0 ? '+' : ''}
                {rise}
                <small> mg/dL</small>
              </>
            ) : (
              <small className="muted">未填</small>
            )}
          </span>
        </div>
      </div>

      <div className="result-body">
        <div>
          <NutritionLabel per100={r.nutritionalInfo} serving={intake(item)} grams={grams} />
          <p className="small muted">
            {m.servingGrams ? '份量為你填寫的重量' : r.estimatedServingGrams ? '份量為模型從照片估計的重量' : '未估出份量，暫以 100 公克計算'}
            ，辨識把握度 {Math.round(r.confidence * 100)}%。
          </p>
        </div>

        <div className="advice-col">
          {r.diabeticAdvice && (
            <section className="advice advice-lead">
              <h4>給糖友的建議</h4>
              <p>{r.diabeticAdvice}</p>
            </section>
          )}
          {r.portionSizeAdvice && (
            <section className="advice">
              <h4>
                <Icon name="scale" /> 建議份量
              </h4>
              <p>{r.portionSizeAdvice}</p>
            </section>
          )}
          <Notes title="需要注意" icon="warn" items={r.warnings} tone="warn" />
          <Notes title="飲食建議" icon="check" items={r.recommendations} />
          <Notes title="營養好處" icon="leaf" items={r.healthBenefits} />
          {r.generalHealthAdvice && (
            <section className="advice">
              <h4>一般建議</h4>
              <p>{r.generalHealthAdvice}</p>
            </section>
          )}
          {m.notes && (
            <section className="advice">
              <h4>
                <Icon name="note" /> 備註
              </h4>
              <p>{m.notes}</p>
            </section>
          )}
        </div>
      </div>

      <p className="disclaimer">
        數值由瀏覽器內建模型從照片估算，可能有明顯誤差。調整飲食或用藥前，請與醫師或營養師討論。
      </p>
    </article>
  );
}

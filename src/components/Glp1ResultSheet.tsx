import { GLP1_REF } from '../lib/glp1Stats';
import { GI_LOAD, HUNGER, TONE_COLOR, ateLabel, companionLabel, intake, mealInfo, placeLabel, scoreTone, servingGrams, symptomLabel } from '../lib/meal';
import type { Glp1Item } from '../lib/types';
import NutritionLabel from './NutritionLabel';
import { Notes } from './ResultSheet';

const VERDICT = { good: '適合飲控', fair: '注意份量', poor: '盡量少吃' } as const;

export default function Glp1ResultSheet({ item, onEdit }: { item: Glp1Item; onEdit?: () => void }) {
  const r = item.analysisResult;
  const m = item.meta;
  const tone = scoreTone(r.glp1Score);
  const meal = mealInfo(m.mealType);
  const grams = servingGrams(item);
  const ate = m.ateRatio ?? 1;
  const portion = intake(item);
  const eaten = new Date(m.eatenAt);
  const place = m.placeName ? `${m.placeName}・${placeLabel(m.placeType)}` : placeLabel(m.placeType);
  const gi = GI_LOAD[r.giLoad];
  const proteinPct = Math.min(100, (portion.protein / GLP1_REF.proteinPerMeal) * 100);

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
            <span className="scoreline-num">{r.glp1Score}</span>
            <div className="scoreline-body">
              <span className="scoreline-label">
                飲控友善度 <b>{VERDICT[tone]}</b>
              </span>
              <span className="meter" aria-hidden="true">
                {Array.from({ length: 10 }, (_, i) => (
                  <i key={i} className={i < r.glp1Score ? 'on' : undefined} />
                ))}
              </span>
            </div>
          </div>

          <div className="protein-goal">
            <span>
              這餐蛋白質 <b>{Math.round(portion.protein)}</b> / {GLP1_REF.proteinPerMeal} 克
            </span>
            <span className="protein-track" aria-hidden="true">
              <span style={{ width: `${proteinPct}%` }} />
            </span>
          </div>

          <dl className="figures">
            <div>
              <dt>吃下熱量</dt>
              <dd>
                {Math.round(portion.calories)}
                <small>大卡</small>
              </dd>
            </div>
            <div>
              <dt>吃完</dt>
              <dd>
                {Math.round(ate * 100)}
                <small>%</small>
              </dd>
            </div>
            <div>
              <dt>腸胃負擔</dt>
              <dd style={{ color: gi.color }}>{gi.label}</dd>
            </div>
            <div>
              <dt>餐後</dt>
              <dd>{m.symptoms?.length ? <small className="sym">{m.symptoms.map(symptomLabel).join('、')}</small> : <small>沒有不適</small>}</dd>
            </div>
          </dl>

          {onEdit && (
            <button type="button" className="link-btn" onClick={onEdit}>
              修改時間、吃完多少或餐後不適 →
            </button>
          )}
        </div>
      </div>

      <div className="result-body">
        <div className="result-label">
          <NutritionLabel per100={r.nutritionalInfo} serving={portion} grams={grams * ate} />
          <p className="fine">
            {m.servingGrams ? '份量為你填寫的重量' : r.estimatedServingGrams ? '份量由模型從照片估計' : '未估出份量，暫以 100 公克計'}
            {ate < 1 && `，再乘上吃完的比例（${ateLabel(ate) ?? `${Math.round(ate * 100)}%`}）`}
            {m.hungerBefore && `；吃之前「${HUNGER[m.hungerBefore - 1]}」`}
            ；辨識把握度 {Math.round(r.confidence * 100)}%。
          </p>
        </div>

        <div className="result-text">
          {r.coachAdvice && (
            <section className="lead-note">
              <h3>給飲控中的你</h3>
              <p>{r.coachAdvice}</p>
            </section>
          )}
          {r.proteinAdvice && (
            <section className="note">
              <h3>蛋白質</h3>
              <p>{r.proteinAdvice}</p>
            </section>
          )}
          {r.giAdvice && (
            <section className="note">
              <h3>怎麼吃比較不會不舒服</h3>
              <p>{r.giAdvice}</p>
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
          {m.notes && (
            <section className="note">
              <h3>備註</h3>
              <p>{m.notes}</p>
            </section>
          )}
        </div>
      </div>

      <p className="fine disclaimer">
        數值由瀏覽器內建模型從照片估算，可能有明顯誤差。噁心、嘔吐或腹痛持續、嚴重時請就醫；調整劑量或飲食前，請與醫師或營養師討論。
      </p>
    </article>
  );
}

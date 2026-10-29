import type { FoodAnalysisResult } from '../lib/types';
import NutritionLabel from './NutritionLabel';

function tone(score: number) {
  if (score >= 7) return 'good';
  if (score >= 4) return 'fair';
  return 'poor';
}

const VERDICT: Record<string, string> = {
  good: '可以放心吃',
  fair: '注意份量',
  poor: '淺嚐即止',
};

function Notes({ title, items, mark }: { title: string; items: string[]; mark?: string }) {
  if (items.length === 0) return null;
  return (
    <section className="notes">
      <h4>{title}</h4>
      <ol className={mark}>
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ol>
    </section>
  );
}

export default function ResultSheet({
  result,
  image,
  notes,
  date,
  isSample,
}: {
  result: FoodAnalysisResult;
  image: string;
  notes?: string;
  date?: Date;
  isSample?: boolean;
}) {
  const t = tone(result.sugarFriendlyScore);
  return (
    <article className="sheet">
      {isSample && <p className="sheet-flag">這是範例資料，不是你的照片的分析結果。</p>}

      <header className="sheet-head">
        <div>
          <p className="kicker">
            {result.category}
            {date && <> · {date.toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</>}
          </p>
          <h2>{result.foodName}</h2>
          <p className="confidence">
            辨識把握度 <b>{Math.round(result.confidence * 100)}%</b>
            {result.confidence < 0.5 && '，照片可能不夠清楚，結果僅供參考'}
          </p>
        </div>
        <div className={`stamp stamp-${t}`} aria-label={`糖友善度 ${result.sugarFriendlyScore} 分`}>
          <span className="stamp-label">糖友善</span>
          <span className="stamp-score">{result.sugarFriendlyScore}</span>
          <span className="stamp-verdict">{VERDICT[t]}</span>
        </div>
      </header>

      <div className="sheet-body">
        <div className="sheet-side">
          <figure className="photo">
            <img src={image} alt={result.foodName} />
            {notes && <figcaption>「{notes}」</figcaption>}
          </figure>
          <NutritionLabel info={result.nutritionalInfo} />
          <dl className="minor-score">
            <dt>整體健康度</dt>
            <dd>
              <span className="bar" style={{ ['--v' as string]: result.healthScore / 10 }} />
              {result.healthScore} / 10
            </dd>
          </dl>
        </div>

        <div className="sheet-main">
          {result.diabeticAdvice && (
            <section className="lead">
              <h3>給糖友</h3>
              <p>{result.diabeticAdvice}</p>
            </section>
          )}
          {result.portionSizeAdvice && (
            <p className="portion">
              <span>份量</span>
              {result.portionSizeAdvice}
            </p>
          )}
          <Notes title="要留意" items={result.warnings} mark="warn" />
          <Notes title="可以這樣吃" items={result.recommendations} />
          <Notes title="這道菜的好處" items={result.healthBenefits} />
          {result.generalHealthAdvice && (
            <section className="notes">
              <h4>一般人</h4>
              <p>{result.generalHealthAdvice}</p>
            </section>
          )}
        </div>
      </div>

      <footer className="sheet-foot">
        數值由瀏覽器內建的小型模型從照片估算，可能有明顯誤差。調整飲食或用藥前，請與醫師或營養師討論。
      </footer>
    </article>
  );
}

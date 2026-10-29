import type { ScanHistoryItem } from '../lib/types';

export default function HistoryList({
  items,
  onOpen,
  onRemove,
  onClear,
}: {
  items: ScanHistoryItem[];
  onOpen: (item: ScanHistoryItem) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  if (items.length === 0) {
    return (
      <div className="empty">
        <p>還沒有紀錄。</p>
        <p className="muted">每次辨識完成都會自動記在這裡，只存在這個瀏覽器裡。</p>
      </div>
    );
  }

  // 依日期分組
  const groups = new Map<string, ScanHistoryItem[]>();
  for (const it of items) {
    const key = new Date(it.timestamp).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
    groups.set(key, [...(groups.get(key) ?? []), it]);
  }

  const avg = items.reduce((s, i) => s + i.analysisResult.sugarFriendlyScore, 0) / items.length;

  return (
    <div className="history">
      <div className="history-summary">
        <p>
          共 <b>{items.length}</b> 筆，平均糖友善度 <b>{avg.toFixed(1)}</b>
        </p>
        <button
          type="button"
          className="link link-danger"
          onClick={() => {
            if (window.confirm('確定要清除全部紀錄嗎？')) onClear();
          }}
        >
          全部清除
        </button>
      </div>

      {[...groups].map(([day, list]) => (
        <section key={day} className="day">
          <h3>{day}</h3>
          <ul className="cards">
            {list.map((it) => {
              const r = it.analysisResult;
              const s = r.sugarFriendlyScore;
              return (
                <li key={it.id} className="card">
                  <button type="button" className="card-open" onClick={() => onOpen(it)}>
                    <img src={it.thumbnail} alt="" />
                    <span className="card-text">
                      <span className="card-time">
                        {new Date(it.timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                        {it.isSample && ' · 範例'}
                      </span>
                      <span className="card-name">{r.foodName}</span>
                      <span className="card-meta">
                        {Math.round(r.nutritionalInfo.calories)} 大卡 · 碳水 {Math.round(r.nutritionalInfo.carbs)} 克
                      </span>
                    </span>
                    <span className={`card-score tone-${s >= 7 ? 'good' : s >= 4 ? 'fair' : 'poor'}`}>{s}</span>
                  </button>
                  <button type="button" className="card-del" aria-label="刪除這筆" onClick={() => onRemove(it.id)}>
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

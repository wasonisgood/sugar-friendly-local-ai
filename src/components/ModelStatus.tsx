import type { ModelState } from '../lib/localModel';

const TEXT: Record<ModelState, string> = {
  checking: '檢查中',
  unsupported: '本機模型未開啟',
  unavailable: '本機模型無法使用',
  downloadable: '模型未下載（約 2 GB）',
  downloading: '模型下載中',
  available: '本機模型就緒',
};

export default function ModelStatus({
  state,
  progress,
  onDownload,
  onHelp,
}: {
  state: ModelState;
  progress: number | null;
  onDownload: () => void;
  onHelp: () => void;
}) {
  const ok = state === 'available';
  return (
    <div className={`status status-${ok ? 'ok' : state === 'unsupported' || state === 'unavailable' ? 'off' : 'wait'}`}>
      <span className="status-dot" aria-hidden="true" />
      <span>
        {TEXT[state]}
        {state === 'downloading' && progress !== null && ` ${Math.round(progress * 100)}%`}
      </span>
      {state === 'downloadable' && (
        <button type="button" className="btn-text" onClick={onDownload}>
          現在下載
        </button>
      )}
      {(state === 'unsupported' || state === 'unavailable') && (
        <button type="button" className="btn-text" onClick={onHelp}>
          怎麼開啟？
        </button>
      )}
      {state === 'downloading' && progress !== null && (
        <span className="status-track">
          <span style={{ width: `${progress * 100}%` }} />
        </span>
      )}
    </div>
  );
}

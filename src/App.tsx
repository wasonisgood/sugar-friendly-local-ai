import { useCallback, useEffect, useRef, useState } from 'react';
import Dropzone from './components/Dropzone';
import Guide from './components/Guide';
import HistoryList from './components/HistoryList';
import ModelStatus from './components/ModelStatus';
import ResultSheet from './components/ResultSheet';
import { imageFromPasteEvent } from './lib/clipboard';
import { addHistory, clearHistory, loadHistory, removeHistory } from './lib/history';
import { prepareImage, type PreparedImage } from './lib/image';
import { analyzeFood, checkAvailability, prepareModel, type ModelState } from './lib/localModel';
import { SAMPLE_RESULT, SAMPLE_THUMB } from './lib/sample';
import type { FoodAnalysisResult, ScanHistoryItem } from './lib/types';

type View = 'scan' | 'history' | 'guide';
type Phase =
  | { kind: 'empty' }
  | { kind: 'ready' }
  | { kind: 'working'; chars: number }
  | { kind: 'done'; result: FoodAnalysisResult; isSample?: boolean }
  | { kind: 'error'; message: string };

const NAV: { id: View; label: string }[] = [
  { id: 'scan', label: '辨識' },
  { id: 'history', label: '紀錄' },
  { id: 'guide', label: '本地模型說明' },
];

const readView = (): View => {
  const h = location.hash.replace('#', '');
  return h === 'history' || h === 'guide' ? h : 'scan';
};

export default function App() {
  const [view, setView] = useState<View>(readView);
  const [modelState, setModelState] = useState<ModelState>('checking');
  const [progress, setProgress] = useState<number | null>(null);
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [notes, setNotes] = useState('');
  const [phase, setPhase] = useState<Phase>({ kind: 'empty' });
  const [history, setHistory] = useState<ScanHistoryItem[]>(loadHistory);
  const [opened, setOpened] = useState<ScanHistoryItem | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    checkAvailability().then(setModelState);
    const onHash = () => {
      setView(readView());
      setOpened(null);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (v: View) => {
    location.hash = v === 'scan' ? '' : v;
    setView(v);
    setOpened(null);
    window.scrollTo({ top: 0 });
  };

  const download = useCallback(async () => {
    setModelState('downloading');
    setProgress(0);
    try {
      await prepareModel((r) => setProgress(r));
      setModelState('available');
    } catch (e) {
      setModelState(await checkAvailability());
      throw e;
    } finally {
      setProgress(null);
    }
  }, []);

  const onFile = useCallback(async (file: File) => {
    try {
      const prepared = await prepareImage(file);
      setImage((old) => {
        if (old) URL.revokeObjectURL(old.previewUrl);
        return prepared;
      });
      setPhase({ kind: 'ready' });
      setView('scan');
    } catch {
      setPhase({ kind: 'error', message: '這個檔案讀不出來，請換一張 JPG 或 PNG 照片。' });
    }
  }, []);

  // 全頁 Ctrl+V：任何畫面都能直接貼上圖片（辨識中除外）
  const busy = phase.kind === 'working';
  useEffect(() => {
    if (busy) return;
    const onPaste = (e: ClipboardEvent) => {
      const file = imageFromPasteEvent(e);
      if (!file) return; // 純文字照常貼進輸入框
      e.preventDefault();
      setOpened(null);
      if (location.hash) location.hash = '';
      onFile(file);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [busy, onFile]);

  const run = async () => {
    if (!image) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPhase({ kind: 'working', chars: 0 });
    try {
      if (modelState !== 'available') await download();
      const result = await analyzeFood(image.blob, {
        notes,
        signal: ctrl.signal,
        onToken: (chars) => setPhase({ kind: 'working', chars }),
      });
      setPhase({ kind: 'done', result });
      setHistory(addHistory(image.thumbnail, result, notes));
    } catch (e) {
      if (ctrl.signal.aborted) {
        setPhase({ kind: 'ready' });
        return;
      }
      console.error(e);
      const msg =
        e instanceof SyntaxError
          ? '模型回覆的格式不完整，請再試一次，或換一張比較清楚的照片。'
          : e instanceof Error && e.name === 'NotSupportedError'
            ? '這版 Chrome 的內建模型還不支援圖片輸入，請到「本地模型說明」開啟多模態設定。'
            : `辨識失敗：${e instanceof Error ? e.message : String(e)}`;
      setPhase({ kind: 'error', message: msg });
    } finally {
      abortRef.current = null;
    }
  };

  const showSample = () => {
    setPhase({ kind: 'done', result: SAMPLE_RESULT, isSample: true });
  };

  const reset = () => {
    if (image) URL.revokeObjectURL(image.previewUrl);
    setImage(null);
    setNotes('');
    setPhase({ kind: 'empty' });
  };

  const canRun = modelState === 'available' || modelState === 'downloadable';
  const today = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead-top">
          <span>{today}</span>
          <span>照片只在你的電腦上處理</span>
        </div>
        <h1>
          <span className="m-small">糖友善</span>
          餐盤筆記
        </h1>
        <nav className="nav" aria-label="主要">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={`#${n.id === 'scan' ? '' : n.id}`}
              aria-current={view === n.id ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault();
                go(n.id);
              }}
            >
              {n.label}
              {n.id === 'history' && history.length > 0 && <sup>{history.length}</sup>}
            </a>
          ))}
        </nav>
      </header>

      <ModelStatus state={modelState} progress={progress} onDownload={() => download().catch(() => {})} onHelp={() => go('guide')} />

      <main>
        {view === 'scan' && (
          <>
            {phase.kind === 'empty' && (
              <div className="intro">
                <div className="intro-text">
                  <p className="lede">拍下這一餐，看看它對血糖友不友善。</p>
                  <p className="muted">
                    上傳一張餐點照片，瀏覽器內建的 Gemini Nano 會估算熱量、碳水與糖分，並給糖友一些份量上的建議。整個過程不連到任何
                    AI 伺服器。
                  </p>
                  <ol className="how">
                    <li>
                      <b>一、</b>選一張照片、直接拍，或從剪貼簿貼上
                    </li>
                    <li>
                      <b>二、</b>可以補一句說明，例如「這是半碗」
                    </li>
                    <li>
                      <b>三、</b>按下辨識，結果自動存進紀錄
                    </li>
                  </ol>
                </div>
                <Dropzone onFile={onFile} />
              </div>
            )}

            {image && (phase.kind === 'ready' || phase.kind === 'working' || phase.kind === 'error') && (
              <div className="compose">
                <figure className="photo photo-large">
                  <img src={image.previewUrl} alt="待辨識的餐點" />
                  {phase.kind === 'working' && (
                    <div className="working" role="status">
                      <span className="working-line" />
                      <span>
                        {modelState === 'downloading'
                          ? `正在下載模型 ${progress !== null ? Math.round(progress * 100) + '%' : ''}`
                          : phase.chars === 0
                            ? '模型正在看這張照片…'
                            : `正在寫分析，已 ${phase.chars} 字`}
                      </span>
                    </div>
                  )}
                </figure>

                <div className="compose-side">
                  <label className="field">
                    <span>補充說明（選填）</span>
                    <textarea
                      rows={3}
                      value={notes}
                      maxLength={120}
                      placeholder="例如：少飯、醬料另外放、這是兩人份"
                      disabled={phase.kind === 'working'}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </label>

                  {phase.kind === 'error' && <p className="error">{phase.message}</p>}

                  {phase.kind !== 'working' && (
                    <p className="muted small">
                      想換照片也可以直接按 <kbd>Ctrl</kbd> + <kbd>V</kbd> 貼上新的。
                    </p>
                  )}

                  <div className="row">
                    {phase.kind === 'working' ? (
                      <button type="button" className="btn btn-ghost" onClick={() => abortRef.current?.abort()}>
                        取消
                      </button>
                    ) : (
                      <>
                        <button type="button" className="btn btn-primary" disabled={!canRun} onClick={run}>
                          {modelState === 'downloadable' ? '下載模型並辨識' : '開始辨識'}
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={reset}>
                          換一張
                        </button>
                      </>
                    )}
                  </div>

                  {!canRun && modelState !== 'checking' && modelState !== 'downloading' && (
                    <p className="muted small">
                      這個瀏覽器還不能用本地模型。可以先到
                      <button type="button" className="link" onClick={() => go('guide')}>
                        說明頁
                      </button>
                      照步驟開啟，或
                      <button type="button" className="link" onClick={showSample}>
                        看一份範例結果
                      </button>
                      。
                    </p>
                  )}
                </div>
              </div>
            )}

            {phase.kind === 'error' && !image && (
              <p className="error">
                {phase.message}{' '}
                <button type="button" className="link" onClick={reset}>
                  重新選擇
                </button>
              </p>
            )}

            {phase.kind === 'done' && (
              <>
                <ResultSheet
                  result={phase.result}
                  image={phase.isSample || !image ? SAMPLE_THUMB : image.previewUrl}
                  notes={phase.isSample ? undefined : notes.trim() || undefined}
                  date={new Date()}
                  isSample={phase.isSample}
                />
                <div className="row row-center">
                  <button type="button" className="btn btn-primary" onClick={reset}>
                    再記一餐
                  </button>
                  {!phase.isSample && (
                    <button type="button" className="btn btn-ghost" onClick={() => go('history')}>
                      看所有紀錄
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {view === 'history' &&
          (opened ? (
            <>
              <button type="button" className="back" onClick={() => setOpened(null)}>
                ← 回到紀錄
              </button>
              <ResultSheet
                result={opened.analysisResult}
                image={opened.thumbnail}
                notes={opened.notes}
                date={new Date(opened.timestamp)}
                isSample={opened.isSample}
              />
            </>
          ) : (
            <HistoryList
              items={history}
              onOpen={(it) => {
                setOpened(it);
                window.scrollTo({ top: 0 });
              }}
              onRemove={(id) => setHistory(removeHistory(id))}
              onClear={() => setHistory(clearHistory())}
            />
          ))}

        {view === 'guide' && <Guide state={modelState} />}
      </main>

      <footer className="colophon">
        <p>糖友善餐盤筆記 · 由 Sugar Friendly App 延伸的網頁版，辨識改用 Chrome 內建 Prompt API。</p>
        <p>本網站內容僅供飲食記錄參考，不能取代醫療建議。</p>
      </footer>
    </div>
  );
}

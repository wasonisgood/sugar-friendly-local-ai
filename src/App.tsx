import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Dropzone from './components/Dropzone';
import Guide from './components/Guide';
import HealthCharts from './components/HealthCharts';
import HistoryList from './components/HistoryList';
import Icon, { type IconName } from './components/Icon';
import MealForm from './components/MealForm';
import MetaEditor from './components/MetaEditor';
import ModelStatus from './components/ModelStatus';
import PageHead from './components/PageHead';
import ResultSheet from './components/ResultSheet';
import { imageFromPasteEvent } from './lib/clipboard';
import { addHistory, addSampleData, clearHistory, loadHistory, removeHistory, removeSampleData, updateMeta } from './lib/history';
import { prepareImage, type PreparedImage } from './lib/image';
import { analyzeFood, checkAvailability, prepareModel, type ModelState } from './lib/localModel';
import { TONE_COLOR, dayKey, defaultMeta, intake, mealInfo, scoreTone } from './lib/meal';
import { SAMPLE_RESULT, SAMPLE_THUMB } from './lib/sample';
import type { MealMeta, ScanHistoryItem } from './lib/types';

type View = 'scan' | 'history' | 'charts' | 'guide';
type Phase =
  | { kind: 'empty' }
  | { kind: 'ready' }
  | { kind: 'working'; chars: number }
  | { kind: 'done'; id: string }
  | { kind: 'sample' }
  | { kind: 'error'; message: string };

const NAV: { id: View; label: string; icon: IconName }[] = [
  { id: 'scan', label: '記錄一餐', icon: 'camera' },
  { id: 'history', label: '飲食紀錄', icon: 'list' },
  { id: 'charts', label: '健康圖表', icon: 'chart' },
  { id: 'guide', label: '本地模型', icon: 'info' },
];

const readView = (): View => {
  const h = location.hash.replace('#', '');
  return h === 'history' || h === 'charts' || h === 'guide' ? h : 'scan';
};

export default function App() {
  const [view, setView] = useState<View>(readView);
  const [modelState, setModelState] = useState<ModelState>('checking');
  const [progress, setProgress] = useState<number | null>(null);
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [photoTime, setPhotoTime] = useState<Date | undefined>();
  const [meta, setMeta] = useState<MealMeta>(defaultMeta);
  const [phase, setPhase] = useState<Phase>({ kind: 'empty' });
  const [history, setHistory] = useState<ScanHistoryItem[]>(loadHistory);
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const knownPlaces = useMemo(
    () => [...new Set(history.filter((h) => !h.isSample).map((h) => h.meta.placeName).filter((p): p is string => !!p))],
    [history],
  );

  useEffect(() => {
    checkAvailability().then(setModelState);
    const onHash = () => {
      setView(readView());
      setOpenedId(null);
      setEditing(false);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (v: View) => {
    location.hash = v === 'scan' ? '' : v;
    setView(v);
    setOpenedId(null);
    setEditing(false);
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
      const now = new Date();
      const shot = file.lastModified ? new Date(file.lastModified) : undefined;
      // 相簿裡的舊照片：提供「照片拍攝時間」
      setPhotoTime(shot && Math.abs(now.getTime() - shot.getTime()) > 30 * 60 * 1000 ? shot : undefined);
      setMeta((m) => ({ ...defaultMeta(now), placeType: m.placeType, placeName: m.placeName, companion: m.companion }));
      setPhase({ kind: 'ready' });
      setEditing(false);
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
      setOpenedId(null);
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
        context: { notes: meta.notes, placeName: meta.placeName, mealLabel: mealInfo(meta.mealType).label },
        signal: ctrl.signal,
        onToken: (chars) => setPhase({ kind: 'working', chars }),
      });
      const saved = addHistory(image.thumbnail, result, meta);
      setHistory(saved.items);
      setPhase({ kind: 'done', id: saved.id });
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
            ? '這版 Chrome 的內建模型還不支援圖片輸入，請到「本地模型」頁開啟多模態設定。'
            : `辨識失敗：${e instanceof Error ? e.message : String(e)}`;
      setPhase({ kind: 'error', message: msg });
    } finally {
      abortRef.current = null;
    }
  };

  const reset = () => {
    if (image) URL.revokeObjectURL(image.previewUrl);
    setImage(null);
    setPhotoTime(undefined);
    setMeta(defaultMeta());
    setPhase({ kind: 'empty' });
    setEditing(false);
  };

  const saveMeta = (id: string, m: MealMeta) => {
    setHistory(updateMeta(id, m));
    setEditing(false);
  };

  const toggleSample = (on: boolean) => setHistory(on ? addSampleData() : removeSampleData());

  const canRun = modelState === 'available' || modelState === 'downloadable';
  const doneItem = phase.kind === 'done' ? history.find((h) => h.id === phase.id) : undefined;
  const openedItem = openedId ? history.find((h) => h.id === openedId) : undefined;
  const sampleItem: ScanHistoryItem = {
    id: 'preview',
    thumbnail: SAMPLE_THUMB,
    analysisResult: SAMPLE_RESULT,
    timestamp: new Date().toISOString(),
    meta,
    isSample: true,
  };
  const recent = history.filter((h) => !h.isSample).slice(0, 4);
  const todayKey = dayKey(new Date());
  const todayMeals = history.filter((h) => !h.isSample && dayKey(new Date(h.meta.eatenAt)) === todayKey);
  const todayAvg = todayMeals.length ? todayMeals.reduce((s, h) => s + h.analysisResult.sugarFriendlyScore, 0) / todayMeals.length : 0;
  const today = new Date().toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' });

  return (
    <>
      <div className="shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go('scan');
          }}
        >
          <span className="brand-mark" aria-hidden="true">
            <Icon name="leaf" size={18} />
          </span>
          <span>
            <span className="brand-name">糖友善</span>
            <span className="brand-sub">飲食紀錄</span>
          </span>
        </a>
        <nav className="nav" aria-label="主要">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={`#${n.id === 'scan' ? '' : n.id}`}
              className="nav-item"
              aria-current={view === n.id ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault();
                go(n.id);
              }}
            >
              <Icon name={n.icon} size={20} />
              <span>{n.label}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          <ModelStatus state={modelState} progress={progress} onDownload={() => download().catch(() => {})} onHelp={() => go('guide')} />
          <p>資料只存在這個瀏覽器。內容僅供飲食記錄參考，不能取代醫療建議。</p>
        </div>
      </aside>

      <main className="page">
        {view === 'scan' && (
          <>
            {phase.kind === 'empty' && (
              <>
                <PageHead eyebrow={today} title="今天吃了什麼？">
                  拍下或貼上這一餐，Chrome 內建的 Gemini Nano 會在你的電腦上估算熱量與碳水，照片不會上傳。
                </PageHead>
                <dl className="today">
                  <div>
                    <dt>今天已記錄</dt>
                    <dd>
                      {todayMeals.length}
                      <small>餐</small>
                    </dd>
                  </div>
                  <div>
                    <dt>熱量</dt>
                    <dd>
                      {Math.round(todayMeals.reduce((s, h) => s + intake(h).calories, 0)).toLocaleString()}
                      <small>大卡</small>
                    </dd>
                  </div>
                  <div>
                    <dt>碳水</dt>
                    <dd>
                      {Math.round(todayMeals.reduce((s, h) => s + intake(h).carbs, 0))}
                      <small>克</small>
                    </dd>
                  </div>
                  <div>
                    <dt>平均糖友善度</dt>
                    <dd style={todayMeals.length ? { color: TONE_COLOR[scoreTone(todayAvg)] } : undefined}>
                      {todayMeals.length ? todayAvg.toFixed(1) : '—'}
                    </dd>
                  </div>
                </dl>
                <div className="home">
                  <Dropzone onFile={onFile} />
                  <aside className="home-aside">
                    <h2 className="side-title">最近幾餐</h2>
                    {recent.length === 0 ? (
                      <p className="fine">還沒有紀錄。第一餐記下來之後，會出現在這裡。</p>
                    ) : (
                      <ul className="mini-list">
                        {recent.map((h) => (
                          <li key={h.id}>
                            <button
                              type="button"
                              onClick={() => {
                                go('history');
                                setOpenedId(h.id);
                              }}
                            >
                              <img src={h.thumbnail} alt="" />
                              <span className="mini-meal" style={{ ['--meal' as string]: mealInfo(h.meta.mealType).color }}>
                                {mealInfo(h.meta.mealType).label}
                              </span>
                              <span className="mini-name">{h.analysisResult.foodName}</span>
                              <span className="mini-score" style={{ color: TONE_COLOR[scoreTone(h.analysisResult.sugarFriendlyScore)] }}>
                                {h.analysisResult.sugarFriendlyScore}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <h2 className="side-title">記錄的順序</h2>
                    <ol className="side-steps">
                      <li>放一張照片：選檔、拍照或 Ctrl + V</li>
                      <li>補上時間、餐別、地點，有量血糖就一起填</li>
                      <li>按「開始辨識」，結果會存進紀錄與圖表</li>
                    </ol>
                  </aside>
                </div>
              </>
            )}

            {image && (phase.kind === 'ready' || phase.kind === 'working' || phase.kind === 'error') && (
              <>
                <PageHead eyebrow="記錄一餐" title="補上這一餐的資訊">
                  資訊越完整，之後的圖表越有參考價值。只有照片是必要的。
                </PageHead>
                <div className="compose">
                  <div className="compose-photo">
                    <figure className="photo">
                      <img src={image.previewUrl} alt="待辨識的餐點" />
                      {phase.kind === 'working' && (
                        <figcaption className="working" role="status">
                          <span className="spinner" aria-hidden="true" />
                          {modelState === 'downloading'
                            ? `正在下載模型 ${progress !== null ? Math.round(progress * 100) + '%' : ''}`
                            : phase.chars === 0
                              ? '模型正在看這張照片⋯'
                              : `正在寫分析（${phase.chars} 字）`}
                        </figcaption>
                      )}
                    </figure>
                    <p className="fine">
                      換照片：直接 <kbd>Ctrl</kbd> + <kbd>V</kbd> 貼上新的，或
                      <button type="button" className="link-btn" onClick={reset} disabled={phase.kind === 'working'}>
                        重新選擇
                      </button>
                    </p>
                  </div>

                  <div className="compose-form">
                    <MealForm value={meta} onChange={setMeta} knownPlaces={knownPlaces} photoTime={photoTime} disabled={phase.kind === 'working'} />

                    {phase.kind === 'error' && <p className="alert">{phase.message}</p>}

                    <div className="action-bar">
                      {phase.kind === 'working' ? (
                        <button type="button" className="btn btn-quiet" onClick={() => abortRef.current?.abort()}>
                          取消
                        </button>
                      ) : (
                        <button type="button" className="btn btn-primary" disabled={!canRun} onClick={run}>
                          {modelState === 'downloadable' ? '下載模型並辨識' : '開始辨識'}
                        </button>
                      )}
                      {!canRun && modelState !== 'checking' && modelState !== 'downloading' && (
                        <span className="fine">
                          這個瀏覽器還不能用本地模型。
                          <button type="button" className="link-btn" onClick={() => go('guide')}>
                            怎麼開啟
                          </button>
                          ・
                          <button type="button" className="link-btn" onClick={() => setPhase({ kind: 'sample' })}>
                            先看範例
                          </button>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {phase.kind === 'error' && !image && (
              <p className="alert">
                {phase.message}{' '}
                <button type="button" className="link-btn" onClick={reset}>
                  重新選擇
                </button>
              </p>
            )}

            {(doneItem || phase.kind === 'sample') && (
              <>
                {doneItem && !editing && (
                  <p className="saved">
                    <Icon name="check" size={16} /> 已存進飲食紀錄
                  </p>
                )}
                <ResultSheet item={doneItem ?? sampleItem} onEdit={doneItem && !editing ? () => setEditing(true) : undefined} />
                {doneItem && editing && (
                  <MetaEditor item={doneItem} knownPlaces={knownPlaces} onSave={(m) => saveMeta(doneItem.id, m)} onCancel={() => setEditing(false)} />
                )}
                <div className="page-foot">
                  <button type="button" className="btn btn-primary" onClick={reset}>
                    再記一餐
                  </button>
                  {doneItem && (
                    <button type="button" className="btn btn-quiet" onClick={() => go('charts')}>
                      看健康圖表
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {view === 'history' &&
          (openedItem ? (
            <>
              <button
                type="button"
                className="back"
                onClick={() => {
                  setOpenedId(null);
                  setEditing(false);
                }}
              >
                ← 飲食紀錄
              </button>
              <ResultSheet item={openedItem} onEdit={!editing ? () => setEditing(true) : undefined} />
              {editing && (
                <MetaEditor item={openedItem} knownPlaces={knownPlaces} onSave={(m) => saveMeta(openedItem.id, m)} onCancel={() => setEditing(false)} />
              )}
            </>
          ) : (
            <HistoryList
              items={history}
              onOpen={(it) => {
                setOpenedId(it.id);
                window.scrollTo({ top: 0 });
              }}
              onRemove={(id) => setHistory(removeHistory(id))}
              onClear={() => setHistory(clearHistory())}
              onSample={toggleSample}
            />
          ))}

        {view === 'charts' && <HealthCharts items={history} onSample={toggleSample} />}

        {view === 'guide' && <Guide state={modelState} />}
      </main>
      </div>
    </>
  );
}

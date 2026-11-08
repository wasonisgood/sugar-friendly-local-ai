import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import ChatComposer from './ChatComposer';
import ChatMessageView from './ChatMessage';
import Icon from './Icon';
import PageHead from './PageHead';
import { ask, type ChatMsg } from '../lib/chatModel';
import { loadChat, saveChat } from '../lib/chatStore';
import { NO_IMAGE_MESSAGE, isEdge, type ModelState } from '../lib/localModel';
import { prepareImage, type PreparedImage } from '../lib/image';
import { MODES, type Mode } from '../lib/modes';
import { buildDoc, readFileText, type KnowledgeDoc } from '../lib/rag';
import { canListen, canSpeak, listen, speak, stopSpeaking } from '../lib/voice';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const SUGGESTIONS: Record<Mode, string[]> = {
  sugar: ['早餐吃什麼比較不會讓血糖衝太高？', '含糖飲料可以用什麼替代？', '餐後散步要走多久比較有幫助？', '血糖紀錄要怎麼看出趨勢？'],
  glp1: ['打針後食慾下降，怎麼吃才夠蛋白質？', '噁心的時候該怎麼調整飲食？', '一餐大概吃多少份量比較合適？', '體重停滯時，紀錄要怎麼看？'],
};

const DESC: Record<Mode, string> = {
  sugar: '問飲食、血糖與生活習慣的問題。可以附上照片、上傳衛教資料，也可以用語音提問。',
  glp1: '問蛋白質、份量、腸胃不適與體重紀錄的問題。可以附上照片、上傳衛教資料，也可以用語音提問。',
};

function ModelBanner({ state, progress, onDownload }: { state: ModelState; progress: number | null; onDownload: () => void }) {
  if (state === 'available') return null;
  let text = '';
  let action: ReactNode = null;
  if (state === 'checking') text = '正在檢查本地模型⋯';
  else if (state === 'unsupported')
    text = isEdge()
      ? '這個 Edge 版本找不到 Prompt API。請使用 Edge 的 Dev 或 Canary 版，並依「本地模型」頁開啟 edge://flags 的設定。'
      : '這個瀏覽器不支援本地 AI。請使用 Chrome 138 以上版本，並依「本地模型」頁的說明開啟設定。';
  else if (state === 'unavailable') text = '這台電腦目前無法執行本地模型，請參考「本地模型」頁的說明。';
  else if (state === 'downloading') text = `正在下載本地模型 ${Math.round((progress ?? 0) * 100)}%，完成後就能開始問答。`;
  else {
    text = '問答需要先下載本地模型（約 2 GB，只需一次）。';
    action = (
      <button type="button" className="btn-small" onClick={onDownload}>
        現在下載
      </button>
    );
  }
  return (
    <div className="chat-banner" role="status">
      <span>{text}</span>
      {action}
    </div>
  );
}

export default function ChatPage({
  mode,
  modelState,
  progress,
  onDownload,
}: {
  mode: Mode;
  modelState: ModelState;
  progress: number | null;
  onDownload: () => void;
}) {
  const [msgs, setMsgs] = useState<ChatMsg[]>(() => loadChat(mode));
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [docNote, setDocNote] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState<PreparedImage | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const threadRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stopListenRef = useRef<(() => void) | null>(null);
  const imageBlobs = useRef(new Map<string, Blob>());
  const docFileRef = useRef<HTMLInputElement>(null);
  const micOk = canListen();
  const imageOk = !isEdge();
  const speakOk = canSpeak();
  const busy = busyId !== null;

  // 捲到最新訊息
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  // 離開頁面或切換模式時停止一切
  useEffect(
    () => () => {
      abortRef.current?.abort();
      stopListenRef.current?.();
      stopSpeaking();
      if (pending) URL.revokeObjectURL(pending.previewUrl);
    },
    // 只在卸載時清理
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const persist = (list: ChatMsg[]) => {
    setMsgs(list);
    saveChat(mode, list);
  };

  /** prefix 是包含最新使用者問題在內的所有訊息，後面接一則新的助理回答 */
  const run = async (prefix: ChatMsg[], image?: Blob) => {
    const question = prefix[prefix.length - 1];
    const asst: ChatMsg = { id: uid(), role: 'assistant', text: '', createdAt: Date.now() };
    const next = [...prefix, asst];
    setMsgs(next);
    setBusyId(asst.id);
    setAlert(null);

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let partial = '';
    let final: ChatMsg[];
    try {
      const res = await ask({
        mode,
        history: prefix.slice(0, -1),
        question: question.text,
        image,
        docs,
        signal: ctrl.signal,
        onToken: (t) => {
          partial = t;
          setMsgs((prev) => prev.map((m) => (m.id === asst.id ? { ...m, text: t } : m)));
        },
      });
      final = next.map((m) =>
        m.id === asst.id ? { ...m, text: res.text || '（沒有產生內容，請換個方式再問）', sources: res.sources } : m,
      );
    } catch (e) {
      const err = e as Error;
      if (err.name === 'AbortError') {
        final = next.map((m) => (m.id === asst.id ? { ...m, text: partial || '已停止產生。' } : m));
      } else {
        const msg =
          err.name === 'QuotaExceededError'
            ? '對話內容太長了，請按上方「清除對話」後再試。'
            : err.name === 'NotSupportedError'
              ? image
                ? NO_IMAGE_MESSAGE()
                : '內建模型拒絕了這次的請求設定，請重新整理頁面後再試。'
              : `產生回答時發生錯誤：${err.message}`;
        final = next.map((m) => (m.id === asst.id ? { ...m, text: msg, error: true } : m));
      }
    }
    abortRef.current = null;
    setBusyId(null);
    persist(final);
  };

  const send = () => {
    const q = input.trim();
    if ((!q && !pending) || busy) return;
    if (modelState !== 'available') {
      setAlert('請先下載本地模型，才能開始問答。');
      return;
    }
    const user: ChatMsg = {
      id: uid(),
      role: 'user',
      text: q || '請看這張圖片，說明跟飲食或健康有關的重點。',
      createdAt: Date.now(),
    };
    let image: Blob | undefined;
    if (pending) {
      image = pending.blob;
      imageBlobs.current.set(user.id, pending.blob);
      setThumbs((t) => ({ ...t, [user.id]: pending.thumbnail }));
      URL.revokeObjectURL(pending.previewUrl);
      setPending(null);
    }
    setInput('');
    void run([...msgs, user], image);
  };

  const regenerate = (assistantId: string) => {
    if (busy) return;
    const i = msgs.findIndex((m) => m.id === assistantId);
    if (i < 1 || msgs[i - 1].role !== 'user') return;
    const prefix = msgs.slice(0, i);
    void run(prefix, imageBlobs.current.get(prefix[prefix.length - 1].id));
  };

  const stop = () => abortRef.current?.abort();

  const remove = (id: string) => {
    if (busyId === id) stop();
    persist(msgs.filter((m) => m.id !== id));
  };

  const clearAll = () => {
    if (!msgs.length) return;
    if (!window.confirm('清除這個模式的所有對話？')) return;
    stop();
    imageBlobs.current.clear();
    setThumbs({});
    persist([]);
  };

  const copy = async (m: ChatMsg) => {
    try {
      await navigator.clipboard.writeText(m.text);
      setCopiedId(m.id);
      window.setTimeout(() => setCopiedId((c) => (c === m.id ? null : c)), 1500);
    } catch {
      setAlert('無法複製，請手動選取文字複製。');
    }
  };

  const toggleSpeak = (m: ChatMsg) => {
    if (speakingId === m.id) {
      stopSpeaking();
      setSpeakingId(null);
      return;
    }
    setSpeakingId(m.id);
    speak(m.text, () => setSpeakingId((cur) => (cur === m.id ? null : cur)));
  };

  const toggleListen = () => {
    if (listening) {
      stopListenRef.current?.();
      return;
    }
    setAlert(null);
    setListening(true);
    stopListenRef.current = listen({
      onInterim: (t) => setInterim(t),
      onFinal: (t) => setInput((prev) => (prev ? `${prev} ${t}` : t)),
      onError: (m) => setAlert(m),
      onEnd: () => {
        setListening(false);
        setInterim('');
        stopListenRef.current = null;
      },
    });
  };

  const pickImage = async (f: File) => {
    try {
      const p = await prepareImage(f);
      setPending((old) => {
        if (old) URL.revokeObjectURL(old.previewUrl);
        return p;
      });
    } catch {
      setAlert('無法讀取這張圖片，請換一張試試。');
    }
  };

  const onDocFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;
    setReading(true);
    setDocNote(null);
    const added: KnowledgeDoc[] = [];
    const errors: string[] = [];
    for (const f of files) {
      try {
        const text = await readFileText(f);
        if (!text.trim()) throw new Error('沒有可讀取的文字（掃描檔需要先做 OCR）');
        added.push(buildDoc(f.name, text));
      } catch (err) {
        errors.push(`${f.name}：${(err as Error).message}`);
      }
    }
    setDocs((prev) => [...prev, ...added]);
    setDocNote(errors.length ? errors.join('；') : `已加入 ${added.length} 份文件，提問時會自動參考。`);
    setReading(false);
  };

  const totalChunks = docs.reduce((n, d) => n + d.chunks.length, 0);

  return (
    <>
      <PageHead
        eyebrow={<>健康小助理・{MODES[mode].name}</>}
        title="想問什麼，直接問"
        aside={
          msgs.length > 0 ? (
            <button type="button" className="link-btn" onClick={clearAll}>
              清除對話
            </button>
          ) : null
        }
      >
        {DESC[mode]}
      </PageHead>

      <ModelBanner state={modelState} progress={progress} onDownload={onDownload} />

      <div className="chat-wrap">
        <section className="chat-main" aria-label="對話">
          <div className="chat-thread" ref={threadRef} role="log" aria-live="polite">
            {msgs.length === 0 ? (
              <div className="chat-empty">
                <span className="chat-empty-mark" aria-hidden="true">
                  <Icon name="leaf" size={26} />
                </span>
                <h2>今天想了解什麼？</h2>
                <p className="muted small">可以直接打字、語音提問，也可以附上照片或上傳衛教資料。</p>
                <div className="chat-chips">
                  {SUGGESTIONS[mode].map((s) => (
                    <button key={s} type="button" className="chat-chip" onClick={() => setInput(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              msgs.map((m, i) => (
                <ChatMessageView
                  key={m.id}
                  msg={m}
                  thumb={thumbs[m.id]}
                  streaming={busyId === m.id}
                  isLastAssistant={m.role === 'assistant' && i === msgs.length - 1}
                  speaking={speakingId === m.id}
                  copied={copiedId === m.id}
                  canSpeak={speakOk}
                  onCopy={() => copy(m)}
                  onSpeak={() => toggleSpeak(m)}
                  onRegen={() => regenerate(m.id)}
                  onDelete={() => remove(m.id)}
                />
              ))
            )}
          </div>

          {alert && (
            <p className="chat-alert" role="alert">
              {alert}
            </p>
          )}

          <ChatComposer
            input={input}
            onInput={setInput}
            pending={pending}
            onPickImage={pickImage}
            onClearImage={() =>
              setPending((old) => {
                if (old) URL.revokeObjectURL(old.previewUrl);
                return null;
              })
            }
            busy={busy}
            onSend={send}
            onStop={stop}
            listening={listening}
            interim={interim}
            canListen={micOk}
            canImage={imageOk}
            onToggleListen={toggleListen}
          />
        </section>

        <aside className="chat-side" aria-label="知識文件">
          <div>
            <h2>知識文件</h2>
            <p className="fine">上傳衛教資料、院所說明或飲食手冊（PDF、TXT、Markdown、CSV、JSON）。提問時會先找出相關段落，再由助理回答並標註來源。</p>
          </div>

          <button type="button" className="upload-btn" onClick={() => docFileRef.current?.click()} disabled={reading}>
            <Icon name="upload" size={20} />
            <span>{reading ? '讀取中⋯' : '選擇文件'}</span>
          </button>
          <input
            ref={docFileRef}
            type="file"
            accept=".pdf,.txt,.md,.markdown,.csv,.json,.log,application/pdf,text/*"
            multiple
            hidden
            onChange={onDocFiles}
          />

          {docs.length > 0 ? (
            <>
              <ul className="doc-list">
                {docs.map((d) => (
                  <li key={d.id} className="doc-item">
                    <span>
                      <b>{d.name}</b>
                      <br />
                      <span className="fine">
                        {d.chunks.length} 段・約 {Math.round(d.chars / 100) / 10} 萬字
                      </span>
                    </span>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`移除 ${d.name}`}
                      onClick={() => setDocs((prev) => prev.filter((x) => x.id !== d.id))}
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </li>
                ))}
              </ul>
              <p className="fine">目前共 {totalChunks} 段可供檢索。</p>
            </>
          ) : (
            <p className="fine">還沒有文件，問題會以一般知識回答。</p>
          )}

          {docNote && (
            <p className="fine" role="status">
              {docNote}
            </p>
          )}
          <p className="fine">文件只保存在這次開啟的頁面中，重新整理後需要重新上傳。</p>
        </aside>
      </div>
    </>
  );
}

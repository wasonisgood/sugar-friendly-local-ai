import { useRef, type KeyboardEvent } from 'react';
import Icon from './Icon';
import type { PreparedImage } from '../lib/image';

interface Props {
  input: string;
  onInput: (v: string) => void;
  pending: PreparedImage | null;
  onPickImage: (f: File) => void;
  onClearImage: () => void;
  busy: boolean;
  onSend: () => void;
  onStop: () => void;
  listening: boolean;
  interim: string;
  canListen: boolean;
  canImage: boolean;
  onToggleListen: () => void;
}

export default function ChatComposer(p: Props) {
  const imageRef = useRef<HTMLInputElement>(null);
  const canSend = !p.busy && (p.input.trim().length > 0 || !!p.pending);

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (canSend) p.onSend();
    }
  };

  return (
    <div className="chat-composer">
      {p.pending && (
        <div className="chat-attach-row">
          <div className="chat-thumb">
            <img src={p.pending.previewUrl} alt="待送出的圖片" />
            <button type="button" className="chat-thumb-x" onClick={p.onClearImage} aria-label="移除圖片">
              <Icon name="close" size={12} />
            </button>
          </div>
        </div>
      )}
      {p.listening && (
        <p className="chat-interim" role="status">
          正在聆聽{p.interim ? `：${p.interim}` : '…（說完會自動停止）'}
        </p>
      )}
      <div className="chat-input-row">
        <button
          type="button"
          className="chat-tool"
          onClick={() => imageRef.current?.click()}
          disabled={p.busy || !p.canImage}
          aria-label="附加圖片"
          title={p.canImage ? '附加圖片（食物或包裝照片）' : 'Edge 目前不支援圖片輸入，請改用 Chrome'}
        >
          <Icon name="image" size={18} />
        </button>
        <input
          ref={imageRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) p.onPickImage(f);
          }}
        />
        <textarea
          className="chat-input"
          rows={1}
          value={p.input}
          placeholder="輸入你的問題，例如：晚餐吃麵，怎麼搭配比較好？"
          aria-label="輸入問題"
          onChange={(e) => p.onInput(e.target.value)}
          onKeyDown={onKey}
        />
        <button
          type="button"
          className={`chat-tool${p.listening ? ' is-on' : ''}`}
          onClick={p.onToggleListen}
          disabled={!p.canListen || p.busy}
          aria-pressed={p.listening}
          aria-label={p.listening ? '停止語音輸入' : '語音輸入'}
          title={p.canListen ? '語音輸入（中文）' : '這個瀏覽器不支援語音輸入，請改用 Chrome'}
        >
          <Icon name="mic" size={18} />
        </button>
        {p.busy ? (
          <button type="button" className="chat-send is-stop" onClick={p.onStop} aria-label="停止產生">
            <Icon name="stop" size={16} />
          </button>
        ) : (
          <button type="button" className="chat-send" onClick={p.onSend} disabled={!canSend} aria-label="送出">
            <Icon name="send" size={18} />
          </button>
        )}
      </div>
      <p className="chat-foot">AI 回答僅供參考，不能取代醫師診斷或藥物建議。語音輸入由瀏覽器的語音辨識處理，音訊會傳給 Google。</p>
    </div>
  );
}

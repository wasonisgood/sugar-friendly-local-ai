import { useRef, useState } from 'react';
import { ClipboardImageError, readClipboardImage } from '../lib/clipboard';

export default function Dropzone({ onFile, disabled }: { onFile: (f: File) => void; disabled?: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFile(f);
    e.target.value = '';
  };

  const pasteFromClipboard = async () => {
    setNotice(null);
    try {
      onFile(await readClipboardImage());
    } catch (e) {
      setNotice(e instanceof ClipboardImageError ? e.message : '讀取剪貼簿失敗，請改用 Ctrl + V。');
    }
  };

  return (
    <div
      className={`drop${over ? ' is-over' : ''}${disabled ? ' is-disabled' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = Array.from(e.dataTransfer.files).find((x) => x.type.startsWith('image/'));
        if (f && !disabled) onFile(f);
      }}
    >
      <svg className="drop-art" viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="46" rx="50" ry="26" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <ellipse cx="60" cy="44" rx="34" ry="16" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
        <path d="M14 20 l6 -10 M106 20 l-6 -10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <p className="drop-title">把餐點照片拖到這裡</p>
      <p className="drop-sub">
        或在頁面任何地方按 <kbd>Ctrl</kbd> + <kbd>V</kbd> 貼上
      </p>
      <div className="drop-actions">
        <button type="button" className="btn btn-primary" disabled={disabled} onClick={() => fileRef.current?.click()}>
          選擇照片
        </button>
        <button type="button" className="btn btn-outline" disabled={disabled} onClick={pasteFromClipboard}>
          從剪貼簿貼上
        </button>
        <button type="button" className="btn btn-outline" disabled={disabled} onClick={() => cameraRef.current?.click()}>
          用相機拍
        </button>
      </div>
      {notice && (
        <p className="drop-notice" role="alert">
          {notice}
        </p>
      )}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
    </div>
  );
}

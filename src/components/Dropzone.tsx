import { useRef, useState } from 'react';
import { ClipboardImageError, readClipboardImage } from '../lib/clipboard';
import Icon from './Icon';

/** 上傳既有的照片檔：拖放、選檔、貼上。拍照另見 CameraCapture */
export default function Dropzone({ onFile, disabled }: { onFile: (f: File) => void; disabled?: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
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
      <span className="drop-icon" aria-hidden="true">
        <Icon name="upload" size={28} />
      </span>
      <p className="drop-title">上傳照片</p>
      <p className="drop-sub">
        把照片檔拖到這裡，或在頁面任何地方按 <kbd>Ctrl</kbd> + <kbd>V</kbd> 貼上
      </p>
      <div className="drop-actions">
        <button type="button" className="btn btn-primary" disabled={disabled} onClick={() => fileRef.current?.click()}>
          選擇檔案
        </button>
        <button type="button" className="btn btn-quiet" disabled={disabled} onClick={pasteFromClipboard}>
          從剪貼簿貼上
        </button>
      </div>
      {notice && (
        <p className="drop-notice" role="alert">
          {notice}
        </p>
      )}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
    </div>
  );
}

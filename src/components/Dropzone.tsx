import { useEffect, useRef, useState } from 'react';

export default function Dropzone({ onFile, disabled }: { onFile: (f: File) => void; disabled?: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  // 直接 Ctrl+V 貼上截圖
  useEffect(() => {
    if (disabled) return;
    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith('image/'));
      if (file) onFile(file);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [onFile, disabled]);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFile(f);
    e.target.value = '';
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
      <p className="drop-sub">也可以直接 Ctrl + V 貼上截圖</p>
      <div className="drop-actions">
        <button type="button" className="btn" disabled={disabled} onClick={() => fileRef.current?.click()}>
          選擇照片
        </button>
        <button type="button" className="btn btn-ghost" disabled={disabled} onClick={() => cameraRef.current?.click()}>
          用相機拍
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
    </div>
  );
}

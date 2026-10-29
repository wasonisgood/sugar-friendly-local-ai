import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icon';

type Facing = 'user' | 'environment';

const ERRORS: Record<string, string> = {
  NotAllowedError: '沒有取得相機權限。請點網址列左邊的圖示，允許這個網站使用相機後再試一次。',
  NotFoundError: '找不到可用的相機。',
  NotReadableError: '相機正被其他程式使用中，請先關閉視訊會議等程式。',
  OverconstrainedError: '這個鏡頭無法使用，請試試切換鏡頭。',
  SecurityError: '瀏覽器封鎖了相機。相機只能在 https 或 localhost 上使用。',
};

export default function CameraCapture({ onCapture, onClose }: { onCapture: (f: File) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fallbackRef = useRef<HTMLInputElement>(null);
  const [facing, setFacing] = useState<Facing>('user');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canSwitch, setCanSwitch] = useState(false);
  const [flash, setFlash] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('這個瀏覽器不支援在網頁裡開相機。');
        return;
      }
      stop();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play();
        setReady(true);
        const devices = await navigator.mediaDevices.enumerateDevices();
        setCanSwitch(devices.filter((d) => d.kind === 'videoinput').length > 1);
      } catch (e) {
        if (!cancelled) setError(ERRORS[(e as DOMException).name] ?? `無法開啟相機（${(e as Error).message}）`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [facing, stop]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      stop();
    };
  }, [onClose, stop]);

  const shoot = () => {
    const v = videoRef.current;
    if (!v || !ready) return;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext('2d')!.drawImage(v, 0, 0);
    setFlash(true);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stop();
        onCapture(new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.92,
    );
  };

  return (
    <div className="camera" role="dialog" aria-modal="true" aria-label="用相機拍">
      <div className="camera-top">
        <span>{facing === 'user' ? '前鏡頭' : '後鏡頭'}</span>
        <button type="button" className="camera-x" aria-label="關閉相機" onClick={onClose}>
          <Icon name="close" size={22} />
        </button>
      </div>

      <div className="camera-stage">
        <video ref={videoRef} playsInline muted className={facing === 'user' ? 'is-mirror' : undefined} />
        {!ready && !error && (
          <div className="camera-wait">
            <span className="spinner spinner-light" />
            正在開啟相機⋯
          </div>
        )}
        {ready && <div className="camera-guide" aria-hidden="true" />}
        {flash && <div className="camera-flash" onAnimationEnd={() => setFlash(false)} />}
        {error && (
          <div className="camera-error">
            <p>{error}</p>
            <button type="button" className="btn btn-light" onClick={() => fallbackRef.current?.click()}>
              改用系統相機或相簿
            </button>
          </div>
        )}
      </div>

      <div className="camera-bar">
        <button type="button" className="camera-side" onClick={onClose}>
          取消
        </button>
        <button type="button" className="shutter" aria-label="拍照" disabled={!ready} onClick={shoot}>
          <span />
        </button>
        <button
          type="button"
          className="camera-side"
          disabled={!canSwitch}
          onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}
          title={canSwitch ? '切換前後鏡頭' : '只偵測到一個鏡頭'}
        >
          <Icon name="switch" size={22} />
          切換
        </button>
      </div>

      <input
        ref={fallbackRef}
        type="file"
        accept="image/*"
        capture="user"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onCapture(f);
        }}
      />
    </div>
  );
}

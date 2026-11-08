// 語音輸入與朗讀（Web Speech API）。
// 注意：Chrome 的語音辨識會把音訊送到 Google 伺服器處理，這和本地 AI 的「照片不離開電腦」不同。

interface RecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type RecognitionCtor = new () => RecognitionLike;

function recognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const canListen = () => recognitionCtor() !== null;

const ERRORS: Record<string, string> = {
  'not-allowed': '麥克風權限被拒絕，請在網址列左側允許麥克風',
  'service-not-allowed': '這個瀏覽器不允許語音辨識服務，請改用 Chrome',
  'no-speech': '沒有聽到聲音，請再試一次',
  'audio-capture': '找不到麥克風',
  network: '語音辨識需要網路連線',
};

/** 開始聆聽。回傳停止函式；辨識結束時一定會呼叫 onEnd。 */
export function listen(h: {
  onInterim: (t: string) => void;
  onFinal: (t: string) => void;
  onError: (m: string) => void;
  onEnd: () => void;
}): () => void {
  const Ctor = recognitionCtor();
  if (!Ctor) {
    h.onError('這個瀏覽器不支援語音輸入，請改用 Chrome');
    h.onEnd();
    return () => {};
  }
  const r = new Ctor();
  r.lang = 'zh-TW';
  r.continuous = false;
  r.interimResults = true;

  let finalText = '';
  let failed = false;
  r.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      if (res.isFinal) finalText += res[0].transcript;
      else interim += res[0].transcript;
    }
    h.onInterim(interim);
  };
  r.onerror = (e) => {
    failed = true;
    h.onError(ERRORS[e.error] ?? `語音辨識失敗（${e.error}）`);
  };
  r.onend = () => {
    if (finalText.trim() && !failed) h.onFinal(finalText.trim());
    h.onEnd();
  };
  try {
    r.start();
  } catch {
    h.onError('無法啟動語音辨識，請再試一次');
    h.onEnd();
  }
  return () => {
    try {
      r.stop();
    } catch {
      /* 已經停止 */
    }
  };
}

// ---- 朗讀 ----
const RATE_KEY = 'sugar-friendly:tts-rate';

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

export function loadRate(): number {
  try {
    const v = Number(localStorage.getItem(RATE_KEY));
    return v >= 0.5 && v <= 2 ? v : 1;
  } catch {
    return 1;
  }
}

export function saveRate(v: number) {
  try {
    localStorage.setItem(RATE_KEY, String(v));
  } catch {
    /* ignore */
  }
}

// 朗讀前去掉 markdown 符號與引用編號，聽起來比較自然
const forSpeech = (s: string) =>
  s
    .replace(/\[\d+\]/g, '')
    .replace(/\*\*/g, '')
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .trim();

export function speak(text: string, onEnd: () => void, rate = loadRate()) {
  if (!canSpeak()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(forSpeech(text));
  u.lang = 'zh-TW';
  u.rate = rate;
  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find((v) => v.lang.startsWith('zh-TW')) ?? voices.find((v) => v.lang.startsWith('zh'));
  if (voice) u.voice = voice;
  u.onend = onEnd;
  u.onerror = onEnd;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}

// 健康小助理（聊天）：使用同一個本地 Gemini Nano，但有自己的系統提示。
// 每次回答都從乾淨的基底 session 複製，歷史對話以訊息陣列帶入，文件參考段落附在問題後面。
import { IO as IO_IMAGE, IO_TEXT, hasPromptApi, isEdge } from './localModel';
import type { Mode } from './modes';
import { searchKnowledge, type KnowledgeDoc } from './rag';

export interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sources?: string[];
  error?: boolean;
  createdAt: number;
}

const HISTORY_TURNS = 6; // 帶入最近幾則訊息，控制上下文長度
const TURN_CHARS = 800; // 每則歷史訊息最多字數
const QUESTION_CHARS = 1500;
const TOP_K = 3; // 每次從文件取幾段

// Edge 的 session 只能宣告文字輸入；Chrome 才宣告圖片輸入
const IO = isEdge() ? IO_TEXT : IO_IMAGE;

const SHARED_RULES =
  '你是「糖友善」的健康小助理，用繁體中文（台灣用語）回答。回答要簡短、具體，條列時每點一句話。' +
  '你提供的是一般健康衛教資訊，不能診斷疾病，也不能開立、停止或調整任何藥物或胰島素劑量，遇到需要判斷的狀況請建議諮詢醫師或藥師。' +
  '若出現低血糖（心悸、冒冷汗、發抖、意識模糊）、胸痛、呼吸困難等急症，請立刻提醒就醫或撥打 119。' +
  '看不清楚或不確定的內容要直接說不知道，不要編造。' +
  '若問題附有「參考資料」，優先根據資料回答，並在相關句子後用 [1] [2] 標註來源編號；資料沒有提到的，說明這是一般知識。';

const PROFILE: Record<Mode, string> = {
  sugar: '主題重點：糖尿病或血糖管理相關的飲食選擇、餐後活動、血糖紀錄怎麼看、日常生活習慣。',
  glp1:
    '主題重點：使用 GLP-1 類減重針劑並控制飲食的人。常見問題包括蛋白質攝取、一餐份量、噁心與腹脹等腸胃不適、補水、體重與紀錄怎麼看。不推薦具體針劑劑量，也不建議自行調整用藥。',
};

export const systemPrompt = (mode: Mode) => `${SHARED_RULES}\n${PROFILE[mode]}`;

const bases = new Map<Mode, Promise<LanguageModelSession>>();

function base(mode: Mode): Promise<LanguageModelSession> {
  let s = bases.get(mode);
  if (!s) {
    s = LanguageModel!.create({
      ...IO,
      temperature: 0.6,
      initialPrompts: [{ role: 'system', content: systemPrompt(mode) }],
    });
    bases.set(mode, s);
    s.catch(() => {
      if (bases.get(mode) === s) bases.delete(mode);
    });
  }
  return s;
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

export interface AskOptions {
  mode: Mode;
  /** 本次問題之前的所有訊息（不含本次問題） */
  history: ChatMsg[];
  question: string;
  image?: Blob;
  docs: KnowledgeDoc[];
  signal?: AbortSignal;
  onToken: (text: string) => void;
}

export interface AskResult {
  text: string;
  sources: string[];
}

export async function ask(o: AskOptions): Promise<AskResult> {
  if (!hasPromptApi()) throw new Error('這個瀏覽器沒有 Prompt API');

  const hits = searchKnowledge(o.docs, o.question, TOP_K);
  const sources = [...new Set(hits.map((h) => `${h.chunk.docName} 第 ${h.chunk.index + 1} 段`))];
  const refBlock = hits.length
    ? `\n\n參考資料：\n${hits.map((h, i) => `[${i + 1}]（${h.chunk.docName}）${h.chunk.text}`).join('\n\n')}`
    : '';

  const messages: LanguageModelMessage[] = o.history
    .filter((m) => m.text && !m.error)
    .slice(-HISTORY_TURNS)
    .map((m) => ({ role: m.role, content: clip(m.text, TURN_CHARS) }));

  const content: LanguageModelMessageContent[] = [{ type: 'text', value: `${clip(o.question, QUESTION_CHARS)}${refBlock}` }];
  if (o.image) {
    if (isEdge()) throw Object.assign(new Error('Edge 目前不支援圖片輸入'), { name: 'NotSupportedError' });
    content.push({ type: 'image', value: o.image });
  }
  messages.push({ role: 'user', content });

  const session = await (await base(o.mode)).clone({ signal: o.signal });
  try {
    const stream = session.promptStreaming(messages, { signal: o.signal });
    let text = '';
    for await (const chunk of stream) {
      // 舊版 Chrome 每次回傳完整字串，新版只回傳增量
      text = chunk.startsWith(text) && text.length > 0 ? chunk : text + chunk;
      o.onToken(text);
    }
    return { text: text.trim(), sources };
  } finally {
    session.destroy();
  }
}

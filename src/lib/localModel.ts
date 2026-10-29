import type { FoodAnalysisResult } from './types';

export type ModelState = 'checking' | 'unsupported' | LanguageModelAvailability;

const SESSION_OPTIONS: LanguageModelCreateOptions = {
  expectedInputs: [{ type: 'text' }, { type: 'image' }],
  expectedOutputs: [{ type: 'text' }],
  initialPrompts: [
    {
      role: 'system',
      content:
        '你是台灣的臨床營養師，專門協助糖尿病患者評估餐點。' +
        '只根據照片中看得到的內容判斷，看不清楚時降低 confidence，不要編造。' +
        '所有文字一律使用繁體中文（台灣用語），句子簡短具體。',
    },
  ],
};

const RESPONSE_SCHEMA = {
  type: 'object',
  required: [
    'confidence', 'foodName', 'category', 'sugarFriendlyScore', 'healthScore',
    'nutritionalInfo', 'recommendations', 'warnings', 'diabeticAdvice',
    'generalHealthAdvice', 'portionSizeAdvice', 'healthBenefits',
  ],
  properties: {
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    foodName: { type: 'string' },
    category: { type: 'string' },
    sugarFriendlyScore: { type: 'integer', minimum: 0, maximum: 10 },
    healthScore: { type: 'integer', minimum: 0, maximum: 10 },
    nutritionalInfo: {
      type: 'object',
      required: ['calories', 'carbs', 'sugar', 'protein', 'fat', 'fiber', 'sodium'],
      properties: {
        calories: { type: 'number' },
        carbs: { type: 'number' },
        sugar: { type: 'number' },
        protein: { type: 'number' },
        fat: { type: 'number' },
        fiber: { type: 'number' },
        sodium: { type: 'number' },
      },
    },
    recommendations: { type: 'array', items: { type: 'string' }, maxItems: 4 },
    warnings: { type: 'array', items: { type: 'string' }, maxItems: 4 },
    diabeticAdvice: { type: 'string' },
    generalHealthAdvice: { type: 'string' },
    portionSizeAdvice: { type: 'string' },
    healthBenefits: { type: 'array', items: { type: 'string' }, maxItems: 4 },
  },
};

function buildPrompt(notes?: string): string {
  return [
    '請辨識這張照片裡的食物，並依 JSON 格式回覆：',
    '- foodName：食物名稱；若有多道菜，用「、」列出主要的幾道',
    '- category：主食／蛋白質／蔬菜／水果／飲料／甜點／混合餐 其中之一',
    '- confidence：辨識把握度 0 到 1',
    '- sugarFriendlyScore：糖友善度 0 到 10，10 最適合糖尿病患者',
    '- healthScore：整體健康度 0 到 10',
    '- nutritionalInfo：每 100 公克估算值，calories 大卡、carbs/sugar/protein/fat/fiber 公克、sodium 毫克',
    '- recommendations：給一般人的具體建議，最多 3 點',
    '- warnings：需要注意的風險，最多 3 點，沒有就給空陣列',
    '- diabeticAdvice：給糖尿病患者的一段建議',
    '- generalHealthAdvice：給一般人的一段建議',
    '- portionSizeAdvice：建議份量，用拳頭、手掌、碗等生活化單位描述',
    '- healthBenefits：這道食物的好處，最多 3 點',
    notes ? `\n使用者補充：${notes}` : '',
  ].join('\n');
}

export function hasPromptApi(): boolean {
  return typeof LanguageModel !== 'undefined';
}

export async function checkAvailability(): Promise<ModelState> {
  if (!hasPromptApi()) return 'unsupported';
  try {
    return await LanguageModel!.availability(SESSION_OPTIONS);
  } catch {
    return 'unavailable';
  }
}

let baseSession: Promise<LanguageModelSession> | null = null;

/** 建立（或下載）模型。第一次呼叫必須在使用者點擊之後。 */
export function prepareModel(onDownload?: (ratio: number) => void): Promise<LanguageModelSession> {
  if (!hasPromptApi()) return Promise.reject(new Error('這個瀏覽器沒有 Prompt API'));
  if (!baseSession) {
    baseSession = LanguageModel!.create({
      ...SESSION_OPTIONS,
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          onDownload?.((e as ProgressEvent).loaded);
        });
      },
    });
    baseSession.catch(() => {
      baseSession = null;
    });
  }
  return baseSession;
}

export async function analyzeFood(
  image: Blob,
  opts: { notes?: string; signal?: AbortSignal; onToken?: (charCount: number) => void } = {},
): Promise<FoodAnalysisResult> {
  const base = await prepareModel();
  // 每次分析都從乾淨的 session 複製，避免上一張照片影響判斷
  const session = await base.clone({ signal: opts.signal });
  try {
    const stream = session.promptStreaming(
      [
        {
          role: 'user',
          content: [
            { type: 'text', value: buildPrompt(opts.notes?.trim()) },
            { type: 'image', value: image },
          ],
        },
      ],
      { responseConstraint: RESPONSE_SCHEMA, signal: opts.signal },
    );

    let text = '';
    for await (const chunk of stream) {
      // 舊版 Chrome 每次回傳完整字串，新版只回傳增量
      text = chunk.startsWith(text) && text.length > 0 ? chunk : text + chunk;
      opts.onToken?.(text.length);
    }
    return normalize(JSON.parse(stripFences(text)));
  } finally {
    session.destroy();
  }
}

function stripFences(s: string): string {
  return s.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
}

const clamp = (n: unknown, lo: number, hi: number) => {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : Number(n);
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo;
};
const str = (s: unknown) => (typeof s === 'string' ? s.trim() : '');
const list = (a: unknown) => (Array.isArray(a) ? a.map(str).filter(Boolean) : []);

function normalize(raw: any): FoodAnalysisResult {
  const n = raw?.nutritionalInfo ?? {};
  return {
    confidence: clamp(raw?.confidence, 0, 1),
    foodName: str(raw?.foodName) || '無法確定的食物',
    category: str(raw?.category) || '未分類',
    sugarFriendlyScore: Math.round(clamp(raw?.sugarFriendlyScore, 0, 10)),
    healthScore: Math.round(clamp(raw?.healthScore, 0, 10)),
    nutritionalInfo: {
      calories: clamp(n.calories, 0, 2000),
      carbs: clamp(n.carbs, 0, 100),
      sugar: clamp(n.sugar, 0, 100),
      protein: clamp(n.protein, 0, 100),
      fat: clamp(n.fat, 0, 100),
      fiber: clamp(n.fiber, 0, 100),
      sodium: clamp(n.sodium, 0, 10000),
    },
    recommendations: list(raw?.recommendations),
    warnings: list(raw?.warnings),
    diabeticAdvice: str(raw?.diabeticAdvice),
    generalHealthAdvice: str(raw?.generalHealthAdvice),
    portionSizeAdvice: str(raw?.portionSizeAdvice),
    healthBenefits: list(raw?.healthBenefits),
  };
}

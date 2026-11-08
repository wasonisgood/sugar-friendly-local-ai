import type { Mode } from './modes';
import { imageToColorText } from './imageText';
import type { BaseAnalysis, FoodAnalysisResult, GiLoad, Glp1AnalysisResult } from './types';

export type ModelState = 'checking' | 'unsupported' | LanguageModelAvailability;

// 兩種模式共用同一個 Gemini Nano，只差在系統提示與輸出格式
// 純文字的設定（Edge 只能用這個；只要宣告 image，Edge 會直接拒絕整個 session）
export const IO_TEXT: Pick<LanguageModelCreateOptions, 'expectedInputs' | 'expectedOutputs'> = {
  expectedInputs: [{ type: 'text', languages: ['en'] }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
};

// 含圖片的設定（Chrome 照片辨識用）
export const IO: Pick<LanguageModelCreateOptions, 'expectedInputs' | 'expectedOutputs'> = {
  // Edge 要求明確宣告輸出語言（目前支援 de、en、es、fr、ja），中文內容仍以中文提示，語言標記用 en 通過檢查
  expectedInputs: [{ type: 'text', languages: ['en'] }, { type: 'image' }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
};

const COMMON_RULES = '只根據照片中看得到的內容判斷，看不清楚時降低 confidence，不要編造。所有文字一律使用繁體中文（台灣用語），句子簡短具體。';

const NUTRITION_SCHEMA = {
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
};

const BASE_PROPS = {
  confidence: { type: 'number', minimum: 0, maximum: 1 },
  foodName: { type: 'string' },
  category: { type: 'string' },
  healthScore: { type: 'integer', minimum: 0, maximum: 10 },
  nutritionalInfo: NUTRITION_SCHEMA,
  recommendations: { type: 'array', items: { type: 'string' }, maxItems: 4 },
  warnings: { type: 'array', items: { type: 'string' }, maxItems: 4 },
  generalHealthAdvice: { type: 'string' },
  portionSizeAdvice: { type: 'string' },
  healthBenefits: { type: 'array', items: { type: 'string' }, maxItems: 4 },
  estimatedServingGrams: { type: 'number', minimum: 0 },
};

const BASE_LINES = [
  '- foodName：食物名稱；若有多道菜，用「、」列出主要的幾道',
  '- category：主食／蛋白質／蔬菜／水果／飲料／甜點／混合餐 其中之一',
  '- confidence：辨識把握度 0 到 1',
];

const TAIL_LINES = [
  '- healthBenefits：這道食物的好處，最多 3 點',
  '- estimatedServingGrams：照片中這一份的總重量估計（公克）',
];

interface Profile {
  system: string;
  schema: object;
  lines: string[];
}

const PROFILES: Record<Mode, Profile> = {
  sugar: {
    system: '你是台灣的臨床營養師，專門協助糖尿病患者評估餐點。' + COMMON_RULES,
    // 欄位順序影響串流進度判斷（見 progress.ts）
    schema: {
      type: 'object',
      required: [
        'confidence', 'foodName', 'category', 'sugarFriendlyScore', 'healthScore',
        'nutritionalInfo', 'recommendations', 'warnings', 'diabeticAdvice',
        'generalHealthAdvice', 'portionSizeAdvice', 'healthBenefits', 'estimatedServingGrams',
      ],
      properties: { ...BASE_PROPS, sugarFriendlyScore: { type: 'integer', minimum: 0, maximum: 10 }, diabeticAdvice: { type: 'string' } },
    },
    lines: [
      ...BASE_LINES,
      '- sugarFriendlyScore：糖友善度 0 到 10，10 最適合糖尿病患者',
      '- healthScore：整體健康度 0 到 10',
      '- nutritionalInfo：每 100 公克估算值，calories 大卡、carbs/sugar/protein/fat/fiber 公克、sodium 毫克',
      '- recommendations：給一般人的具體建議，最多 3 點',
      '- warnings：需要注意的風險，最多 3 點，沒有就給空陣列',
      '- diabeticAdvice：給糖尿病患者的一段建議',
      '- generalHealthAdvice：給一般人的一段建議',
      '- portionSizeAdvice：建議份量，用拳頭、手掌、碗等生活化單位描述',
      ...TAIL_LINES,
    ],
  },
  glp1: {
    system:
      '你是台灣的減重營養師，專門協助正在使用 GLP-1 類減重針劑（俗稱瘦瘦針，例如週纖達、猛健樂）並控制飲食的亞健康成人。' +
      '這些人食慾與食量明顯變小，最重要的是：每餐吃到足夠蛋白質以保留肌肉、補足纖維與水分、' +
      '避免油炸油膩、過甜、份量過大與碳酸飲料造成噁心或脹氣。不討論藥物劑量調整。' +
      COMMON_RULES,
    schema: {
      type: 'object',
      required: [
        'confidence', 'foodName', 'category', 'glp1Score', 'healthScore', 'giLoad',
        'nutritionalInfo', 'recommendations', 'warnings', 'coachAdvice', 'proteinAdvice', 'giAdvice',
        'generalHealthAdvice', 'portionSizeAdvice', 'healthBenefits', 'estimatedServingGrams',
      ],
      properties: {
        ...BASE_PROPS,
        glp1Score: { type: 'integer', minimum: 0, maximum: 10 },
        giLoad: { type: 'string', enum: ['low', 'medium', 'high'] },
        coachAdvice: { type: 'string' },
        proteinAdvice: { type: 'string' },
        giAdvice: { type: 'string' },
      },
    },
    lines: [
      ...BASE_LINES,
      '- glp1Score：飲控友善度 0 到 10，10 最適合正在打瘦瘦針控制飲食的人（蛋白質足、份量適中、低油、纖維夠、腸胃負擔低）',
      '- healthScore：整體健康度 0 到 10',
      '- giLoad：腸胃負擔 low／medium／high；油炸油膩、份量大、很甜、很辣、碳酸或酒精會提高',
      '- nutritionalInfo：每 100 公克估算值，calories 大卡、carbs/sugar/protein/fat/fiber 公克、sodium 毫克',
      '- recommendations：怎麼吃更適合飲控，最多 3 點',
      '- warnings：需要注意的風險，最多 3 點，沒有就給空陣列',
      '- coachAdvice：給打瘦瘦針、正在飲控的人的一段建議',
      '- proteinAdvice：照片中整份（不是每 100 公克）的蛋白質夠不夠（每餐目標約 25 到 30 公克），不夠的話可以補什麼',
      '- giAdvice：怎麼吃比較不會噁心或脹氣，例如先吃哪一樣、吃慢一點、分兩次吃',
      '- generalHealthAdvice：給一般人的一段建議',
      '- portionSizeAdvice：食量變小時的建議份量，用拳頭、手掌、碗等生活化單位描述',
      ...TAIL_LINES,
    ],
  },
};

export interface PromptContext {
  notes?: string;
  placeName?: string;
  mealLabel?: string;
}

function buildPrompt(mode: Mode, ctx: PromptContext): string {
  const extra = [
    ctx.mealLabel && `餐別：${ctx.mealLabel}`,
    ctx.placeName && `地點：${ctx.placeName}`,
    ctx.notes && `使用者補充：${ctx.notes}`,
  ].filter(Boolean);
  return [
    '請辨識這張照片裡的食物，並依 JSON 格式回覆：',
    ...PROFILES[mode].lines,
    extra.length ? `\n參考資訊（可能有助辨識）：\n${extra.map((s) => String(s).trim()).join('\n')}` : '',
  ].join('\n');
}

/** Edge 與 Chrome 的內建模型能力不同：Edge 目前不接受圖片輸入 */
export const isEdge = () => typeof navigator !== 'undefined' && /Edg\//.test(navigator.userAgent);

export const NO_IMAGE_MESSAGE = () =>
  isEdge()
    ? 'Edge 目前的內建模型還不支援圖片輸入，照片無法辨識。健康助理的文字問答仍可使用；要辨識照片請改用 Chrome。'
    : '這版 Chrome 的內建模型還不支援圖片輸入，請到「本地模型」頁開啟多模態設定。';

// Edge 只能宣告文字輸入（照片改以顏色網格文字送出）；Chrome 維持原本的圖片輸入設定
export const ioFor = () => (isEdge() ? IO_TEXT : IO);

const EDGE_NOTE =
  '注意：以上是照片的低解析度顏色網格，看不清食物細節。請把 confidence 設在 0.3 以下，foodName 寫可能的類別（例如「深色湯麵」），並在 recommendations 與 warnings 說明這是粗略估算，請使用者確認食物與份量。';
const EDGE_WARNING = '本次在 Edge 以顏色網格推算，準確度有限，請確認食物名稱與份量。';

function extractJson(s: string): string {
  const t = stripFences(s);
  const i = t.indexOf('{');
  const j = t.lastIndexOf('}');
  return i >= 0 && j > i ? t.slice(i, j + 1) : t;
}

export function hasPromptApi(): boolean {
  return typeof LanguageModel !== 'undefined';
}

export async function checkAvailability(): Promise<ModelState> {
  if (!hasPromptApi()) return 'unsupported';
  try {
    return await LanguageModel!.availability(ioFor());
  } catch {
    return 'unavailable';
  }
}

// 每個模式一個帶系統提示的基底 session；同一時間只留目前模式的，切換時釋放另一個
const sessions = new Map<Mode, Promise<LanguageModelSession>>();

/** 建立（或下載）模型。第一次下載必須在使用者點擊之後。 */
export function prepareModel(mode: Mode, onDownload?: (ratio: number) => void): Promise<LanguageModelSession> {
  if (!hasPromptApi()) return Promise.reject(new Error('這個瀏覽器沒有 Prompt API'));
  let s = sessions.get(mode);
  if (!s) {
    s = LanguageModel!.create({
      ...ioFor(),
      initialPrompts: [{ role: 'system', content: PROFILES[mode].system }],
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          onDownload?.((e as ProgressEvent).loaded);
        });
      },
    });
    sessions.set(mode, s);
    s.catch(() => {
      if (sessions.get(mode) === s) sessions.delete(mode);
    });
  }
  return s;
}

/** 切換模式：釋放其他模式的 session，模型已在本機時預先暖機，第一次辨識比較快 */
export function switchModel(mode: Mode, state: ModelState) {
  if (state === 'downloading') return; // 下載中的 session 留著，下載完自然可共用
  for (const [m, s] of sessions) {
    if (m === mode) continue;
    sessions.delete(m);
    s.then((x) => x.destroy()).catch(() => {});
  }
  if (state === 'available') prepareModel(mode).catch(() => {});
}

type ResultFor<M extends Mode> = M extends 'glp1' ? Glp1AnalysisResult : FoodAnalysisResult;

export async function analyzeFood<M extends Mode>(
  mode: M,
  image: Blob,
  opts: { context?: PromptContext; signal?: AbortSignal; onToken?: (textSoFar: string) => void } = {},
): Promise<ResultFor<M>> {
  const base = await prepareModel(mode);
  // 每次分析都從乾淨的 session 複製，避免上一張照片影響判斷
  const session = await base.clone({ signal: opts.signal });
  const edge = isEdge();
  try {
    const prompt = buildPrompt(mode, opts.context ?? {});
    // Chrome：原生圖片輸入 + JSON schema（原本的模式，不動）
    // Edge：照片轉成顏色網格文字，不支援圖片與 responseConstraint，改由提示詞要求 JSON 並自行解析
    const content: LanguageModelMessageContent[] = edge
      ? [{ type: 'text', value: `${prompt}\n\n${await imageToColorText(image)}\n\n${EDGE_NOTE}` }]
      : [
          { type: 'text', value: prompt },
          { type: 'image', value: image },
        ];
    const stream = session.promptStreaming(
      [{ role: 'user', content }],
      edge ? { signal: opts.signal } : { responseConstraint: PROFILES[mode].schema, signal: opts.signal },
    );

    let text = '';
    for await (const chunk of stream) {
      // 舊版 Chrome 每次回傳完整字串，新版只回傳增量
      text = chunk.startsWith(text) && text.length > 0 ? chunk : text + chunk;
      opts.onToken?.(text);
    }
    const raw = JSON.parse(edge ? extractJson(text) : stripFences(text));
    const out = mode === 'glp1' ? normalizeGlp1(raw) : normalizeSugar(raw);
    if (edge) out.warnings = [EDGE_WARNING, ...out.warnings].slice(0, 4);
    return out as ResultFor<M>;
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
const score = (n: unknown) => Math.round(clamp(n, 0, 10));

function normalizeBase(raw: any): BaseAnalysis {
  const n = raw?.nutritionalInfo ?? {};
  return {
    confidence: clamp(raw?.confidence, 0, 1),
    foodName: str(raw?.foodName) || '無法確定的食物',
    category: str(raw?.category) || '未分類',
    healthScore: score(raw?.healthScore),
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
    generalHealthAdvice: str(raw?.generalHealthAdvice),
    portionSizeAdvice: str(raw?.portionSizeAdvice),
    healthBenefits: list(raw?.healthBenefits),
    estimatedServingGrams: Number(raw?.estimatedServingGrams) > 0 ? Math.round(clamp(raw.estimatedServingGrams, 1, 3000)) : undefined,
  };
}

function normalizeSugar(raw: any): FoodAnalysisResult {
  return { ...normalizeBase(raw), sugarFriendlyScore: score(raw?.sugarFriendlyScore), diabeticAdvice: str(raw?.diabeticAdvice) };
}

function normalizeGlp1(raw: any): Glp1AnalysisResult {
  const gi = str(raw?.giLoad) as GiLoad;
  return {
    ...normalizeBase(raw),
    glp1Score: score(raw?.glp1Score),
    giLoad: gi === 'low' || gi === 'high' ? gi : 'medium',
    coachAdvice: str(raw?.coachAdvice),
    proteinAdvice: str(raw?.proteinAdvice),
    giAdvice: str(raw?.giAdvice),
  };
}

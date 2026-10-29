// Chrome 內建 Prompt API（Gemini Nano）的最小型別宣告
// https://developer.chrome.com/docs/ai/prompt-api

type LanguageModelAvailability = 'unavailable' | 'downloadable' | 'downloading' | 'available';

interface LanguageModelExpected {
  type: 'text' | 'image' | 'audio';
  languages?: string[];
}

interface LanguageModelMessageContent {
  type: 'text' | 'image' | 'audio';
  value: string | Blob | ImageBitmap | HTMLCanvasElement | HTMLImageElement | ImageData;
}

interface LanguageModelMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | LanguageModelMessageContent[];
}

interface LanguageModelCreateOptions {
  expectedInputs?: LanguageModelExpected[];
  expectedOutputs?: LanguageModelExpected[];
  initialPrompts?: LanguageModelMessage[];
  temperature?: number;
  topK?: number;
  signal?: AbortSignal;
  monitor?: (m: EventTarget) => void;
}

interface LanguageModelPromptOptions {
  responseConstraint?: object;
  signal?: AbortSignal;
}

interface LanguageModelSession {
  prompt(input: string | LanguageModelMessage[], options?: LanguageModelPromptOptions): Promise<string>;
  promptStreaming(
    input: string | LanguageModelMessage[],
    options?: LanguageModelPromptOptions,
  ): ReadableStream<string> & AsyncIterable<string>;
  clone(options?: { signal?: AbortSignal }): Promise<LanguageModelSession>;
  destroy(): void;
}

interface LanguageModelStatic {
  availability(options?: LanguageModelCreateOptions): Promise<LanguageModelAvailability>;
  create(options?: LanguageModelCreateOptions): Promise<LanguageModelSession>;
}

declare var LanguageModel: LanguageModelStatic | undefined;

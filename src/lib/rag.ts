// 本地知識庫（RAG）：文件切段 + BM25 關鍵字檢索。
// 不需要 embedding 模型，所有處理都在瀏覽器裡完成，文件不會上傳。

export interface Chunk {
  docId: string;
  docName: string;
  index: number; // 段落序號（從 0 開始）
  text: string;
  tokens: string[];
}

export interface KnowledgeDoc {
  id: string;
  name: string;
  chars: number;
  chunks: Chunk[];
}

export interface Hit {
  chunk: Chunk;
  score: number;
}

/** 中英文混合的簡單切詞：英數以單字為單位，中文以單字與雙字詞為單位 */
export function tokenize(s: string): string[] {
  const lower = s.toLowerCase();
  const out: string[] = lower.match(/[a-z0-9]+/g) ?? [];
  const cjkRuns = lower.replace(/[^㐀-鿿豈-﫿]+/g, ' ').split(' ').filter(Boolean);
  for (const run of cjkRuns) {
    for (let i = 0; i < run.length; i++) {
      out.push(run[i]);
      if (i + 1 < run.length) out.push(run.slice(i, i + 2));
    }
  }
  return out;
}

/** 依段落切段，過長的段落以固定長度切開並保留重疊 */
export function chunkText(text: string, size = 600, overlap = 100): string[] {
  const clean = text
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!clean) return [];

  const chunks: string[] = [];
  let buf = '';
  const flush = () => {
    if (buf.trim()) chunks.push(buf.trim());
    buf = '';
  };

  for (const p of clean.split(/\n\s*\n/)) {
    if (p.length > size) {
      flush();
      for (let i = 0; i < p.length; i += size - overlap) chunks.push(p.slice(i, i + size).trim());
      continue;
    }
    if (buf && buf.length + p.length + 2 > size) {
      const tail = buf.slice(-overlap);
      flush();
      buf = tail;
    }
    buf = buf ? `${buf}\n\n${p}` : p;
  }
  flush();
  return chunks.filter(Boolean);
}

export function buildDoc(name: string, text: string): KnowledgeDoc {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const chunks: Chunk[] = chunkText(text).map((t, i) => ({
    docId: id,
    docName: name,
    index: i,
    text: t,
    tokens: tokenize(t),
  }));
  return { id, name, chars: text.length, chunks };
}

/** BM25 檢索，回傳分數最高的 k 段 */
export function searchKnowledge(docs: KnowledgeDoc[], query: string, k = 3): Hit[] {
  const all = docs.flatMap((d) => d.chunks);
  if (!all.length) return [];
  const qTokens = [...new Set(tokenize(query))];
  if (!qTokens.length) return [];

  const N = all.length;
  const avgdl = all.reduce((sum, c) => sum + c.tokens.length, 0) / N || 1;
  const df = new Map<string, number>();
  for (const c of all) for (const t of new Set(c.tokens)) df.set(t, (df.get(t) ?? 0) + 1);

  const k1 = 1.5;
  const b = 0.75;
  return all
    .map((c) => {
      const tf = new Map<string, number>();
      for (const t of c.tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
      let score = 0;
      for (const q of qTokens) {
        const f = tf.get(q);
        if (!f) continue;
        const n = df.get(q) ?? 0;
        const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
        score += (idf * f * (k1 + 1)) / (f + k1 * (1 - b + (b * c.tokens.length) / avgdl));
      }
      return { chunk: c, score };
    })
    .filter((h) => h.score > 0)
    .sort((a, b2) => b2.score - a.score)
    .slice(0, k);
}

/** 讀取上傳的檔案為純文字。PDF 使用 pdf.js（延遲載入，不影響首次開啟速度） */
export async function readFileText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf') || file.type === 'application/pdf') return readPdf(file);
  if (/\.(txt|md|markdown|csv|json|log)$/.test(name) || file.type.startsWith('text/')) return file.text();
  throw new Error('目前支援 PDF、TXT、Markdown、CSV、JSON');
}

async function readPdf(file: File): Promise<string> {
  // @ts-ignore
  const pdfjs = await import('pdfjs-dist');
  // @ts-ignore
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const cdn = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}`;
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    cMapUrl: `${cdn}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${cdn}/standard_fonts/`,
  }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((it: any) => {
          const item = it as { str?: string; hasEOL?: boolean };
          return (item.str ?? '') + (item.hasEOL ? '\n' : '');
        })
        .join(''),
    );
  }
  return pages.join('\n\n');
}

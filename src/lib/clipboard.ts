export class ClipboardImageError extends Error {}

/** 從 ClipboardEvent 取出第一張圖片（Ctrl+V） */
export function imageFromPasteEvent(e: ClipboardEvent): File | null {
  const items = Array.from(e.clipboardData?.items ?? []);
  for (const item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const f = item.getAsFile();
      if (f) return f;
    }
  }
  return null;
}

/** 透過非同步剪貼簿 API 讀取圖片（按鈕觸發，瀏覽器會詢問權限） */
export async function readClipboardImage(): Promise<File> {
  if (!navigator.clipboard?.read) {
    throw new ClipboardImageError('這個瀏覽器不支援按鈕讀取剪貼簿，請改用 Ctrl + V。');
  }
  let items: ClipboardItems;
  try {
    items = await navigator.clipboard.read();
  } catch (e) {
    if (e instanceof DOMException && e.name === 'NotAllowedError') {
      throw new ClipboardImageError('沒有取得剪貼簿權限。可以在網址列左邊的設定允許，或直接按 Ctrl + V。');
    }
    throw new ClipboardImageError('讀不到剪貼簿內容，請改用 Ctrl + V。');
  }
  for (const item of items) {
    const type = item.types.find((t) => t.startsWith('image/'));
    if (type) {
      const blob = await item.getType(type);
      return new File([blob], `clipboard.${type.split('/')[1] || 'png'}`, { type });
    }
  }
  throw new ClipboardImageError('剪貼簿裡沒有圖片。先複製一張照片或截圖再試一次。');
}

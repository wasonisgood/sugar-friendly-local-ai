// 送進本地模型的圖片長邊上限：越小，模型處理影像越快（食物辨識 768px 通常已足夠）
export const MODEL_MAX_SIDE = 768;

export interface PreparedImage {
  blob: Blob; // 給模型用，長邊最多 MODEL_MAX_SIDE px
  previewUrl: string; // object URL，畫面預覽
  thumbnail: string; // data URL，存進紀錄
}

async function drawScaled(source: ImageBitmap, maxSide: number): Promise<HTMLCanvasElement> {
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);
  canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function prepareImage(file: Blob): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const large = await drawScaled(bitmap, MODEL_MAX_SIDE);
    const blob = await new Promise<Blob>((resolve, reject) =>
      large.toBlob((b) => (b ? resolve(b) : reject(new Error('無法轉換圖片'))), 'image/jpeg', 0.88),
    );
    const small = await drawScaled(bitmap, 320);
    return {
      blob,
      previewUrl: URL.createObjectURL(blob),
      thumbnail: small.toDataURL('image/jpeg', 0.7),
    };
  } finally {
    bitmap.close();
  }
}

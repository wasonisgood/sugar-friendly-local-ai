// 把照片轉成「顏色網格」純文字：先置中裁成正方形，縮成 GRID×GRID 的小格子，
// 每一格用一個字母代表該格的主要顏色，並附上圖例與整體顏色比例。
// 只給 Edge 使用（Edge 目前的內建模型不接受圖片輸入）；Chrome 仍走原生圖片輸入。

export const GRID = 24;

const NAMES: Record<string, string> = {
  W: '白',
  K: '黑',
  G: '灰',
  R: '紅',
  O: '橙',
  Y: '黃',
  S: '米色或淺膚色',
  T: '棕褐',
  N: '綠',
  B: '藍',
  P: '紫',
};

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max ? d / max : 0;
  return [h, s, max];
}

/** 把一個像素的顏色歸到 11 種代碼之一 */
export function classify(r: number, g: number, b: number): string {
  const [h, s, v] = rgbToHsv(r, g, b);
  if (v < 0.18) return 'K';
  if (s < 0.14) return v > 0.8 ? 'W' : 'G';
  if (h >= 75 && h < 170) return 'N';
  if (h >= 170 && h < 260) return 'B';
  if (h >= 260 && h < 330) return 'P';
  if (h >= 330 || h < 12) return 'R';
  if (h >= 12 && h < 45) {
    if (v < 0.55) return 'T';
    if (s < 0.35 && v > 0.7) return 'S';
    return 'O';
  }
  if (h >= 45 && h < 75) return s < 0.3 && v > 0.7 ? 'S' : 'Y';
  return 'G';
}

function drawSquare(src: CanvasImageSource, srcW: number, srcH: number, size: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const side = Math.min(srcW, srcH);
  ctx.drawImage(src, (srcW - side) / 2, (srcH - side) / 2, side, side, 0, 0, size, size);
  return c;
}

export async function imageToColorText(blob: Blob): Promise<string> {
  const bmp = await createImageBitmap(blob);
  // 兩段式縮小，避免大圖直接縮到小尺寸時產生鋸齒與雜訊
  const mid = drawSquare(bmp, bmp.width, bmp.height, GRID * 4);
  bmp.close();
  const small = drawSquare(mid, mid.width, mid.height, GRID);
  const data = small.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, GRID, GRID).data;

  const rows: string[] = [];
  const counts: Record<string, number> = {};
  for (let y = 0; y < GRID; y++) {
    let row = '';
    for (let x = 0; x < GRID; x++) {
      const i = (y * GRID + x) * 4;
      const code = classify(data[i], data[i + 1], data[i + 2]);
      counts[code] = (counts[code] ?? 0) + 1;
      row += code;
    }
    rows.push(row);
  }

  const total = GRID * GRID;
  const share = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${NAMES[k]} ${Math.round((n / total) * 100)}%`)
    .join('、');
  const legend = Object.entries(NAMES)
    .map(([k, n]) => `${k}=${n}`)
    .join('，');

  return [
    `[照片顏色網格：${GRID}×${GRID}，每個字母代表該格的主要顏色，由上到下、由左到右]`,
    `圖例：${legend}`,
    `整體顏色比例：${share}`,
    ...rows,
  ].join('\n');
}

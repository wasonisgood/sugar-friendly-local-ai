import { useState } from 'react';
import type { ModelState } from '../lib/localModel';
import PageHead from './PageHead';

const FLAGS = [
  { flag: 'chrome://flags/#optimization-guide-on-device-model', value: 'Enabled BypassPerfRequirement' },
  { flag: 'chrome://flags/#prompt-api-for-gemini-nano', value: 'Enabled' },
  { flag: 'chrome://flags/#prompt-api-for-gemini-nano-multimodal-input', value: 'Enabled' },
];

function CopyLine({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="copy"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        });
      }}
    >
      <code>{text}</code>
      <span>{done ? '已複製' : '複製'}</span>
    </button>
  );
}

export default function Guide({ state }: { state: ModelState }) {
  return (
    <div className="guide">
      <PageHead eyebrow="本地模型" title="照片在你的電腦上辨識">
        這個網站不呼叫雲端 AI，而是用 Chrome 內建的 Gemini Nano。以下是它需要什麼、怎麼開啟。
      </PageHead>
      <section className="guide-sec">
        <h2>為什麼不用雲端 AI？</h2>
        <p>
          原本的 App 會把照片傳到 OpenAI 分析，需要 API 金鑰，也要付費。這個網站改用 Chrome 內建的
          Gemini Nano：模型下載到你的電腦後，照片在本機辨識，不經過任何伺服器，也不需要帳號或金鑰。
        </p>
        <p className="muted">
          代價是模型比較小，對複雜的合菜或光線差的照片，判斷會比雲端模型粗略。營養數值請當作「大概」，不要當作精確測量。
        </p>
      </section>

      <section className="guide-sec">
        <h2>需要什麼</h2>
        <ul className="plain">
          <li>桌機或筆電上的 Chrome 138 以上（Windows 10/11、macOS 13 以上、Linux、ChromeOS）</li>
          <li>至少 22 GB 可用磁碟空間（模型本身約 2 GB）</li>
          <li>顯示卡記憶體 4 GB 以上，或 16 GB 記憶體加 4 核心以上 CPU</li>
          <li>第一次下載模型時需要網路，之後可離線使用</li>
        </ul>
        <p className="muted">目前狀態：{stateLabel(state)}</p>
      </section>

      <section className="guide-sec">
        <h2>開啟步驟</h2>
        <ol className="steps">
          <li>
            <p>在 Chrome 網址列分別開啟下面三個設定，依右邊的值調整：</p>
            <div className="flags">
              {FLAGS.map((f) => (
                <div key={f.flag} className="flag">
                  <CopyLine text={f.flag} />
                  <span className="flag-value">{f.value}</span>
                </div>
              ))}
            </div>
          </li>
          <li>
            <p>按右下角的 <b>Relaunch</b> 重新啟動 Chrome。</p>
          </li>
          <li>
            <p>
              回到這個網站，狀態列會顯示「模型尚未下載」，按「現在下載」。進度可以在{' '}
              <CopyLine text="chrome://on-device-internals" /> 查看。
            </p>
          </li>
          <li>
            <p>下載完成後狀態變成「已就緒」，就可以上傳照片了。</p>
          </li>
        </ol>
      </section>

      <section className="guide-sec">
        <h2>資料存在哪裡</h2>
        <p>
          辨識紀錄（縮圖與結果）存在這個瀏覽器的 localStorage，不會同步到其他裝置。清除瀏覽器資料或按「全部清除」就會刪掉。
        </p>
      </section>
    </div>
  );
}

function stateLabel(s: ModelState) {
  switch (s) {
    case 'available':
      return '已就緒';
    case 'downloadable':
      return '可以下載';
    case 'downloading':
      return '下載中';
    case 'unavailable':
      return '裝置不符合需求，或設定尚未開啟';
    case 'unsupported':
      return '找不到 Prompt API，請確認是桌面版 Chrome 並已開啟上面的設定';
    default:
      return '檢查中';
  }
}

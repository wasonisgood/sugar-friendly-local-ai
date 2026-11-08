import { useState } from 'react';
import { isEdge, type ModelState } from '../lib/localModel';
import { MODES, type Mode } from '../lib/modes';
import PageHead from './PageHead';

// Chrome 的設定（chrome:// 網址與旗標名稱）
const CHROME_FLAGS = [
  { flag: 'chrome://flags/#optimization-guide-on-device-model', value: 'Enabled BypassPerfRequirement' },
  { flag: 'chrome://flags/#prompt-api-for-gemini-nano', value: 'Enabled' },
  { flag: 'chrome://flags/#prompt-api-for-gemini-nano-multimodal-input', value: 'Enabled' },
];

// Edge 的設定（edge:// 網址與功能名稱，依 Microsoft 的 Prompt API 文件）
const EDGE_FLAGS = [{ name: 'Prompt API for on-device language model', value: 'Enabled' }];
const EDGE_PRERELEASE_FLAG = { name: 'Enable prerelease on-device language model', value: 'Enabled（可選）' };

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

export default function Guide({ state, mode, onMode }: { state: ModelState; mode: Mode; onMode: (m: Mode) => void }) {
  const edge = isEdge();
  const name = edge ? 'Edge' : 'Chrome';

  return (
    <div className="guide">
      <PageHead eyebrow="本地模型" title="照片在你的電腦上辨識">
        這個網站不呼叫雲端 AI，而是用{edge ? ' Edge' : ' Chrome'} 內建的 Gemini Nano。以下是它需要什麼、怎麼開啟。
      </PageHead>
      <section className="guide-sec">
        <h2>為什麼不用雲端 AI？</h2>
        <p>
          原本的 App 會把照片傳到 OpenAI 分析，需要 API 金鑰，也要付費。這個網站改用瀏覽器內建的 Gemini Nano：模型下載到你的電腦後，照片在本機辨識，
          不經過任何伺服器，也不需要帳號或金鑰。
        </p>
        <p className="muted">
          代價是模型比較小，對複雜的合菜或光線差的照片，判斷會比雲端模型粗略。營養數值請當作「大概」，不要當作精確測量。
        </p>
      </section>

      <section className="guide-sec">
        <h2>兩種模式，共用同一個模型</h2>
        <p>
          左上角可以在「糖友控糖」與「瘦瘦針飲控」之間切換。兩者用的是同一份 Gemini Nano，只下載一次；切換時只換掉給模型的指示與輸出格式，
          並釋放另一個模式佔用的記憶體，模型已在本機時會先暖機，第一次辨識比較快。
        </p>
        <ul className="plain">
          <li>
            <b>糖友控糖</b>：給糖尿病患者，看碳水、糖友善度與餐前餐後血糖。
          </li>
          <li>
            <b>瘦瘦針飲控</b>：給使用 GLP-1 類減重針劑（週纖達、猛健樂等）並控制飲食的人，看每餐蛋白質、腸胃負擔、吃完多少，
            還有體重與打針後幾天的食量變化。
          </li>
        </ul>
        <p className="muted">
          兩個模式的紀錄分開存放，互不影響。目前是「{MODES[mode].switchLabel}」
          <button type="button" className="link-btn" onClick={() => onMode(mode === 'sugar' ? 'glp1' : 'sugar')}>
            改用{MODES[mode === 'sugar' ? 'glp1' : 'sugar'].switchLabel}
          </button>
        </p>
      </section>

      <section className="guide-sec">
        <h2>需要什麼</h2>
        {edge ? (
          <ul className="plain">
            <li>Edge 的開發版（Dev）或 Canary 測試版，目前 Prompt API 只在這兩個通道提供</li>
            <li>Windows 10/11，或 macOS 13.3 以上（文件未列出 Linux 與 ChromeOS）</li>
            <li>至少 20 GB 可用磁碟空間，剩餘低於 10 GB 時模型會被刪除</li>
            <li>顯示卡記憶體 5.5 GB 以上（效能等級為 High）；較弱的裝置可以試用預覽模型 Aion-1.0-Instruct</li>
            <li>第一次下載模型需要不限流量的網路（計量網路不會下載），之後可離線使用</li>
          </ul>
        ) : (
          <ul className="plain">
            <li>桌機或筆電上的 Chrome 138 以上（Windows 10/11、macOS 13 以上、Linux、ChromeOS）</li>
            <li>至少 22 GB 可用磁碟空間（模型本身約 2 GB）</li>
            <li>顯示卡記憶體 4 GB 以上，或 16 GB 記憶體加 4 核心以上 CPU</li>
            <li>第一次下載模型時需要網路，之後可離線使用</li>
          </ul>
        )}
        <p className="muted">目前狀態：{stateLabel(state, edge)}</p>
      </section>

      <section className="guide-sec">
        <h2>開啟步驟（{name}）</h2>
        {edge ? (
          <ol className="steps">
            <li>
              <p>
                在網址列開啟 <CopyLine text="edge://flags" />，搜尋並把 <b>{EDGE_FLAGS[0].name}</b> 設為 <b>{EDGE_FLAGS[0].value}</b>。
              </p>
              <div className="flags">
                <div className="flag">
                  <span className="flag-value">{EDGE_FLAGS[0].name}</span>
                  <span className="flag-value">{EDGE_FLAGS[0].value}</span>
                </div>
              </div>
            </li>
            <li>
              <p>
                只有在裝置較弱、無法下載預設模型時，才需要再開啟 <b>{EDGE_PRERELEASE_FLAG.name}</b>（{EDGE_PRERELEASE_FLAG.value}），
                它會改用預覽模型 Aion-1.0-Instruct，需要 Edge 150.0.4070 以上。
              </p>
            </li>
            <li>
              <p>按 <b>Restart</b> 重新啟動 Edge。</p>
            </li>
            <li>
              <p>
                回到這個網站，狀態列會顯示「模型尚未下載」，按「現在下載」。下載進度與模型狀態可以在 <CopyLine text="edge://on-device-internals" /> 查看。
                如果下載沒有開始，請重新啟動 Edge 再試一次。
              </p>
            </li>
            <li>
              <p>
                Edge 目前的內建模型不接受圖片，照片會先轉成「顏色網格」文字再送出，準確度有限，建議改用 Chrome 辨識照片。
                <b>健康助理的文字問答可以正常使用。</b>
              </p>
            </li>
          </ol>
        ) : (
          <ol className="steps">
            <li>
              <p>在 Chrome 網址列分別開啟下面三個設定，依右邊的值調整：</p>
              <div className="flags">
                {CHROME_FLAGS.map((f) => (
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
        )}
      </section>

      <section className="guide-sec">
        <h2>資料存在哪裡</h2>
        <p>
          辨識紀錄（縮圖與結果）、體重與打針紀錄都存在這個瀏覽器的 localStorage，不會同步到其他裝置。清除瀏覽器資料或按「全部清除」就會刪掉。
        </p>
      </section>
    </div>
  );
}

function stateLabel(s: ModelState, edge: boolean) {
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
      return edge
        ? '找不到 Prompt API，請確認是 Edge 的 Dev 或 Canary 版，並已開啟 edge://flags 的設定'
        : '找不到 Prompt API，請確認是桌面版 Chrome 並已開啟上面的設定';
    default:
      return '檢查中';
  }
}

import { useState, useEffect } from 'react';
import type { ModelState } from '../lib/localModel';

interface WindowsAiInventoryWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  currentState?: ModelState;
}

export default function WindowsAiInventoryWidget({
  isOpen,
  onClose,
  currentState = 'checking',
}: WindowsAiInventoryWidgetProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [detectState, setDetectState] = useState<string>(currentState);
  const [diagnostics, setDiagnostics] = useState<{
    hasAiGlobal: boolean;
    hasLanguageModel: boolean;
    capabilities: string;
    details: string;
  }>({
    hasAiGlobal: false,
    hasLanguageModel: false,
    capabilities: '未檢測',
    details: '點擊下方「執行即時診斷」以獲取即時資訊',
  });

  const runDiagnostics = async () => {
    const win = window as any;
    const hasAi = typeof win.ai !== 'undefined';
    const hasLM = hasAi && typeof win.ai.languageModel !== 'undefined';
    let cap = 'unavailable';
    let detailMsg = '';

    if (hasLM) {
      try {
        const c = await win.ai.languageModel.capabilities();
        cap = c.available || 'unknown';
        detailMsg = `能力狀態：${c.available}（預設溫度：${c.defaultTemperature ?? '無'}，TopK：${c.defaultTopK ?? '無'}）`;
      } catch (e: any) {
        cap = 'error';
        detailMsg = `檢測拋出例外：${e?.message || String(e)}`;
      }
    } else {
      detailMsg = '瀏覽器尚未偵測到 window.ai.languageModel 物件，請依照下方步驟配置旗標。';
    }

    setDiagnostics({
      hasAiGlobal: hasAi,
      hasLanguageModel: hasLM,
      capabilities: cap,
      details: detailMsg,
    });
    setDetectState(cap === 'readily' ? 'available' : cap === 'after-download' ? 'downloadable' : 'unsupported');
  };

  useEffect(() => {
    if (isOpen) {
      runDiagnostics();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyText = (text: string, key: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    });
  };

  return (
    <div className="win-inventory-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="win-inventory-modal" onClick={(e) => e.stopPropagation()}>
        {/* Windows Classic Titlebar */}
        <div className="win-titlebar">
          <div className="win-titlebar-icon">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M0 2.25L6.5 1.35V7.45H0V2.25ZM0 8.55H6.5V14.65L0 13.75V8.55ZM7.5 1.21L16 0V7.45H7.5V1.21ZM7.5 8.55H16V16L7.5 14.79V8.55Z"/>
            </svg>
          </div>
          <span className="win-titlebar-title">Windows 系統選用功能 · 瀏覽器內建 AI (Gemini Nano) 庫存管理與安裝指引</span>
          <div className="win-titlebar-controls">
            <button type="button" className="win-control-btn" title="最小化" tabIndex={-1}>−</button>
            <button type="button" className="win-control-btn" title="最大化" tabIndex={-1}>□</button>
            <button type="button" className="win-control-btn close" onClick={onClose} title="關閉">✕</button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="win-body">
          {/* Header Banner */}
          <div className="win-section-header">
            <div className="win-icon-large">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
                <circle cx="12" cy="10" r="3" />
                <path d="M12 7v1M12 12v1M9.5 10h1M13.5 10h1" strokeWidth="1" />
              </svg>
            </div>
            <div className="win-header-text">
              <h3>裝置端內建智慧推論庫存 (On-Device AI Inventory)</h3>
              <p>本功能利用 Chromium 引擎內嵌之 Gemini Nano 離線大語言與多模態模型，提供 100% 隱私安全的糖尿病飲食與 GLP-1 減重分析。</p>
            </div>
          </div>

          {/* Schematic Diagram: Windows Inventory Architecture */}
          <div className="win-diagram-card">
            <div className="win-diagram-title">系統架構與呼叫流程圖解 (System Pipeline Architecture)</div>
            <div className="win-diagram-flow">
              <div className="win-flow-node">
                <div className="node-icon">🌐</div>
                <div className="node-label">用戶端瀏覽器</div>
                <div className="node-sub">Chrome 128+ / Edge Dev</div>
              </div>
              <div className="win-flow-arrow">➔</div>
              <div className="win-flow-node">
                <div className="node-icon">🚩</div>
                <div className="node-label">Prompt API 旗標</div>
                <div className="node-sub">chrome://flags 啟用</div>
              </div>
              <div className="win-flow-arrow">➔</div>
              <div className="win-flow-node highlight">
                <div className="node-icon">📦</div>
                <div className="node-label">Gemini Nano 庫存</div>
                <div className="node-sub">chrome://components (~2GB)</div>
              </div>
              <div className="win-flow-arrow">➔</div>
              <div className="win-flow-node success">
                <div className="node-icon">🔒</div>
                <div className="node-label">本機離線辨識</div>
                <div className="node-sub">零 API 金鑰 · 零隱私外洩</div>
              </div>
            </div>
          </div>

          {/* Current Diagnostic Status Box */}
          <div className="win-status-panel">
            <div className="win-status-row">
              <span className="status-label">目前本機模型狀態（代碼：{detectState}）：</span>
              <span className={`status-pill ${diagnostics.capabilities === 'readily' ? 'success' : 'warn'}`}>
                {diagnostics.capabilities === 'readily' ? '● 系統已就緒 (Available)' : '○ 尚未安裝或待配置 (Not Ready)'}
              </span>
              <button type="button" className="win-btn small" onClick={runDiagnostics}>執行即時診斷</button>
            </div>
            <div className="win-status-detail mono">
              {diagnostics.details}
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="win-steps-container">
            <h4 className="win-steps-title">四步驟啟用本機 AI 元件庫存 (Installation & Configuration Steps)：</h4>

            {/* Step 1 */}
            <div className="win-step-item">
              <div className="step-num">1</div>
              <div className="step-content">
                <strong>確認瀏覽器版本與硬體需求</strong>
                <p>請使用 <b>Chrome 128 以上版本</b>（或 Chrome Dev / Canary）或 <b>Edge Dev</b>。硬體建議具備至少 4GB 顯存或 16GB 記憶體，以及 20GB 以上剩餘磁碟空間。</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="win-step-item">
              <div className="step-num">2</div>
              <div className="step-content">
                <strong>在瀏覽器網址列開啟實驗旗標並切換為「Enabled」</strong>
                <p>複製下方網址貼至新分頁，將其狀態切換為對應數值：</p>
                <div className="win-code-block">
                  <div className="code-line">
                    <code>chrome://flags/#prompt-api-for-gemini-nano</code>
                    <span className="code-val">設為 <b>Enabled</b></span>
                    <button type="button" className="copy-btn" onClick={() => copyText('chrome://flags/#prompt-api-for-gemini-nano', 'flag1')}>
                      {copiedKey === 'flag1' ? '已複製' : '複製網址'}
                    </button>
                  </div>
                  <div className="code-line">
                    <code>chrome://flags/#optimization-guide-on-device-model</code>
                    <span className="code-val">設為 <b>Enabled BypassPerfRequirement</b></span>
                    <button type="button" className="copy-btn" onClick={() => copyText('chrome://flags/#optimization-guide-on-device-model', 'flag2')}>
                      {copiedKey === 'flag2' ? '已複製' : '複製網址'}
                    </button>
                  </div>
                </div>
                <p className="step-tip">※ 設定完成後，請務必點擊右下角藍色「Relaunch」按鈕重新啟動瀏覽器。</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="win-step-item">
              <div className="step-num">3</div>
              <div className="step-content">
                <strong>前往元件庫存下載 Gemini Nano 模型檔案</strong>
                <p>重新啟動後，請在網址列開啟元件清單：</p>
                <div className="win-code-block">
                  <div className="code-line">
                    <code>chrome://components</code>
                    <button type="button" className="copy-btn" onClick={() => copyText('chrome://components', 'comp')}>
                      {copiedKey === 'comp' ? '已複製' : '複製網址'}
                    </button>
                  </div>
                </div>
                <p>在頁面中尋找 <b>Optimization Guide On Device Model</b>，點擊「<b>檢查更新 (Check for update)</b>」。瀏覽器將於背景下載約 1.5GB ~ 2GB 模型，狀態轉為「已最新」即完成！</p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="win-step-item">
              <div className="step-num">4</div>
              <div className="step-content">
                <strong>返回本頁開始離線控醣與 GLP-1 減重飲控記錄</strong>
                <p>完成後重新整理本頁面，頂部狀態燈將變為綠色「本機模型就緒」。你可以立即拍照上傳餐點，在不外流任何照片隱私的情況下享受本地端即時營養與昇糖分析！</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer (Classic Windows Action Buttons) */}
        <div className="win-footer">
          <div className="win-footer-info">
            <span>Windows NT 核心 / 瀏覽器沙盒保護已啟用</span>
          </div>
          <div className="win-footer-actions">
            <button type="button" className="win-btn primary" onClick={onClose}>
              確定 (OK)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

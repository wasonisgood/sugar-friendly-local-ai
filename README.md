# 糖友善餐盤筆記（本地 AI 版）

由 `sugar-friendly-app` 延伸的 React 網站。食物照片辨識改用 **Chrome 內建 Prompt API（Gemini Nano）**，
照片在本機處理，不需要 OpenAI 金鑰，也不會上傳到任何伺服器。

## 功能
- 拖放、選擇檔案、手機拍照、Ctrl+V 貼上截圖
- 可加一句補充說明（例如「這是半碗」）一起交給模型
- 串流顯示進度、可取消
- 結果欄位與原 App 的 `FoodAnalysisResult` 相同（糖友善度、營養標示、建議、警示…）
- 辨識紀錄存在 localStorage，依日期分組
- 不支援的瀏覽器可看範例結果，並有開啟步驟說明

## 開發
```bash
npm install
npm run dev
```

## 開啟 Chrome 內建模型
桌面版 Chrome 138+，到 `chrome://flags` 開啟：
- `#optimization-guide-on-device-model` → Enabled BypassPerfRequirement
- `#prompt-api-for-gemini-nano` → Enabled
- `#prompt-api-for-gemini-nano-multimodal-input` → Enabled

重新啟動後，在網站上按「現在下載」即可。下載進度可看 `chrome://on-device-internals`。

## 結構
- `src/lib/localModel.ts`：Prompt API 封裝（可用性檢查、下載、JSON Schema 限制輸出、結果正規化）
- `src/lib/image.ts`：圖片縮放（給模型 1024px、紀錄縮圖 320px）
- `src/lib/history.ts`：紀錄存取
- `src/components/`：版面元件

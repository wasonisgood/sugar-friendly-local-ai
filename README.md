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

## 兩種模式
左上角可切換，紀錄、圖表、色票與給模型的指示都跟著換；兩者共用同一份 Gemini Nano。
- **糖友控糖**：碳水、糖友善度、餐前餐後血糖。色票 Color Hunt `#84B179 #A2CB8B #C7EABB #E8F5BD`
- **瘦瘦針飲控**：給使用 GLP-1 類減重針劑並控制飲食的人。看每餐蛋白質、腸胃負擔、吃完多少、餐後不適，
  另有每日體重與打針紀錄，圖表可看體重趨勢與打針後幾天的食量變化。色票 Color Hunt `#9ED2BE #7EAA92 #C8E4B2 #FFD9B7`

切換時會釋放另一個模式的 session、模型已在本機時先暖機；已選的照片與用餐資訊會保留。
備註提到「瘦瘦針、猛健樂、週纖達」等字時，會提示可改用瘦瘦針模式。網址加 `?mode=glp1` 可直接開啟該模式。

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
- `src/lib/localModel.ts`：Prompt API 封裝（可用性檢查、下載、兩種模式的提示與 JSON Schema、結果正規化）
- `src/lib/modes.ts`：模式設定與切換
- `src/lib/body.ts`、`src/lib/glp1Stats.ts`：瘦瘦針模式的體重／打針紀錄與統計
- `src/lib/image.ts`：圖片縮放（給模型 1024px、紀錄縮圖 320px）
- `src/lib/history.ts`：紀錄存取（每個模式一份）
- `src/components/`：版面元件

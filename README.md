# TUT.SYS (Time Under Tension) 🏋️‍♂️

TUT.SYS 是一個為個人健身愛好者打造的 **「極進化且無腦化」健身時程追蹤系統**。

有別於市面上繁雜的健身 App，TUT.SYS 使用 **「一鍵捷徑 + 零維護後端 + 高質感儀表板」** 架構。我們不只追蹤你的次數，我們追蹤你的「時間與價值（ROI）」，確保你的每一分月費都有被搾算到底。

## 🎯 核心理念：Time Under Tension

在健身術語中，**TUT (Time Under Tension)** 代表肌肉處於張力下的總時間，也是肌肥大效果的關鍵指標。我們將這個概念延伸到你待在健身房學習對抗重力的每一分鐘。在這裡，你投資的不再只是月費，還有你在鐵館中經歷的壓力與成長。

## 🛠️ 系統架構

這是一個極度輕量但功能齊全的全端架構：

1. **資料收集 (iOS Shortcuts)**：利用 iPhone 內建「捷徑」一鍵打卡入場與出場，完全無需開啟任何網站或 App。
2. **免伺服器後端 (Google Apps Script + Sheets)**：藉由 `gas_backend.gs` 自動部署 Webhook。捷徑一打卡，紀錄自動排排站寫進你的 Google 試算表，免費、無 CORS 問題且永不當機。
3. **頂級視覺儀表板 (GitHub Pages)**：部署於 `app/` 目錄下的前端單頁應用程式 (SPA)。我們拒絕廉價的預設樣式，採用 **Bento/Asymmetrical 排版**、**Fluid Typography (流體字體)** 以及 **頂級特調深色模式 (oklch 顏色函數)** 與細膩的動畫引擎。

## 🚀 部署與使用方法

### 1. 後端 (Database & API)
1. 建立一個新的 Google 試算表，並確認下方有一個名稱為 `RawData` 的工作表。
2. 進入試算表的 `擴充功能 -> Apps Script`。
3. 貼上專案中的 `gas_backend.gs` 覆蓋原本內容。
4. **重要**：手動下拉選擇任何一個函式並點擊「執行 (Run)」以授予系統存取此試算表的 Google OAuth 權限。
5. 點選 `部署 -> 新增部署作業 -> 網頁應用程式`，權限設定為 `所有人`，即可獲得你的專屬 **Webhook URL**。

### 2. 前端 (Dashboard)
1. 開啟本專案的 `app/app.js`。
2. 將第一行 `gasWebhookUrl: ''` 填入你上一階段獲得的 Webhook URL。
3. 將本專案 commit 並推送到 GitHub（例如：使用 GitHub Pages 指定 `main` 分支）。
4. 大功告成！你的前端儀表板正式上線。
*(前端介面的右上角 **ROI 按鈕** 還內建隱藏設定，能讓你根據月費自由調控每分鐘的換算估值 NT$)*

### 3. 客戶端 (iOS Shortcuts)
在你的 iPhone 內建的捷徑 App 中設立選單：
- **入場**：使用 `取得網址內容` 發送 `POST` 請求到你的 Webhook URL，帶入 JSON `{ "action": "entry" }`，並跳轉開啟你健身房的條碼網頁。
- **出場**：同上，發送 `POST` 帶入 JSON `{ "action": "exit" }` 即可。

## ✨ UI/UX 特色
- **拒絕 AI 感**：沒有氾濫的卡片或廉價的發光毛玻璃，只有為數據而生的資訊層級。
- **Fluid Layout**：無縫適配 iPhone 直立畫面與大螢幕平板/電腦，視覺重心永遠精準。
- **Exponential Easing**：數字跳動與設定面板的動畫搭載指數級減速函數，賦予原生的滑順體驗。

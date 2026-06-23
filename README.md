# Ckes專案管理系統 (ckes-projects-manager)

以 Google Drive 為後端儲存的專案管理系統，使用 Quasar (Vue 3) 建構。

## 功能特色

- **Google OAuth 登入** — 使用 Google 帳號登入，無需額外資料庫
- **Google Drive 儲存** — 所有資料以 JSON 檔案儲存在個人雲端硬碟應用程式資料夾
- **離線快取** — IndexedDB 本地快取 + TTL 過期背景更新，減少 API 請求
- **專案管理** — 建立、編輯、刪除專案
- **任務管理** — 專案內任務管理，支援前置任務相依性與狀態追蹤，並可指派該任務負責人員
- **資源管理** — 專案內檔案上傳/下載
- **通訊錄管理** — 聯絡人與專案人員管理
- **請購單管理** — 採購需求請購單列印與追蹤，可連動專案作經費控管

## 環境變數

```env
QCLI_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

請到 [Google Cloud Console](https://console.cloud.google.com) 建立 OAuth 2.0 用戶端 ID（網頁應用程式類型）。

## 開發

```bash
pnpm install
quasar dev
```

## 建置

```bash
quasar build
```

## 設定

參考 [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js)。

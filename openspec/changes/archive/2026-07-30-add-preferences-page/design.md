## Context

專案使用 Quasar (Vue 3) + Google Drive API 儲存資料。目前左側選單定義在 `MainLayout.vue`、路由定義在 `routes.js`、資料存取透過 `useDriveStorage.js` 的 `readData`/`writeData` 模式。所有偏好設定將以新的 `settings` 資料類型存入 `ckes_settings.json`。

## Goals / Non-Goals

**Goals:**

- 新增 `settings` 資料類型至 Google Drive 儲存層
- 新增 SettingsPage 頁面與 `/settings` 路由
- 新增 settingsStore 管理設定值的 CRUD
- 左側選單加入「偏好設定」連結
- `purchasePrint.js` 支援 `{school_title}` 佔位符，資料來自設定值

**Non-Goals:**

- 不處理多使用者設定共用（每個 Google 帳號獨立設定）
- 不引入 i18n 或多語系

## Decisions

### 1. 資料類型命名：`settings`

`useDriveStorage.js` 的 `FILE_NAMES` 加一筆 `settings → 'ckes_settings.json'`。

### 2. 預設值位置

預設值存在 `settingsStore.js` 的 `DEFAULTS` 物件中。`load()` 時若 Google Drive 的 `readData` 回傳空值或陣列（相容首次建立時的 `[]`），回退至 `DEFAULTS`。

### 3. SettingsStore 寫入策略

只在使用者點擊「儲存設定」時才寫入 Google Drive，避免每次載入頁面都不必要寫入。Store 的 `save()` 遵循現有 `writeData` 模式（寫入 IndexedDB 快取 + 排程背景同步）。

### 4. 套印資料流

`downloadOdt(request, schoolTitle)` 改為接受第二個參數。`PurchaseRequestManagement.vue:doPrint()` 先讀取 `settingsStore.settings.schoolTitle` 再傳入。`purchasePrint.js` 保持純工具函式，不直接依賴 Pinia。

## Risks / Trade-offs

- 設定檔在 Google Drive 的初次建立會產生 `[]`（`ensureFileInFolder` 的既有行為），`readData` 需要處理此邊界 case
- 離線模式下無法寫入 Google Drive，但可先寫入 IndexedDB 快取，待連線後同步（現有同步機制已支援）

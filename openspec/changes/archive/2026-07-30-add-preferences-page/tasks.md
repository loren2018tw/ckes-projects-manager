## 1. 資料層 — 新增 settings 類型

- [x] 1.1 在 `useDriveStorage.js` 的 `FILE_NAMES` 中新增 `settings: 'ckes_settings.json'`
- [x] 1.2 建立 `stores/settingsStore.js`：定義 `DEFAULTS`、`load()`、`save()`、`update(fields)`
- [x] 1.3 `load()` 中處理 Google Drive 首次建立回傳 `[]` 的邊界 case，回退至 `DEFAULTS`

## 2. 頁面與路由

- [x] 2.1 建立 `pages/SettingsPage.vue`：包含「請購單抬頭」輸入欄位與「儲存設定」按鈕
- [x] 2.2 在 `router/routes.js` 新增 `{ path: 'settings', component: () => import('@/pages/SettingsPage.vue') }`
- [x] 2.3 在 `MainLayout.vue` 一般模式選單「請購單管理」下方新增「偏好設定」連結（圖示 `settings`，路由 `/settings`）

## 3. 套印整合

- [x] 3.1 修改 `utils/purchasePrint.js` 的 `generateOdtBlob` 接受 `schoolTitle` 參數，加入 `placeholders.school_title`
- [x] 3.2 同步修改 `downloadOdt` 接受並傳遞 `schoolTitle` 參數
- [x] 3.3 修改 `normalizeContentXml` 的 `splitPlaceholders` 陣列，新增 `'school_title'`
- [x] 3.4 修改 `PurchaseRequestManagement.vue` 的 `doPrint()`：載入 `settingsStore`，讀取 `schoolTitle` 後傳入 `downloadOdt`

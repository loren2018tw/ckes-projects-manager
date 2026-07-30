## Why

請購單管理目前缺乏一個集中管理偏好設定的頁面，使用者在列印請購單時需要使用固定的學校名稱。需要一個可自訂的請購單抬頭設定，以便修改後套印至請購單中。

## What Changes

- 左側主選單新增「偏好設定」頁面連結
- 新增 `/settings` 路由及其對應頁面
- 新增 `settings` Google Drive 資料類型，儲存系統偏好設定
- 偏好設定頁面包含「請購單抬頭」欄位，預設值為「臺中市東區成功國民小學」
- 請購單套印功能新增 `{{school_title}}` 佔位符，使用偏好設定中的值

## Capabilities

### New Capabilities

- `preferences`: 系統偏好設定管理，包含請購單抬頭欄位的讀取與儲存

### Modified Capabilities

- `purchase-requisition-print`: 請購單套印佔位符增加 `{{school_title}}`，資料來源為偏好設定

## Impact

- `src/layouts/MainLayout.vue` — 選單新增「偏好設定」連結
- `src/router/routes.js` — 新增 `/settings` 路由
- `src/pages/SettingsPage.vue` — 新增偏好設定頁面
- `src/stores/settingsStore.js` — 新增設定值 Pinia store
- `src/composables/useDriveStorage.js` — `FILE_NAMES` 新增 `settings`
- `src/utils/purchasePrint.js` — 支援 `{{school_title}}` 佔位符
- `src/pages/PurchaseRequestManagement.vue` — 列印時傳入學校抬頭
- `public/voucher_template.odt` — 已手動加入 `{{school_title}}` 佔位符

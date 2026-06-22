## Why

學校行政作業中，請購單是常見且重要的文書流程。目前系統缺乏請購單管理功能，使用者需以紙本或外部工具處理，不利於資料整合與查詢。本模組將請購單管理納入系統，提升行政效率與資料一致性。

## What Changes

- 新增「請購單管理」獨立模組，包含路由、選單、頁面
- 實作請購單 CRUD（新增、編輯、刪除、複製）
- 實作請購項目 CRUD（新增、編輯、刪除），嵌入在請購單頁面中
- 請購單與專案管理模組連結：使用專款欄位可下拉選擇未結案專案
- 保留「列印請購單」按鈕位置，暫不實作功能

## Capabilities

### New Capabilities

- `purchase-request`: 請購單管理，包含請購單與請購項目的完整 CRUD、複製功能、專款連結

### Modified Capabilities

（無修改既有規格）

## Impact

- `src/router/routes.js`：新增 `/purchase-requests` 路由
- `src/layouts/MainLayout.vue`：左側選單新增「請購單管理」導航項目
- `src/pages/`：新增 `PurchaseRequestManagement.vue` 頁面
- `src/composables/`：可能需要新的 `usePurchaseRequest.js` 或 `useDriveStorage.js` 擴充（視資料儲存方式而定）
- Google Drive 資料結構新增請購單與請購項目資料夾/檔案

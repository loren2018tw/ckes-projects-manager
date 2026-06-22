## Why

目前請購單管理功能已可建立請購單及請購項目，但缺少列印功能，使用者需要將請購單輸出為 ODT 檔案自行列印，以便進行紙本簽核流程。

## What Changes

- 啟用「列印請購單」按鈕，點擊後根據範本檔 `public/voucher_template.odt` 套印請購單資料
- 新增 `easy-template-x` npm 套件，用於處理 ODT 範本套印
- 實作套印邏輯：將請購單欄位（用途、日期、專款名稱、廠商、備註等）及請購項目列表填入範本
- 實作金額數字拆位邏輯：將實支金額依億、千萬、百萬、十萬、萬、千、百、十、元拆為 9 個個別數字填入版面
- 實作檔案下載功能：套印完成後直接下載 ODT 檔案
- 請購項目不足 7 項時以空白列補足，超過 7 項則自動遞增列數

## Capabilities

### New Capabilities

- `purchase-requisition-print`: 請購單列印功能，包含 ODT 範本套印、金額拆位、項目列數自動調整及檔案下載

### Modified Capabilities

- 無（此為全新功能，不修改既有規格）

## Impact

- 新增依賴套件：`easy-template-x`（npm）
- 修改檔案：`src/pages/PurchaseRequestManagement.vue`（啟用列印按鈕）
- 新增檔案：src 目錄下新增列印功能相關程式碼
- 範本檔案 `public/voucher_template.odt` 已存在，不須新增

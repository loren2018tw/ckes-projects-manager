## 1. 安裝依賴套件

- [x] 1.1 安裝 `easy-template-x` npm 套件

## 2. 實作套印工具函式

- [x] 2.1 建立 `src/utils/purchasePrint.js`，實作 `generateOdtBlob(request)` 函式
- [x] 2.2 實作 fetch ODT 範本並以 JSZip 載入
- [x] 2.3 實作請購單一般欄位填入（purpose, special_fund_name, manufacturer, note 及日期相關）
- [x] 2.4 實作 `{#items}` 區塊套印，處理請購項目列表資料
- [x] 2.5 實作 `{amount}` 計算邏輯（永遠為所有請購項目小計加總）
- [x] 2.6 實作實支金額計算及拆位邏輯（`manualAmount` 有值則用該值，否則等於 `{amount}`；拆為 {8}~{0} 共 9 個欄位，位數不存在時填入 "-"）
- [x] 2.7 實作請購項目補空白列邏輯（不足 7 項時補空白）
- [x] 2.8 實作產出 Blob 並觸發瀏覽器下載 ODT 檔案

## 3. 整合前端頁面

- [x] 3.1 啟用 `PurchaseRequestManagement.vue` 中的「列印請購單」按鈕
- [x] 3.2 點擊按鈕時呼叫套印工具並觸發下載

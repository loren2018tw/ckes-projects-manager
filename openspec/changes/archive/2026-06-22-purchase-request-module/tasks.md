## 1. 基礎設定

- [x] 1.1 在 `useDriveStorage.js` 的 `FILE_NAMES` 中新增 `purchaseRequests: 'ckes_purchase_requests.json'`
- [x] 1.2 在 `src/router/routes.js` 新增路由 `/purchase-requests` 指向 `PurchaseRequestManagement.vue`
- [x] 1.3 在 `MainLayout.vue` 左側選單新增「請購單管理」導航項目（icon: `receipt`，路徑 `/purchase-requests`）

## 2. Pinia Store — 請購單資料層

- [x] 2.1 建立 `src/stores/purchaseRequestStore.js`，使用 `useDriveStorage` 讀寫 `purchaseRequests` 資料
- [x] 2.2 實作 `load()`：從 Drive 讀取 `ckes_purchase_requests.json`
- [x] 2.3 實作 `save()`：將資料寫回 Drive
- [x] 2.4 實作 `add(request)`：新增請購單（含 id 產生、日期預設為當日）
- [x] 2.5 實作 `update(id, fields)`：更新指定請購單
- [x] 2.6 實作 `remove(id)`：刪除指定請購單
- [x] 2.7 實作 `duplicate(id)`：複製請購單（日期改當日、重新產生 id 及項目 id）

## 3. 請購單管理頁面 — 上半部（請購單清單）

- [x] 3.1 建立 `src/pages/PurchaseRequestManagement.vue`，頁面分上半部請購單清單、下半部請購項目清單
- [x] 3.2 上半部使用 `QTable` 顯示請購單清單（欄位：請購日期、用途說明、使用專款、採購廠商、實支金額）
- [x] 3.3 實作「新增請購單」按鈕，點擊開啟 `QDialog` 對話框，內含表單欄位（請購日期、用途說明、使用專款下拉、採購廠商、備註）
- [x] 3.4 使用專款下拉選單：透過 `useDriveStorage` 讀取 `projects` 資料，過濾 `status !== 'closed'` 的專案
- [x] 3.5 實作「編輯請購單」按鈕（選取後可點擊），開啟對話框載入該筆資料供修改
- [x] 3.6 實作「刪除請購單」按鈕，點擊後顯示確認對話框，確認後刪除
- [x] 3.7 實作「複製請購單」按鈕，點擊後複製該筆請購單並顯示在清單中
- [x] 3.8 實作「列印請購單」按鈕（暫不實作功能，顯示 disabled 或提示）
- [x] 3.9 實支金額顯示邏輯：若手動填寫則顯示手動值，若空白則自動計算該單所有項目小計合計

## 4. 請購單管理頁面 — 下半部（請購項目清單）

- [x] 4.1 下半部 `QTable` 顯示所選請購單的請購項目（欄位：品名、規格、單位、數量、單價、小計）
- [x] 4.2 點選不同請購單時，下方項目清單同步更新
- [x] 4.3 實作「新增請購項目」按鈕，點擊開啟 `QDialog`，內含表單（品名、規格、單位、數量、單價）
- [x] 4.4 小計為自動計算欄位（單價 × 數量）
- [x] 4.5 每筆項目右方實作「編輯」按鈕，點擊開啟對話框修改該項目
- [x] 4.6 每筆項目右方實作「刪除」按鈕，點擊後顯示確認對話框，確認後刪除

## 5. 驗證與測試

- [x] 5.1 確認路由 `/purchase-requests` 可正常導航
- [x] 5.2 確認左側選單「請購單管理」可正常點選進入頁面
- [x] 5.3 確認請購單 CRUD 四項功能正常運作
- [x] 5.4 確認複製功能正常產生新單且日期為當日
- [x] 5.5 確認請購項目 CRUD 三項功能正常運作
- [x] 5.6 確認實支金額自動計算邏輯正確
- [x] 5.7 確認專款下拉僅顯示未結案專案

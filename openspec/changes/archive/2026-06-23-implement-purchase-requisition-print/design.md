## Context

目前請購單管理頁面 (`PurchaseRequestManagement.vue`) 已具備請購單 CRUD 及請購項目管理功能，但「列印請購單」按鈕目前處於 disabled 狀態。範本檔案 `public/voucher_template.odt` 已使用 `easy-template-x` 相容的佔位符格式製作完成，需實作前端套印及下載功能。

資料皆儲存在使用者的 Google Drive 中，所有處理均在瀏覽器端完成，無後端伺服器。

## Goals / Non-Goals

**Goals:**

- 啟用「列印請購單」按鈕，點擊後下載 ODT 檔案
- 使用 `easy-template-x` 套件讀取 ODT 範本並套印資料
- 支援所有範本佔位符的資料填入（如：用途、日期、專款名稱、廠商、備註等）
- 支援 `{#items}` / `{/items}` 區塊重複套印請購項目列表
- 實支金額自動計算：若有設定 `manualAmount` 則使用該值，否則以所有請購項目加總計算
- 實支金額拆位填入：億(`{8}`)、千萬(`{7}`)、百萬(`{6}`)、十萬(`{5}`)、萬(`{4}`)、千(`{3}`)、百(`{2}`)、十(`{1}`)、元(`{0}`)
- 請購項目不足 7 項時自動補空白列至 7 項，超過 7 項則正常輸出
- 套印完成後直接下載 ODT 檔案，不涉及伺服器端處理

**Non-Goals:**

- 不實作 PDF 轉換（直接提供 ODT 格式）
- 不實作批次列印（一次僅列印一份請購單）
- 不修改範本檔案內容或格式
- 不實作預覽功能

## Decisions

1. **使用 `easy-template-x` 套件進行 ODT 套印**
   - 選擇理由：範本已使用 easy-template-x 相容格式製作，為瀏覽器端 ODT 套印的主流方案
   - 替代方案：Docxtemplater（僅支援 DOCX）、手動解析 XML（複雜度高、維護成本高）

2. **純前端處理不下後端**
   - 選擇理由：專案無後端伺服器，所有資料透過 Google Drive API 存取
   - 實作方式：透過 Vite 開發伺服器代理或直接以 Blob URL 方式下載

3. **範本讀取方式：使用 fetch 取得 `/voucher_template.odt`**
   - `public/` 目錄下的檔案在 Quasar 建置後可直接透過 URL 存取
   - 使用 ArrayBuffer 讀取後傳入 `easy-template-x` 處理

4. **金額拆位邏輯**
   - `{amount}` 永遠為所有請購項目小計加總
   - 實支金額（拆為 {8}~{0}）：若 `manualAmount` 有值則用該值，否則等於 `{amount}`
   - 將實支金額轉為整數（元為單位），由右至左逐位取出對應數字
   - 若該位數不存在（如億位），填入 `"-"` 字串

5. **補空白列策略**
   - 若 items.length < 7，補足至 7 筆（空白物件）
   - 若 items.length >= 7，直接輸出所有項目
   - 空白列的編號仍須遞增

## Risks / Trade-offs

- `easy-template-x` 在瀏覽器端需要處理 CORS 問題 → 使用 `fetch` 取得 `public/` 下的本地檔案無此問題
- 套件目前維護頻率較低 → 功能單純僅需基本套印功能，風險可控
- 金額拆位與 ODT 版面可能不對齊 → 實支金額欄位在範本中已配置 9 個固定欄位，依序填入即可

## Template Placeholders Reference

以下為 `public/voucher_template.odt` 中使用的所有佔位符：

| 佔位符                | 說明                  | 資料來源                                                       |
| --------------------- | --------------------- | -------------------------------------------------------------- |
| `{purpose}`           | 用途說明              | `request.description`                                          |
| `{special_fund_name}` | 使用專款名稱          | 有關聯專案時為 `【專款：{fundProject}】`，否則為空白           |
| `{manufacturer}`      | 採購廠商              | `request.vendor`                                               |
| `{yy}`                | 民國年（日期）        | `request.date` 轉換                                            |
| `{mm}`                | 月（日期）            | `request.date`                                                 |
| `{dd}`                | 日（日期）            | `request.date`                                                 |
| `{note}`              | 備註                  | `request.remark`                                               |
| `{amount}`            | 金額合計              | 所有請購項目小計加總（不受 `manualAmount` 影響）               |
| `{8}`                 | 實支金額 - 億位數字   | 金額拆位結果（`manualAmount` 有值則用該值，否則用 `{amount}`） |
| `{7}`                 | 實支金額 - 千萬位數字 | 金額拆位結果                                                   |
| `{6}`                 | 實支金額 - 百萬位數字 | 金額拆位結果                                                   |
| `{5}`                 | 實支金額 - 十萬位數字 | 金額拆位結果                                                   |
| `{4}`                 | 實支金額 - 萬位數字   | 金額拆位結果                                                   |
| `{3}`                 | 實支金額 - 千位數字   | 金額拆位結果                                                   |
| `{2}`                 | 實支金額 - 百位數字   | 金額拆位結果                                                   |
| `{1}`                 | 實支金額 - 十位數字   | 金額拆位結果                                                   |
| `{0}`                 | 實支金額 - 元位數字   | 金額拆位結果                                                   |
| `{#items}`            | 請購項目列表區塊開始  | -                                                              |
| `{/items}`            | 請購項目列表區塊結束  | -                                                              |
| `{item_quantity}`     | 數量                  | `item.quantity`                                                |
| `{item_name}`         | 品名                  | `item.name`                                                    |
| `{item_spec}`         | 規格                  | `item.spec`                                                    |
| `{item_unit}`         | 單位                  | `item.unit`                                                    |
| `{item_price}`        | 單價                  | `item.unitPrice`                                               |
| `{item_total}`        | 小計                  | `quantity * unitPrice`                                         |

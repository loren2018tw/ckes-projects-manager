## ADDED Requirements

### Requirement: 列印請購單按鈕

系統 SHALL 在請購單管理頁面提供「列印請購單」按鈕，當選取請購單時按鈕可點擊，未選取時維持停用狀態。

#### Scenario: 有選取請購單時按鈕可點擊

- **WHEN** 使用者在請購單列表中點選一筆請購單
- **THEN** 「列印請購單」按鈕 SHALL 變為可點擊狀態

#### Scenario: 未選取請購單時按鈕停用

- **WHEN** 使用者未選取任何請購單
- **THEN** 「列印請購單」按鈕 SHALL 維持停用狀態

### Requirement: 套印 ODT 範本

系統 SHALL 使用 `easy-template-x` 套件讀取 `public/voucher_template.odt` 並將請購單資料填入對應佔位符後產生 ODT 檔案下載。

#### Scenario: 成功套印並下載

- **WHEN** 使用者點擊「列印請購單」按鈕
- **THEN** 系統讀取範本檔套入請購單資料
- **THEN** 瀏覽器下載產生的 ODT 檔案

### Requirement: 範本佔位符對應

系統 SHALL 根據以下對應關係將請購單資料填入範本佔位符：

| 佔位符                | 資料來源                                             |
| --------------------- | ---------------------------------------------------- |
| `{purpose}`           | `request.description`                                |
| `{special_fund_name}` | 有關聯專案時為 `【專款：{fundProject}】`，否則為空白 |
| `{manufacturer}`      | `request.vendor`                                     |
| `{yy}`                | `request.date` 民國年                                |
| `{mm}`                | `request.date` 月份                                  |
| `{dd}`                | `request.date` 日期                                  |
| `{note}`              | `request.remark`                                     |

#### Scenario: 一般資料填入

- **WHEN** 請購單有完整的用途說明、專款名稱、廠商、日期、備註資料
- **THEN** 對應佔位符 SHALL 被替換為實際資料值

#### Scenario: 日期轉民國年

- **WHEN** 請購日期為 2025-03-15
- **THEN** `{yy}` 應填入 `114`，`{mm}` 填入 `3`，`{dd}` 填入 `15`

#### Scenario: 有關聯專案時 special_fund_name 套印格式

- **WHEN** 請購單關聯的專案名稱為「校舍修繕工程」
- **THEN** `{special_fund_name}` 填入 `【專款：校舍修繕工程】`

#### Scenario: 無關聯專案時 special_fund_name 為空白

- **WHEN** 請購單未關聯任何專案（`fundProject` 為 `null`）
- **THEN** `{special_fund_name}` 填入空字串

### Requirement: 請購項目列表套印

系統 SHALL 使用範本中包含 `{item_name}`、`{item_spec}`、`{item_quantity}`、`{item_unit}`、`{item_price}`、`{item_total}` 的請購項目列作為列範本，重複套印請購項目列表。若請購項目不足 7 項，SHALL 補空白列至至少 7 項；超過 7 項則全數輸出。

#### Scenario: 不足 7 項時補空白列

- **WHEN** 請購單僅有 3 筆請購項目
- **THEN** 輸出 7 列資料，其中後 4 列品名、規格、單位、數量、單價、小計為空白
- **THEN** 項次為 1~7 連續編號（由範本本身提供列號）

#### Scenario: 超過 7 項時全數輸出

- **WHEN** 請購單有 10 筆請購項目
- **THEN** 輸出 10 列資料，所有項目正常顯示
- **THEN** 項次為 1~10 連續編號（由範本本身提供列號）

#### Scenario: 請購項目資料填入

- **WHEN** 請購項目有品名、規格、單位、數量、單價
- **THEN** `{item_name}` 填入品名
- **THEN** `{item_spec}` 填入規格
- **THEN** `{item_quantity}` 填入數量
- **THEN** `{item_unit}` 填入單位
- **THEN** `{item_price}` 填入單價數值
- **THEN** `{item_total}` 填入 `數量 × 單價` 的小計金額

### Requirement: 金額合計 ({amount})

系統 SHALL 將 `{amount}` 替換為所有請購項目 `(數量 × 單價)` 的加總，不受 `manualAmount` 影響。

#### Scenario: 有請購項目時加總計算

- **WHEN** 請購單有 2 筆項目，分別為 (數量 2 × 單價 100) 及 (數量 3 × 單價 50)
- **THEN** `{amount}` 為 350

#### Scenario: 無請購項目時金額為 0

- **WHEN** 請購單無任何請購項目
- **THEN** `{amount}` 為 0

### Requirement: 實支金額拆位填入 ({8}~{0})

系統 SHALL 將實支金額由右至左逐位拆解為億 (`{8}`)、千萬 (`{7}`)、百萬 (`{6}`)、十萬 (`{5}`)、萬 (`{4}`)、千 (`{3}`)、百 (`{2}`)、十 (`{1}`)、元 (`{0}`) 共 9 個欄位。若該位數不存在（無對應數字），填入 `"-"`。

實支金額的計算方式：

- 若 `manualAmount` 不為空白/`null`，實支金額 = `manualAmount`
- 否則實支金額 = `{amount}`（即所有請購項目加總）

#### Scenario: 未設定 manualAmount 時實支金額等於 {amount}

- **WHEN** 請購單未設定 `manualAmount`，且請購項目加總為 12345
- **THEN** 實支金額為 12345
- **THEN** `{8}=-`, `{7}=-`, `{6}=-`, `{5}=-`, `{4}=1`, `{3}=2`, `{2}=3`, `{1}=4`, `{0}=5`

#### Scenario: 有設定 manualAmount 時使用該值

- **WHEN** 請購單設定 `manualAmount` 為 50000，且請購項目加總為 350
- **THEN** `{amount}` 為 350（項目加總）
- **THEN** 實支金額為 50000
- **THEN** `{8}=-`, `{7}=-`, `{6}=-`, `{5}=5`, `{4}=0`, `{3}=0`, `{2}=0`, `{1}=0`, `{0}=0`

#### Scenario: 金額 123456789 元

- **WHEN** 實支金額為 123456789
- **THEN** `{8}=1`, `{7}=2`, `{6}=3`, `{5}=4`, `{4}=5`, `{3}=6`, `{2}=7`, `{1}=8`, `{0}=9`

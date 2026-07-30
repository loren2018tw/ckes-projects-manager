## Purpose

提供一個集中管理系統偏好設定的頁面，讓使用者可以自訂請購單抬頭等系統級設定值，避免直接修改程式碼或範本檔案。

## Requirements

### Requirement: 偏好設定頁面

系統 SHALL 在左側主選單提供「偏好設定」頁面連結，該頁面 SHALL 包含請購單抬頭的設定欄位。

#### Scenario: 從主選單進入偏好設定

- **WHEN** 使用者點擊左側選單的「偏好設定」
- **THEN** 系統導航至 `/settings` 頁面
- **THEN** 頁面標題顯示「偏好設定」

#### Scenario: 顯示已儲存的學校抬頭

- **WHEN** 使用者進入偏好設定頁面
- **THEN** 頁面顯示「請購單抬頭」欄位
- **THEN** 欄位內容為目前設定的學校名稱

#### Scenario: 初次使用顯示預設值

- **WHEN** 使用者首次進入偏好設定頁面且尚未儲存任何設定
- **THEN** 「請購單抬頭」欄位預設顯示「臺中市東區成功國民小學」

### Requirement: 儲存偏好設定

系統 SHALL 提供儲存按鈕，將偏好設定寫入 Google Drive 的 `ckes_settings.json`。

#### Scenario: 成功儲存設定

- **WHEN** 使用者修改請購單抬頭後點擊「儲存設定」
- **THEN** 系統顯示成功通知
- **THEN** 設定值被寫入 Google Drive

#### Scenario: 儲存後重新載入顯示正確值

- **WHEN** 使用者儲存設定後重新整理頁面
- **THEN** 「請購單抬頭」欄位顯示方才儲存的值

### Requirement: 偏好設定資料結構

系統 SHALL 使用 `ckes_settings.json` 以 JSON 物件格式儲存偏好設定。

#### Scenario: 資料結構格式

- **WHEN** 系統寫入偏好設定至 Google Drive
- **THEN** 產生的 JSON 格式為：

```json
{
  "schoolTitle": "臺中市東區成功國民小學"
}
```

### Requirement: 請購單套印支援學校抬頭

系統 SHALL 在請購單套印時將偏好設定中的學校抬頭填入 `{{school_title}}` 佔位符。

#### Scenario: 列印時帶入學校抬頭

- **WHEN** 使用者列印請購單
- **THEN** 系統讀取偏好設定中的 `schoolTitle`
- **THEN** `{{school_title}}` 被替換為設定的學校名稱

#### Scenario: 修改抬頭後列印使用新值

- **WHEN** 使用者修改請購單抬頭為「臺中市北區國光國民小學」後列印請購單
- **THEN** `{{school_title}}` 被替換為「臺中市北區國光國民小學」

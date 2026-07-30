## MODIFIED Requirements

### Requirement: 範本佔位符對應

系統 SHALL 根據以下對應關係將請購單資料填入範本佔位符：

| 佔位符                | 資料來源                                                     |
| --------------------- | ------------------------------------------------------------ |
| `{purpose}`           | `request.description`                                        |
| `{special_fund_name}` | 有關聯專案時為 `【專款：{fundProject}】`，否則為空白         |
| `{manufacturer}`      | `request.vendor`                                             |
| `{school_title}`      | 偏好設定中的 `schoolTitle`，預設為「臺中市東區成功國民小學」 |
| `{yy}`                | `request.date` 民國年                                        |
| `{mm}`                | `request.date` 月份                                          |
| `{dd}`                | `request.date` 日期                                          |
| `{note}`              | `request.remark`                                             |

#### Scenario: 範本包含 school_title 佔位符

- **WHEN** 請購單範本中包含 `{school_title}` 佔位符
- **THEN** 系統將 `{school_title}` 替換為偏好設定中的學校抬頭

#### Scenario: 套印時讀取最新設定值

- **WHEN** 使用者剛修改學校抬頭並儲存，隨即列印請購單
- **THEN** `{school_title}` 使用最新的設定值

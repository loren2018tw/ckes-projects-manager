# project-dashboard Specification (Delta)

## MODIFIED Requirements

### Requirement: 專案儀表板

專案儀表板為進入專案管理後的預設頁面，在同一頁面中整合顯示專案內各功能的摘要資訊。

#### Scenario: 進入專案顯示儀表板

- **WHEN** 使用者從專案列表點選專案名稱進入管理頁面
- **THEN** 預設顯示儀表板頁面，路徑為 `/projects/:projectId`

#### Scenario: 儀表板顯示資源摘要

- **WHEN** 儀表板頁面載入
- **THEN** 顯示資源統計資訊：各分類的檔案數量

#### Scenario: 儀表板顯示任務摘要

- **WHEN** 儀表板頁面載入
- **THEN** 使用 `TaskStatsCard` 元件顯示任務統計資訊：總任務數、已完成數、未完成數、已逾期數、即將到期任務列表

### Requirement: 儀表板快捷操作

儀表板提供常用操作捷徑，方便使用者快速執行常見動作。

#### Scenario: 儀表板提供上傳捷徑

- **WHEN** 使用者在儀表板點擊「上傳檔案」按鈕
- **THEN** 系統切換至資源管理頁面

#### Scenario: 儀表板提供新增任務捷徑

- **WHEN** 使用者在儀表板點擊「新增任務」按鈕
- **THEN** 系統切換至任務管理頁面

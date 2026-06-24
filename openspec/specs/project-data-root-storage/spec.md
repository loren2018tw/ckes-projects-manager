## ADDED Requirements

### Requirement: 專案任務資料儲存在應用程式根目錄

系統 SHALL 將每個專案的任務資料儲存在 Google Drive 應用程式根目錄的 `ckes_tasks_{projectId}.json` 檔案中，而非專案資料夾內。

#### Scenario: 讀取專案任務資料

- **WHEN** 使用者開啟專案任務管理頁面
- **THEN** 系統從應用程式根目錄讀取 `ckes_tasks_{projectId}.json`，而非從專案資料夾讀取 `ckes_tasks.json`

#### Scenario: 寫入專案任務資料

- **WHEN** 使用者新增、編輯或刪除任務
- **THEN** 系統將完整任務陣列寫入應用程式根目錄的 `ckes_tasks_{projectId}.json`

### Requirement: 專案檔案註冊表儲存在應用程式根目錄

系統 SHALL 將每個專案的檔案註冊表儲存在 Google Drive 應用程式根目錄的 `ckes_file_registry_{projectId}.json` 檔案中。

#### Scenario: 讀取專案檔案註冊表

- **WHEN** 使用者開啟專案資源管理頁面
- **THEN** 系統從應用程式根目錄讀取 `ckes_file_registry_{projectId}.json`

#### Scenario: 寫入檔案註冊表

- **WHEN** 使用者上傳或刪除專案檔案
- **THEN** 系統更新應用程式根目錄的 `ckes_file_registry_{projectId}.json`

### Requirement: 資料遷移機制

系統 SHALL 在首次啟動時提供一次性資料遷移，將既有專案資料夾內的 `ckes_tasks.json` 與 `ckes_file_registry.json` 搬移至應用程式根目錄。

#### Scenario: 首次啟動遷移

- **WHEN** 使用者更新後首次開啟應用程式
- **THEN** 系統檢查根目錄是否存在 `ckes_migration_done.flag` 標記檔案
- **AND** 若無標記檔案，系統走訪所有專案資料夾，將 `ckes_tasks.json` 搬移為 `ckes_tasks_{projectId}.json`
- **AND** 將 `ckes_file_registry.json` 搬移為 `ckes_file_registry_{projectId}.json`
- **AND** 搬移完成後刪除專案資料夾內的舊 JSON 檔案
- **AND** 在根目錄建立 `ckes_migration_done.flag` 標記檔案
- **AND** 若已有標記檔案則跳過遷移

#### Scenario: 遷移中斷後重啟

- **WHEN** 遷移過程中應用程式意外關閉
- **THEN** 下次啟動時系統檢查根目錄無標記檔案，重新執行遷移
- **AND** 已搬移的專案不必重複搬移（檢查目標檔案是否已存在）

### Requirement: 專案資料夾保留用於檔案分類

專案資料夾 SHALL 保留僅用於檔案上傳分類（公文、附件、報表、其他子資料夾），不再包含 JSON 資料檔案。

#### Scenario: 專案資料夾結構

- **WHEN** 使用者瀏覽專案資料夾
- **THEN** 資料夾內僅包含 `公文/`、`附件/`、`報表/`、`其他/` 子資料夾及使用者上傳的檔案
- **AND** 不包含 `ckes_tasks.json` 或 `ckes_file_registry.json`

### Requirement: 刪除專案時清理根目錄檔案

系統 SHALL 在刪除專案時一併刪除根目錄對應的 `ckes_tasks_{projectId}.json` 與 `ckes_file_registry_{projectId}.json`。

#### Scenario: 刪除專案清理資料

- **WHEN** 使用者刪除專案
- **THEN** 系統除了刪除專案資料夾外，亦從根目錄刪除 `ckes_tasks_{projectId}.json` 和 `ckes_file_registry_{projectId}.json`

## Context

所有應用資料以 JSON 格式儲存在使用者 Google Drive 的 `ckes-projects-manager` 應用程式資料夾中。目前存取路徑分為兩種：

- **全域資料**（contacts, projects, projectStaff, purchaseRequests）：直接讀寫根目錄的 JSON 檔案
- **專案資料**（tasks, file_registry）：需先定位專案資料夾，再於資料夾內讀寫 JSON 檔案

此設計將專案資料統一改為根目錄儲存，與全域資料採用一致的模式。

## Goals / Non-Goals

**Goals:**

- 將 `ckes_tasks.json` 與 `ckes_file_registry.json` 從各專案資料夾移至應用程式根目錄
- 每個專案使用獨立 JSON 檔案，命名模式：`ckes_tasks_{projectId}.json`、`ckes_file_registry_{projectId}.json`
- 修改 `readProjectData` / `writeProjectData`，直接操作根目錄檔案
- 提供一次性資料遷移機制，將既有資料搬移至新位置
- 專案資料夾保留僅用於檔案上傳分類（公文、附件、報表、其他）

**Non-Goals:**

- 不改變全域資料（contacts, projects, projectStaff, purchaseRequests）的儲存方式
- 不改變 IndexedDB 快取結構（僅 cache key 隨之調整）
- 不改變 Pinia store 的公開 API 簽名（load/save 仍接受 projectId）

## Decisions

### 1. 命名模式：`ckes_{dataType}_{projectId}.json`

- **選擇原因**：與現有全域檔案命名 `ckes_{dataType}.json` 一致，僅附加 projectId 以區分
- **替代方案**：使用子資料夾 `projects/{projectId}/data.json` — 增加目錄層級，查詢需多一次 API 呼叫
- **替代方案**：單一檔案包含所有專案資料 — 檔案過大，同步衝突風險高

### 2. 直接使用 ensureFileInRoot 而非 ensureProjectFolder

- `readProjectData` / `writeProjectData` 改為呼叫新的 `ensureFileInRoot`（或直接使用 `FILE_NAMES` 風格的快取鍵）
- sessionStorage 快取鍵從 `proj_file_{projectId}_{dataType}` 改為 `root_file_{dataType}_{projectId}`
- `ensureProjectFolder` 仍保留，僅供檔案上傳分類使用

### 3. 資料遷移：啟動時一次性執行

- 在 `useDriveStorage.js` 中新增 `migrateProjectDataToRoot()` 函式
- 檢查根目錄是否已有 `ckes_tasks_{projectId}.json`，若無則從專案資料夾搬移
- 搬移完成後刪除專案資料夾內的舊 JSON 檔案
- 以 flag 檔案 `ckes_migration_done.flag` 標記遷移完成，避免重複執行

### 4. taskStore 不再需要 projectName

- `taskStore.load(projectId)` 內部不再需要呼叫 `getProjectNameAsync` 來查詢專案名稱
- `writeProjectData` 與 `readProjectData` 的 `projectName` 參數可移除或標記為可選

## Risks / Trade-offs

- **檔案名稱衝突**：若兩個專案有相同 ID 則不可能（ID 為 Date.now + random），風險極低
- **遷移期間資料不一致**：若遷移過程中應用程式關閉，部分專案資料可能已搬移而部分未搬移 → 遷移邏輯應在啟動時檢查並補搬，確保冪等性
- **專案刪除時需清理根目錄檔案**：`deleteProjectFolder` 需同時刪除根目錄的對應 JSON 檔案

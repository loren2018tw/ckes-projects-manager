## Why

目前各專案的任務資料 (`ckes_tasks.json`) 與檔案註冊表 (`ckes_file_registry.json`) 存放在個別專案資料夾內，導致：

- 批量操作（如全域搜尋任務、統計所有專案進度）需走訪每個專案資料夾，增加 API 請求次數
- 資料存取路徑不一致：全域資料（contacts, projects 等）在根目錄，專案資料在子資料夾
- 專案重新命名時需連帶更新資料檔案位置，增加複雜度

將這些資料統一移至應用程式根目錄，每個專案使用獨立 JSON 檔案，可簡化存取邏輯並提升效能。

## What Changes

- **將專案資料檔案從專案資料夾移到應用程式根目錄**
  - `ckes_tasks_{projectId}.json`：每個專案的任務資料
  - `ckes_file_registry_{projectId}.json`：每個專案的檔案註冊表
- 修改 `useDriveStorage.js` 中的 `readProjectData` / `writeProjectData`，使其直接從根目錄讀寫，不再查詢專案資料夾
- 修改 `taskStore.js` 中的 `load` / `save`，配合新的資料位置
- 專案資料夾保留用於檔案上傳分類（公文、附件、報表、其他）
- 提供資料遷移機制：首次啟動時將既有專案資料夾內的 JSON 檔案搬移至根目錄
- **BREAKING**: 現有專案的任務與檔案註冊表資料檔案位置改變，需一次性遷移

## Capabilities

### New Capabilities

- `project-data-root-storage`: 將專案級資料（tasks, file_registry）儲存在應用程式根目錄，每個專案使用獨立 JSON 檔案

### Modified Capabilities

<!-- No spec-level requirement changes - this is purely an implementation/internal architecture change -->

## Impact

- `src/composables/useDriveStorage.js`：修改 `readProjectData` / `writeProjectData` / `backgroundRefreshProjectData`，移除對 `ensureProjectFolder` 的依賴，改為直接操作根目錄檔案
- `src/stores/taskStore.js`：`load`/`save` 不再需要 `projectName` 參數
- `src/utils/syncManager.js`：若涉及專案資料同步，需更新同步邏輯
- 專案資料夾仍保留，僅移除其內的 JSON 資料檔案

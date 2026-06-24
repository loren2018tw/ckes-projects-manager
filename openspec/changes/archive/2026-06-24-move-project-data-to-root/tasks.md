## 1. 核心：修改 `useDriveStorage.js` 讀寫邏輯

- [x] 1.1 新增 `ensureProjectRootFile(projectId, dataType, token)` 輔助函式，在應用程式根目錄建立/查找 `ckes_{dataType}_{projectId}.json`，sessionStorage 快取鍵為 `root_file_{dataType}_{projectId}`
- [x] 1.2 修改 `readProjectData(projectId, projectName, dataType)`：移除對 `ensureProjectFolder` 的依賴，改為呼叫 `ensureProjectRootFile` 直接從根目錄讀取
- [x] 1.3 修改 `writeProjectData(projectId, projectName, dataType, data)`：同上，直接寫入根目錄檔案
- [x] 1.4 修改 `backgroundRefreshProjectData(projectId, projectName, dataType, cacheType)`：同上，從根目錄背景刷新
- [x] 1.5 更新 `deleteProjectFolder` 使其在刪除專案資料夾時，一併刪除根目錄的 `ckes_tasks_{projectId}.json` 與 `ckes_file_registry_{projectId}.json`
- [x] 1.6 更新 export 列表，匯出 `ensureProjectRootFile` 與 `migrateProjectDataToRoot`

## 2. 資料遷移機制

- [x] 2.1 在 `useDriveStorage.js` 中實作 `migrateProjectDataToRoot()` 非同步函式
- [x] 2.2 邏輯：讀取 `ckes_projects.json` 取得所有專案，對每個專案檢查根目錄是否已有 `ckes_tasks_{projectId}.json`，若無則從專案資料夾讀取舊 `ckes_tasks.json` 並寫入根目錄，完成後刪除舊檔案
- [x] 2.3 對 `ckes_file_registry.json` 執行相同搬遷邏輯
- [x] 2.4 遷移完成後在根目錄建立 `ckes_migration_done.flag` 標記檔案
- [x] 2.5 在 `readProjectData` 與 `writeProjectData` 第一次呼叫時觸發遷移（透過 `_ensureMigrationDone` 惰性檢查）
- [x] 2.6 確保遷移邏輯冪等：檢查目標檔案是否存在，已存在則跳過

## 3. 簡化 `taskStore.js`

- [x] 3.1 移除 `taskStore.js` 中 `load` 方法內對 `getProjectNameAsync` 的呼叫（`readProjectData` 不再需要 `projectName`）
- [x] 3.2 移除 `save` 方法內對 `getProjectNameAsync` 的呼叫
- [x] 3.3 `readProjectData` / `writeProjectData` 的 `projectName` 參數保留簽名但標記為 `_projectName` 忽略，taskStore 傳入 `null`
- [x] 3.4 清理 `getProjectNameAsync` 函式（已完全移除）

## 4. 更新 `projectStore.js` 刪除邏輯

- [x] 4.1 `projectStore.remove()` 呼叫 `deleteProjectFolder(id, project.name)`，該函式已內建根目錄檔案清理（由 Task 1.5 實作）
- [x] 4.2 `deleteProjectFolder` 使用 `projectId` 參數正確刪除根目錄 `ckes_tasks_{projectId}.json` 與 `ckes_file_registry_{projectId}.json`

## 5. 清理與驗證

- [x] 5.1 檢查 `syncManager.js` — 其僅處理 `FILE_NAMES` 中的全域資料（contacts, projects, projectStaff, purchaseRequests），無需變動
- [x] 5.2 檢查所有呼叫 `readProjectData` / `writeProjectData` 的位置（taskStore、getRegistry、saveRegistry、addToRegistry、removeFromRegistry、listRegistryFiles），參數一致且相容
- [x] 5.3 執行 `npm run lint` 無語法錯誤
- [x] 5.4 手動測試：建立測試專案、新增任務、上傳檔案、刪除專案，確認資料正確讀寫且位置正確

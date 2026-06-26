## Why

現有任務管理支援手動設定相依關係，但缺乏自動排程機制。使用者設定相依任務後，需手動調整日期，效率低且易出錯。當前置任務變更時，後續任務日期不會自動連動，導致排程失效。此變更引入自動排程引擎，根據相依關係自動計算任務日期，減少人工調整並避免排程衝突。

## What Changes

- **自動排程引擎**：新增 `scheduleEngine.js` composable，根據相依關係自動計算任務的開始日期與截止日期
- **相依排程規則實作**：針對 FS、SS、FF 三種相依模式，實作日期自動計算邏輯
- **連鎖更新**：當前置任務日期或狀態變更時，自動連鎖更新所有相依任務的日期
- **排程衝突提示**：在自動排程無法滿足相依條件時，向使用者顯示衝突說明
- **UI 日期調整提示**：在任務編輯對話框中，若日期被自動排程調整，顯示提示資訊

**不變項目**：

- 不修改任務資料結構（維持現有欄位：`startDate`、`deadline`、`completedDate`、`status`、`predecessorId`、`dependencyType`）
- 不改變 Google Drive 儲存格式
- 不改變看板/列表/甘特圖的既有功能

## Capabilities

### New Capabilities

- `task-automatic-scheduling`: 任務自動排程引擎，根據相依關係自動計算與調整任務日期，支援連鎖更新與衝突處理

### Modified Capabilities

- `project-task-management`: 新增自動排程相關場景（相依任務日期自動計算、連鎖更新、衝突提示）
- `task-assignment`: 無變更

## Impact

- `src/stores/taskStore.js`：新增自動排程方法（`scheduleTasks`、`updateSchedule`）
- `src/pages/project/TaskManagement.vue`：在新增/編輯任務儲存時觸發自動排程，顯示排程調整提示
- `src/composables/`：新增 `scheduleEngine.js` composable
- 影響範圍：任務 CRUD 流程（新增、編輯、狀態變更、前置任務變更）
- 不影響：聯絡人、專案、請購單、儲存層

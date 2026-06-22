## Why

目前點選專案僅能進入資源檔案頁面，缺少完整的專案管理界面。需要一個專屬的專案管理頁面，整合資源管理與任務管理功能，讓使用者能在同一個頁面掌握專案全貌。

## What Changes

- 專案列表點選專案名稱後，進入該專案的專屬管理界面
- 左側選單進入專案管理後僅保留「首頁」，其餘替換為專案管理專屬功能
- 專案頁面頂部顯示「{{專案名稱}}」，並在同一個頁面整合儀表板展示所有功能資訊
- 新增**專案資源管理**（取代現有 `/projects/:projectId/resources` 頁面）—可上傳公文、公文附件、報表等資料，並支援資料夾分類
- 新增**任務管理**子功能：
  - 新增任務（任務名稱、截止日期、完成日期、相依任務、相依模式）
  - 相依模式：完成-開始、開始-開始、完成-完成
  - 完成日期不為空白視為任務已完成
  - 任務清單依相依模式排列，無相依模式則依截止日期排列
- 現有的 `/projects/:projectId/resources` 路由將被整合至專案管理界面中

## Capabilities

### New Capabilities

- `project-dashboard`: 專案儀表板，整合顯示專案內所有功能的摘要資訊
- `project-task-management`: 任務管理功能，包含任務 CRUD 與相依性管理

### Modified Capabilities

- `project-resource`: 現有資源管理功能將從獨立頁面改為整合至專案管理界面，並增加資料夾分類

## Impact

- **路由**: 新增 `/projects/:projectId` 作為專案管理入口，現有 `/projects/:projectId/resources` 整合至此
- **Layout**: 左側選單需支援動態切換（全域功能 vs 專案專屬功能）
- **Store**: 新增 `taskStore` 管理任務資料，專案資源功能整合至 `projectStore` 或獨立 store
- **頁面**: 新增 `ProjectPage.vue`（專案管理主頁面，含儀表板）、`TaskManagement.vue`（任務管理）

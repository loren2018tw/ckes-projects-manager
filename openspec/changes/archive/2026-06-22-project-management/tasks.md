## 1. 路由與 Layout 基礎建設

- [x] 1.1 修改 `MainLayout.vue` — 增加專案模式偵測，進入專案時 drawer 切換為專案專屬選單（首頁、儀表板、資源管理、任務管理），header 顯示專案名稱
- [x] 1.2 修改 `src/router/routes.js` — 新增巢狀路由 `/projects/:projectId/`，子路由：`""`（預設儀表板）、`resources`、`tasks`
- [x] 1.3 修改 `MainLayout.vue` — 左側選單在專案模式僅保留首頁，其餘替換為專案專屬功能

## 2. 專案儀表板

- [x] 2.1 新增 `src/pages/project/DashboardPage.vue` — 顯示專案名稱、資源統計（各分類檔案數量）、任務統計（總數、已完成、未完成、即將到期），逾期紅色、7天內橘色
- [x] 2.2 儀表板快捷操作按鈕（上傳檔案、新增任務），點選後導航至對應功能

## 3. 專案資源管理

- [x] 3.1 修改 `ProjectResources.vue` — 支援資料夾分類選擇（公文、附件、報表、其他），使用上傳對話框選擇分類
- [x] 3.2 上傳檔案時可指定分類資料夾，上傳至 Google Drive 對應子資料夾（`uploadProjectFileToCategory`）
- [x] 3.3 檔案列表顯示分類欄位（`_category`），支援依分類篩選
- [x] 3.4 新增 `listProjectFilesByCategory` 方法，遞迴讀取各分類子資料夾及根目錄檔案

## 4. 任務資料層

- [x] 4.1 新增 `src/stores/taskStore.js` — Pinia store，使用 Google Drive JSON 檔案儲存任務（金鑰：`ckes_tasks_{projectId}`）
- [x] 4.2 實作 CRUD 方法：`load(projectId)`、`add(projectId, task)`、`update(projectId, taskId, fields)`、`remove(projectId, taskId)`
- [x] 4.3 實作相依任務循環偵測（DFS 檢查）

## 5. 任務管理頁面

- [x] 5.1 新增 `src/pages/project/TaskManagement.vue` — 任務列表頁，顯示任務表格（狀態圖示、名稱、截止日期、完成日期、相依任務、操作）
- [x] 5.2 任務新增/編輯對話框（名稱、截止日期、完成日期、相依任務選擇、相依模式選擇）
- [x] 5.3 相依模式選擇：完成-開始（FS）、開始-開始（SS）、完成-完成（FF）
- [x] 5.4 任務列表排序 — 有相依者以 topological order 排列，無相依者依截止日期遞增
- [x] 5.5 完成日期不為空白時顯示打勾圖示 + 刪除線名稱；已逾期紅色、7天內橘色

## 6. 專案列表整合

- [x] 6.1 修改 `ProjectList.vue` — 專案名稱改為可點選連結（`<router-link>`），導航至 `/projects/:projectId`

## 7. 驗證與清理

- [x] 7.1 路由維持 `/projects/:projectId/...` 保持一致，無需重新導向
- [x] 7.2 執行 lint 檢查（通過）
- [x] 7.3 手動測試完整流程：新增專案 → 進入管理頁面 → 上傳資源 → 新增任務 → 設定相依

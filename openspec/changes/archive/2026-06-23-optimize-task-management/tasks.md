## 1. 任務資料模型擴充

- [x] 1.1 在 `taskStore.js` 的 `add` 方法中，新任務預設加入 `startDate: null`、`status: 'not_started'`、`description: ''`、`assignee: null` 欄位
- [x] 1.2 在 `taskStore.js` 新增 `migrateLegacyTask(task)` 函數，為既有無狀態任務推斷：`completedDate` 不為空 → `status: 'completed'`，否則 → `status: 'not_started'`；`startDate` 預設為 `deadline` 前 7 天
- [x] 1.3 在 `taskStore.js` 的 `load` 方法中載入任務後，對每筆任務執行 `migrateLegacyTask` 確保向後相容
- [x] 1.4 在 `taskStore.js` 新增 `validateTask(task)` 函數，檢查衝突規則：前置任務未完成時不可設為 `completed`、開始日期不可晚於截止日期
- [x] 1.5 在 `taskStore.js` 新增 `isBlocked(task)` 函數，檢查任務是否有未完成的前置任務（供看板動態計算使用）
- [x] 1.6 在 `taskStore.js` 新增 `getBlockedTasks()`、`getTasksByStatus(status)` 計算屬性

## 2. 任務表單擴充（新增/編輯對話框）

- [x] 2.1 在 `TaskManagement.vue` 表單中加入「開始日期」`q-input type="date"` 欄位
- [x] 2.2 在表單中加入「狀態」`q-select` 欄位，選項：未開始、進行中、已完成
- [x] 2.3 在表單中加入「任務描述」`q-input type="textarea"` 欄位
- [x] 2.4 在表單中加入「負責人」`q-select` 欄位，選項來自 `projectStaffStore.byProject(projectId)`，顯示工作人員姓名及已指派任務數
- [x] 2.5 修改 `openAddDialog` / `openEditDialog` / `resetForm` 以包含新欄位
- [x] 2.6 修改 `saveTask` 以在儲存前呼叫 `validateTask`，衝突時顯示 `q-notify` 提示並中止儲存
- [x] 2.7 修改 `saveTask` 邏輯：狀態設為 `completed` 時自動填入 `completedDate`（當天）；設為 `not_started` 時清除 `completedDate`

## 3. 看板視圖實作

- [x] 3.1 在 `TaskManagement.vue` 的 `<template>` 中，在表格上方新增「看板/列表」切換按鈕組（`q-btn-toggle`）
- [x] 3.2 實作看板四欄佈局：使用 flexbox 水平排列「被阻擋、未開始、進行中、已完成」四個欄位
- [x] 3.3 每個任務以卡片樣式顯示，包含任務名稱、負責人頭像縮寫、截止日期，點擊開啟編輯對話框
- [x] 3.4 卡片依狀態套用左側邊框顏色：被阻擋=紅色+鎖頭圖示、未開始=灰色、進行中=藍色、已完成=綠色+打勾圖示
- [x] 3.5 實作 HTML5 Drag & Drop：任務卡片設定 `draggable="true"`，各欄位監聽 `dragover`/`drop` 事件
- [x] 3.6 拖曳至被阻擋欄時拒絕並顯示提示「被阻擋狀態為自動判定，無法手動設定」
- [x] 3.7 拖曳至其他欄位時觸發狀態更新（呼叫 `taskStore.update`）
- [x] 3.8 空欄顯示淺色提示文字（如「尚無進行中的任務」）
- [x] 3.9 使用 `isBlocked` 動態計算任務是否歸入被阻擋欄（非實際儲存狀態）

## 4. 甘特圖更新

- [x] 4.1 修改 `_ganttStartX` 使用 `task.startDate` 取代舊有「截止日期前推 7 天」邏輯
- [x] 4.2 修改 `ganttBar` 函數：`startDate` 存在時使用其實際值，不存在時才回退為截止日期前推
- [x] 4.3 修改甘特圖任務橫條顏色判斷使用 `task.status` 取代 `task.completedDate` 推斷
- [x] 4.4 `_ganttMin`/`_ganttMax` 計算納入 `task.startDate` 欄位

## 5. 專案儀表板同步更新

- [x] 5.1 檢視 `DashboardPage.vue` 中引用任務狀態的部分，確保與新 `status` 欄位相容
- [x] 5.2 更新儀表板任務統計邏輯，使用 `status` 取代 `completedDate` 判斷

## 6. 相依性與被阻擋邏輯

- [x] 6.1 在 `taskStore.js` 新增 `getDependencyChain(taskId)` 函數，遞迴收集所有層級的前置任務
- [x] 6.2 `hasCycle` 已使用 DFS + visited set 防護，動態計算被阻擋時沿用相同機制
- [x] 6.3 `isBlocked` 為動態計算，前置任務完成後看板自動重新渲染，無需額外解除邏輯

## 7. 既有功能相容性確保

- [x] 7.1 確認 `sortedTasks` 排序邏輯仍正常運作於新的 status 欄位
- [x] 7.2 確認 `columns` 表格定義已新增「開始日期」欄位，status 圖示改用 `task.status` 判斷
- [x] 7.3 確認刪除任務邏輯不受新欄位影響
- [x] 7.4 端到端測試：新增任務（含所有新欄位）→ 看板顯示 → 拖曳變更狀態 → 編輯 → 刪除

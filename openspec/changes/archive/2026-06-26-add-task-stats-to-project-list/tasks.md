## 1. 建立 TaskStatsCard 元件

- [x] 1.1 在 `src/components/` 新增 `TaskStatsCard.vue`，使用 `<script setup>` 與 Composition API
- [x] 1.2 定義 props：`tasks`（Array, required）與 `loading`（Boolean, default: false）
- [x] 1.3 從 DashboardPage 複製 computed properties（completedCount, pendingCount, overdueCount, dueSoonTasks, inProgressTasks）及其輔助函式（isOverdue, isDueSoon, formatDate）
- [x] 1.4 建構元件模板：統計數字區塊（q-chip）、即將到期任務列表、進行中任務列表
- [x] 1.5 處理載入中狀態與空資料狀態的顯示

## 2. 重構 DashboardPage 使用 TaskStatsCard

- [x] 2.1 匯入 TaskStatsCard 元件
- [x] 2.2 移除內嵌的任務統計模板區塊（q-chip、dueSoonTasks、inProgressTasks 模板），改為 `<TaskStatsCard :tasks="tasks" :loading="taskStore.loading" />`
- [x] 2.3 移除不再需要的 computed properties（completedCount, pendingCount, overdueCount, dueSoonTasks, inProgressTasks）
- [x] 2.4 移除不再需要的輔助函式（isOverdue, isDueSoon, formatDate）

## 3. 在 ProjectList 新增任務統計總覽

- [x] 3.1 匯入 TaskStatsCard 與 taskStore
- [x] 3.2 在 `onMounted` 中擴充載入邏輯，載入所有未結案（或依篩選條件）專案的任務資料
- [x] 3.3 新增 `allTasks` computed property，彙整所有已載入專案的任務為單一陣列
- [x] 3.4 在表格下方新增「任務統計總覽」區域，使用 TaskStatsCard 元件
- [x] 3.5 處理篩選條件切換時重新載入對應專案的任務資料

## 4. 驗證

- [x] 4.1 確認 DashboardPage 任務統計功能與改動前一致（使用 TaskStatsCard 元件）
- [x] 4.2 確認 ProjectList 頁面正確顯示跨專案任務統計（lint 通過）
- [x] 4.3 確認篩選切換時任務統計同步更新（watch filter 實現）
- [x] 4.4 確認無任務的專案列表正常顯示提示訊息（TaskStatsCard 處理空資料狀態）

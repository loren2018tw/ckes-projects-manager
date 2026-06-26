## Why

專案管理頁面目前僅顯示專案清單表格，管理者無法快速掌握所有未結案專案的任務整體狀況。需要前往各專案儀表板才能查看任務統計，缺乏全局視野。

## What Changes

- 在專案管理頁面（ProjectList）下方新增「任務統計總覽」區塊，顯示所有未結案專案的任務統計資料
- 將 DashboardPage 中的「任務統計」區塊抽離為可重用的 Vue 元件 `TaskStatsCard`
- ProjectList 頁面使用 `TaskStatsCard` 元件顯示跨專案的任務統計總覽
- DashboardPage 改為使用 `TaskStatsCard` 元件取代內嵌的任務統計程式碼

## Capabilities

### New Capabilities

- `task-stats-card`: 可重用的任務統計卡片元件，接收 tasks 陣列作為 prop，顯示與 DashboardPage 相同的統計內容（已完成、未完成、已逾期、即將到期、進行中的任務）

### Modified Capabilities

- `project-dashboard`: 儀表板頁面的任務統計區塊改為使用新建立的 TaskStatsCard 元件
- `project-management`: 專案管理頁面新增任務統計總覽區塊，使用 TaskStatsCard 元件

## Impact

- 新增 `src/components/TaskStatsCard.vue` 元件
- 修改 `src/pages/project/DashboardPage.vue`：移除內嵌的任務統計 HTML/computed，改為引用 TaskStatsCard
- 修改 `src/pages/ProjectList.vue`：在表格下方新增任務統計區塊，需載入所有未結案專案的任務資料
- 可能需要新增一個 global task store 或擴展現有 taskStore 支援同時載入多個專案的任務

## Context

目前任務統計邏輯直接內嵌在 DashboardPage.vue 中（computed properties + 模板），ProjectList.vue 僅顯示專案清單表格。taskStore 一次僅支援載入單一專案的任務。要實現跨專案任務統計，需解決多專案任務資料的載入問題。

## Goals / Non-Goals

**Goals:**

- 建立可重用的 `TaskStatsCard` Vue 元件，接受 tasks 陣列 prop，顯示與 DashboardPage 一致的統計內容
- DashboardPage 改為使用 `TaskStatsCard` 取代內嵌程式碼
- ProjectList 頁面在表格下方新增任務統計區塊，統計所有未結案專案的任務

**Non-Goals:**

- 不修改任務的資料模型（Task 欄位不變）
- 不修改 taskStore 的核心 API 行為
- 不修改專案的 CRUD 行為

## Decisions

### 1. 多專案任務載入策略：擴展現有 taskStore 或獨立載入

**選擇：** 在 ProjectList 中以迴圈方式獨立載入每個未結案專案的任務，不使用新的 store

**理由：**

- taskStore 的 `tasks` 是單一 `ref([])`，非以專案 ID 索引的結構。改用 Map 會造成 API 行為不一致
- 在 ProjectList 中平行載入任務（`Promise.all`），轉換為陣列後傳入 TaskStatsCard，結構簡單
- 選項：若要更正式的管理方法，可在 ProjectList 引入 `MultiProjectTaskLoader` composable 管理多專案載入狀態

### 2. TaskStatsCard 的事件與互動

**選擇：** 元件僅接收 `tasks` 與 `loading` 兩個 props，不發出事件

**理由：** 與 DashboardPage 現有行為一致（純展示），降低耦合。若未來需要互動（如點選任務導航），另行擴充

### 3. 無任務篩選下拉的專案統計行為

**選擇：** 任務統計區塊顯示時依據 ProjectList 頁面的當前篩選（projectStore.filter）

**理由：** 使用者若在 project-list 切換為「所有專案」，任務統計也應涵蓋結案專案的任務，而非僅統計進行中專案

## Risks / Trade-offs

- **載入效能**：若未結案專案數量過多（>30），平行載入任務可能造成延遲。未來可增加批次載入或載入中狀態提示
- **TaskStatsCard 與 DashboardPage 的一致性**：DashboardPage 原樣使用 TaskStatsCard，確保統計邏輯一致；TaskStatsCard 不包含「新增任務」按鈕（該按鈕僅在 DashboardPage 中有意義）

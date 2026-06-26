# task-stats-card Specification

## Purpose

可重用的任務統計卡片元件，顯示與 DashboardPage 一致的任務統計內容，可在專案儀表板與專案管理列表頁面中使用。

## Requirements

### Requirement: 任務統計卡片元件

系統提供一個名為 `TaskStatsCard` 的 Vue 元件，接收 tasks 陣列與 loading 狀態，顯示任務統計摘要。

#### Scenario: 載入中顯示提示

- **WHEN** `loading` prop 為 true
- **THEN** 元件顯示「載入中…」文字，不顯示統計數據

#### Scenario: 顯示任務統計摘要

- **WHEN** `loading` 為 false 且 tasks 陣列有資料
- **THEN** 元件以 q-chip 顯示下列統計數字：
  - 已完成數量（check_circle 圖示，綠色）
  - 未完成數量（pending 圖示，黃色）
  - 已逾期數量（error 圖示，紅色，指 deadline 已過且未完成的任務）

#### Scenario: 顯示即將到期任務列表

- **WHEN** 有 deadline 在 7 天內且未完成的任務
- **THEN** 元件在統計數字下方顯示「即將到期」區塊，列出這些任務的名稱與截止日期（橘色背景）

#### Scenario: 暫無即將到期任務

- **WHEN** 沒有 deadline 在 7 天內的未完成任務
- **THEN** 元件顯示「暫無即將到期的任務」提示文字

#### Scenario: 顯示進行中任務列表

- **WHEN** 有非完成、非逾期、非被阻擋、非即將到期的任務
- **THEN** 元件在「即將到期」區塊下方顯示「進行中的任務」區塊，列出任務名稱與截止日期

#### Scenario: 無進行中任務

- **WHEN** 沒有上述條件的進行中任務，也沒有即將到期任務
- **THEN** 元件顯示「暫無進行中的任務」提示文字

#### Scenario: 無任何任務

- **WHEN** tasks 為空陣列
- **THEN** 元件顯示適當提示（無任務）

### Requirement: 元件 Props

元件應透過 props 接收資料，不接受 slots 或其他自訂內容。

#### Scenario: 接受 tasks 與 loading prop

- **WHEN** 使用 `TaskStatsCard` 元件
- **THEN** 元件接受以下 props：
  - `tasks`（Array, required）：任務物件陣列
  - `loading`（Boolean, default: false）：是否正在載入

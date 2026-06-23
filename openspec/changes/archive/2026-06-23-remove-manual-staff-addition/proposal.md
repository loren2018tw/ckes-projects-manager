## Why

目前專案的工作人員需由管理者手動從聯絡人清單中一一加入，此流程與「任務指派負責人」的操作產生重複：管理者加入某人為工作人員後，又在任務中將該人指派為負責人。若能讓系統自動彙整實際參與任務的人員，即可消除此重複勞動，簡化專案管理流程。

## What Changes

- **移除專案編輯頁面的工作人員管理區塊**：刪除「加入工作人員」按鈕、工作人員清單及「移除」功能。
- **任務負責人改為從系統聯絡人清單選取**：不再限定於專案工作人員，改為全域聯絡人清單。
- **專案儀表板新增自動彙整的工作人員區塊**：系統自動收集該專案所有任務的負責人，去重後顯示為工作人員清單。
- **移除 `projectStaffStore`**：不再需要專案與聯絡人的關聯表，相關資料將不再使用。

## Capabilities

### New Capabilities

- `project-workers-auto`: 專案工作人員自動彙整功能 — 從任務負責人自動收集、去重並顯示於儀表板

### Modified Capabilities

- `project-staff`: 移除此能力（不再需要手動管理工作人員），原有規格將被取代
- `task-assignment`: 負責人選取來源從「專案工作人員」改為「系統聯絡人清單」
- `project-dashboard`: 新增「工作人員」區塊，顯示自動彙整的專案參與人員

## Impact

- **移除檔案**：`src/stores/projectStaffStore.js`（不再需要）
- **修改元件**：
  - `src/components/ProjectForm.vue`：移除工作人員管理區塊
  - `src/pages/project/TaskManagement.vue`：負責人選取來源改為 `contactStore`
  - `src/pages/project/DashboardPage.vue`：新增工作人員顯示區塊
- **資料結構變更**：任務的 `assignee` 欄位將從 `staff.id` 改為 `contact.id`（直接引用聯絡人 ID）
- **舊資料遷移**：需要將現有任務的 `assignee`（staff id）轉換為對應的 `contactId`

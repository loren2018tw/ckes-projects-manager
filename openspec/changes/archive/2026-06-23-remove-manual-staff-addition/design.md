## Context

目前專案工作人員需透過 `projectStaffStore` 手動管理（新增/移除），任務負責人選取時僅顯示該專案的工作人員。此流程與任務指派功能產生重複：管理者先加入工作人員，再指派任務負責人。本設計將消除此重複，改為從全域聯絡人清單直接選取任務負責人，並由系統自動彙整工作人員名單。

### 現行架構

- `projectStaffStore` 維護 `{ id, projectId, contactId, addedAt }` 關聯資料，存於 `ckes_project_staff.json`
- 任務的 `assignee` 欄位儲存為 `staff.id`（即 `projectStaffStore` 的 entry id）
- 姓名解析鏈：`staff.id` → `projectStaffStore` → `contactId` → `contactStore` → 姓名

### 目標架構

- 移除 `projectStaffStore` 及 `ckes_project_staff.json`
- 任務的 `assignee` 欄位改為直接儲存 `contact.id`
- 姓名解析鏈：`contact.id` → `contactStore` → 姓名
- 儀表板自動收集任務負責人，去重後展示

## Goals / Non-Goals

**Goals:**

- 移除專案編輯頁面的手動工作人員管理區塊
- 任務負責人選取來源改為全域聯絡人清單
- 專案儀表板新增自動彙整的工作人員區塊
- 刪除 `projectStaffStore` 相關程式碼與資料檔案
- 提供舊任務資料的遷移機制

**Non-Goals:**

- 不改變任務的其他欄位結構（如 `status`、`predecessorId` 等）
- 不變更聯絡人管理功能
- 不改變專案本身的管理流程（CRUD）

## Decisions

### 1. 任務 assignee 欄位直接使用 contactId

- **決定**：將 `task.assignee` 從 `staff.id` 改為直接儲存 `contact.id`
- **理由**：移除 `projectStaffStore` 後，不再有 staff id 作為中介層。直接引用 contact id 簡化了資料模型，減少一次查詢跳轉
- **替代方案考量**：保留 `assignee` 欄位名稱但改變語意（從 staff id → contact id），避免新增欄位造成更大幅度的遷移

### 2. 儀表板工作人員區塊使用 computed 而非獨立 store

- **決定**：在 `DashboardPage.vue` 中透過 `taskStore.tasks` 與 `contactStore` 以 computed 動態計算工作人員清單
- **理由**：不需額外建立 store 或 API 資料，資料完全來自既有 stores
- **替代方案考量**：建立新的 Pinia store 來緩存 — 但工作人員資料本質上就是任務負責人的彙整，動態計算即可，無需持久化

### 3. 舊資料遷移在首次載入時執行

- **決定**：在 `taskStore.load()` 中偵測舊格式（`assignee` 為字串且不是有效的 contact id），透過 `projectStaffStore`（若尚未刪除）比對轉換為 contact id
- **理由**：避免使用者需手動執行遷移。一次性遷移後，後續儲存的資料即為新格式
- **替代方案考量**：獨立遷移工具 — 但 Google Drive 為單一使用者存取，無多人併發問題，在載入時就地遷移更簡單

### 4. 移除 projectStaffStore 後清理 Drive 資料

- **決定**：在完成舊任務資料遷移後，刪除 `ckes_project_staff.json` 檔案
- **理由**：避免孤兒資料佔用 Google Drive 空間。資料已無用途且不影響其他功能
- **替代方案考量**：保留檔案不刪除 — 但會造成混淆，且 Google Drive 儲存空間應善加利用

## Risks / Trade-offs

- **舊資料遺失** → 遷移邏輯需先完整讀取 `projectStaffStore` 後再執行轉換，避免 staff id 無法對應到 contact id。若某 staff entry 的 `contactId` 已被刪除，應將該任務的 `assignee` 設為 `null`
- **聯絡人刪除後任務負責人失效** → 屬正常行為。若某聯絡人被刪除，其相關任務的 `assignee` 應保留 `contact.id`（just reference），顯示時以「已刪除聯絡人」標記
- **效能影響** → 儀表板的工作人員計算需掃描所有任務並去重，對於小型專案（< 100 任務）無顯著影響。若未來任務量增長可考慮加入計算緩存

## Migration Plan

1. **更新 `taskStore.load()`**：讀取 tasks 後，若 `assignee` 為舊格式（存在於 `projectStaffStore.byProject()` 的 id 集合中），自動轉換為 `contact.id`
2. **儲存遷移後資料**：呼叫 `taskStore.save()` 時寫入新格式
3. **刪除 `projectStaffStore`**：確認所有任務資料遷移完成後，移除 store 及對應的 Drive 資料檔案

## Open Questions

無

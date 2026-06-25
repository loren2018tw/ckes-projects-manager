## Context

目前專案資料儲存在 Google Drive 中，每個專案為一個資料夾，內含任務資料（JSON）與資源檔案（各分類資料夾）。專案列表透過讀取 Drive 根目錄下的專案資料夾來呈現。無現成的複製功能，使用者需手動重建專案。

## Goals / Non-Goals

**Goals:**

- 專案列表右側新增複製按鈕
- 點擊後彈出對話框，輸入新專案名稱並可選擇是否複製資源檔
- 複製後的新專案包含所有任務，任務間相依關係完整保留
- 複製時清空任務的開始日期、截止日期、負責人
- 可選擇性複製資源檔案

**Non-Goals:**

- 不支援複製專案的工作人員關聯
- 不支援部分選擇性複製任務（全部複製）
- 不支援跨使用者複製專案

## Decisions

### Decision 1: 複製邏輯放在前端 (Client-side clone orchestration)

考量到所有資料操作皆透過 Google Drive API 進行，沒有獨立後端伺服器，複製邏輯由前端 Quasar 應用程式直接執行。前端依序：

1. 讀取原始專案資料夾結構
2. 在 Drive 根目錄下建立新專案資料夾
3. 複製任務資料並清空指定欄位
4. 如勾選複製資源檔，則複製各分類資料夾中的檔案

### Decision 2: 任務複製使用 deep clone + 清理

任務資料以 JSON 格式儲存，包含 tasks 陣列。複製時直接深拷貝（JSON parse/stringify），然後遍歷每個任務，清除 startDate、dueDate、assignee 欄位。相依關係（dependencies）欄位保留不變，因相依是基於任務 ID，複製後會重新產生新的任務 ID 並對應更新相依 ID。

### Decision 3: 新任務 ID 對映表 (ID Mapping)

原始任務的 ID 在新專案中需重新產生（避免與原始專案衝突）。複製時建立一個 ID 對映表 `{ oldId: newId }`，在複製每個任務後記錄對應關係。最後遍歷所有任務的 dependencies，將其中的舊 ID 置換為新 ID。

### Decision 4: 資源複製使用 Google Drive API copy

資源檔案位於專案資料夾下的分類子資料夾（公文、附件、報表、其他）。複製時先建立相同結構的分類資料夾，再逐個呼叫 Drive API 的 files.copy 將檔案複製到對應的新分類資料夾。

### Decision 5: 對話框元件使用 Quasar QDialog

使用 Quasar 的 QDialog 元件搭配 QInput（新專案名稱）與 QCheckbox（是否複製資源檔），提供驗證邏輯（名稱不可為空白、不可與現有專案名稱重複）。

## Risks / Trade-offs

- [Risk] Google Drive API 複製大量檔案可能達到配額限制 → 加入批次處理與速率限制，並顯示進度條
- [Risk] 任務相依 ID 對映錯誤導致新專案任務關係錯亂 → 單元測試覆蓋 ID 對映邏輯，手動驗證複製後相依關係
- [Risk] 大專案複製時間過長使用者無回饋 → 顯示載入狀態與進度指示器
- [Trade-off] 選擇將複製邏輯放在前端而非後端 → 無需後端伺服器，但依賴使用者端網路與 Drive API 配額

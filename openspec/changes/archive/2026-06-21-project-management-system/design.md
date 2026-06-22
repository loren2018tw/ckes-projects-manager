## Context

本系統為純前端 SPA，使用 Quasar（Vue 3）框架，透過 Google OAuth 進行使用者認證。所有資料以 JSON 檔案格式儲存在登入使用者 Google Drive 的應用程式專屬資料夾（`appDataFolder`）中，不依賴自有後端伺服器。

## Goals / Non-Goals

**Goals:**

- 提供完整的專案 CRUD 操作及狀態管理
- 建立系統通用聯絡人通訊錄
- 實現專案工作人員關聯管理
- 所有資料透過 Google Drive API 持久化
- 直覺的 Quasar UI 操作體驗

**Non-Goals:**

- 不支援多使用者協作（資料僅儲存在當前登入者的 Google Drive）
- 不即時同步（手動重新整理才會更新資料）
- 不提供角色權限管理（所有操作等同擁有者）
- 不實作經費核銷細節（僅保留擴充接口）

## Decisions

### 資料儲存：Google Drive AppDataFolder

- 使用 `files.create` 與 `files.update` 操作 Google Drive API
- 每個資料類型（專案、聯絡人）以獨立 JSON 檔案儲存，方便除錯與備份
- 檔案名稱固定：`ckes_projects.json`、`ckes_contacts.json`、`ckes_project_staff.json`
- 所有資料在記憶體中讀取後以 Pinia store 管理狀態

### 路由設計

| 路徑                 | 頁面       | 說明                           |
| -------------------- | ---------- | ------------------------------ |
| `/`                  | 首頁       | CKES 品牌標題與標語            |
| `/projects`          | 專案列表   | 預設顯示進行中專案，可切換篩選 |
| `/projects/add`      | 新增專案   | 表單頁面                       |
| `/projects/:id`      | 編輯專案   | 含專案基本資訊與工作人員管理   |
| `/contacts`          | 聯絡人列表 | 系統通用聯絡人管理             |
| `/contacts/add`      | 新增聯絡人 | 表單頁面                       |
| `/contacts/:id/edit` | 編輯聯絡人 | 表單頁面                       |

### 資料模型

**專案 (Project)**

```json
{
  "id": "uuid",
  "name": "string",
  "status": "active | closed",
  "createdAt": "ISO 8601",
  "updatedAt": "ISO 8601"
}
```

**聯絡人 (Contact)**

```json
{
  "id": "uuid",
  "name": "string",
  "email": "string",
  "phone": "string",
  "createdAt": "ISO 8601",
  "updatedAt": "ISO 8601"
}
```

**專案工作人員 (ProjectStaff)**

```json
{
  "id": "uuid",
  "projectId": "uuid",
  "contactId": "uuid",
  "addedAt": "ISO 8601"
}
```

### Google Drive API 整合層

建立 `src/composables/useDriveStorage.js`，負責：

- 初始化 Google Drive API（使用 `gapi.client.drive`）
- `readFile(fileName)`：讀取指定 JSON 檔案
- `writeFile(fileName, data)`：寫入或更新指定 JSON 檔案
- 所有操作方法回傳 Promise，元件層使用 async/await

### 狀態管理

使用 Pinia store：

- `useProjectStore`：專案資料 CRUD 及篩選邏輯
- `useContactStore`：聯絡人資料 CRUD
- `useProjectStaffStore`：專案與成員關聯管理

## Risks / Trade-offs

- **Google Drive API 配額限制** → 檔案操作加上節流（debounce），避免短時間大量寫入
- **離線無法使用** → 設計初期不處理離線快取，後續可加入 localStorage 作為讀取快取
- **檔案衝突** → 單一使用者情境下無並寫衝突問題，暫不處理衝突合併
- **Google Drive API 需額外授權範圍** → 需在 OAuth 同意畫面加入 `https://www.googleapis.com/auth/drive.appdata` 範圍

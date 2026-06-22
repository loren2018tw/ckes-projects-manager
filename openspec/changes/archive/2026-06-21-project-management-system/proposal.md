## Why

學校行政單位經常收到公文後啟動各類專案，目前缺乏一套系統化管理工具，導致專案進度追蹤、經費運用、成員聯繫與核銷作業分散各處，效率低落。本系統旨在提供一個以 Google Drive 為儲存後端、輕量化的專案管理平台，讓行政人員能集中管理專案生命週期。

## What Changes

- 新增專案管理功能：建立、編輯、結案、刪除專案，並支援狀態篩選
- 新增系統通用聯絡人管理功能，支援姓名、電子郵件、電話
- 專案編輯畫面可從聯絡人清單中選取工作人員
- 首頁呈現系統品牌標題與標語
- 所有資料儲存在登入使用者的 Google Drive 雲端硬碟（使用 Google Drive API）
- 採用 Quasar（Vue 3）前端框架實作

## Capabilities

### New Capabilities

- `project-management`: 專案 CRUD，包含名稱設定、結案狀態切換、列表篩選（進行中／全部）
- `contact-management`: 系統通用聯絡人管理，含姓名、電子郵件、電話
- `project-staff`: 專案工作人員管理，從聯絡人清單中選取成員加入特定專案
- `homepage`: 首頁顯示 CKES 品牌標題與標語

### Modified Capabilities

<!-- 無既有規格需修改 -->

## Impact

- **前端框架**：使用 Quasar（Vue 3）開發 SPA
- **認證方式**：依賴既有的 Google OAuth 登入機制
- **資料儲存**：新增 Google Drive API 整合，所有資料以 JSON 格式儲存在使用者雲端硬碟的應用程式資料夾
- **無後端伺服器**：純前端架構，不依賴自有後端

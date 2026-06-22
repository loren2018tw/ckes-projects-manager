## 1. Google Drive API 整合層

- [x] 1.1 在 `quasar.config.js` 中啟用 Pinia 狀態管理
- [x] 1.2 建立 `src/composables/useDriveStorage.js`，實作 `readFile` 與 `writeFile` 方法
- [x] 1.3 在 Google OAuth 授權範圍中加入 `https://www.googleapis.com/auth/drive.appdata`
- [x] 1.4 更新 `index.html` 中的 CSP 設定，允許 Google Drive API 連線

## 2. 首頁（Homepage）

- [x] 2.1 建立 `src/pages/HomePage.vue`，顯示「CKES 專案管理系統」標題與標語
- [x] 2.2 在 router 中將 `/` 路由對應至 `HomePage`
- [x] 2.3 登入狀態下顯示快捷按鈕（專案列表、聯絡人管理）

## 3. 聯絡人管理

- [x] 3.1 建立 Pinia store `src/stores/contactStore.js`
- [x] 3.2 建立 `src/pages/ContactList.vue`，顯示聯絡人列表（表格形式）
- [x] 3.3 建立 `src/pages/ContactForm.vue`，支援新增與編輯聯絡人
- [x] 3.4 在 router 中加入 `/contacts`、`/contacts/add`、`/contacts/:id/edit` 路由
- [x] 3.5 實作聯絡人 CRUD 操作（讀寫 Google Drive）

## 4. 專案管理

- [x] 4.1 建立 Pinia store `src/stores/projectStore.js`
- [x] 4.2 建立 `src/pages/ProjectList.vue`，預設顯示進行中專案，含篩選切換
- [x] 4.3 建立 `src/pages/ProjectForm.vue`，支援新增與編輯專案
- [x] 4.4 在 router 中加入 `/projects`、`/projects/add`、`/projects/:id` 路由
- [x] 4.5 實作專案新增、編輯名稱、結案、刪除操作

## 5. 專案工作人員管理

- [x] 5.1 建立 Pinia store `src/stores/projectStaffStore.js`
- [x] 5.2 在專案編輯頁面中加入「工作人員」區塊，顯示已加入成員
- [x] 5.3 實作從聯絡人清單選取並加入工作人員的功能
- [x] 5.4 實作移除工作人員的功能

## 6. 導航與整合

- [x] 6.1 更新 `MainLayout.vue` 側邊欄選單，加入首頁、專案列表、聯絡人管理連結
- [x] 6.2 確認所有頁面在登入/未登入狀態下的導航行為正確

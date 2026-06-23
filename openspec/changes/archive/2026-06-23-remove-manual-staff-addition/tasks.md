## 1. 舊任務資料遷移（taskStore）

- [x] 1.1 在 `taskStore.load()` 中新增舊格式偵測：檢查 `assignee` 是否為 `projectStaffStore.byProject()` 中的 id
- [x] 1.2 實作遷移邏輯：將舊 `assignee`（staff id）透過 `projectStaffStore` 轉換為 `contact.id`
- [x] 1.3 若 `contactId` 已被刪除，將 `assignee` 設為 `null`
- [x] 1.4 確認遷移後的資料能在 `taskStore.save()` 正確寫入新格式

## 2. 移除專案編輯頁面工作人員區塊（ProjectForm.vue）

- [x] 2.1 移除「工作人員」區塊的 HTML 模板（工作人員清單、加入/移除按鈕）
- [x] 2.2 移除相關的 JavaScript 邏輯（`addStaff`、`removeStaff`、`availableContacts` 等）
- [x] 2.3 確認表單不再引用 `projectStaffStore`

## 3. 修改任務負責人選取邏輯（TaskManagement.vue）

- [x] 3.1 將 `assigneeOptions` 的資料來源從 `projectStaffStore.byProject()` 改為 `contactStore.contacts`
- [x] 3.2 更新 `getContactName()` 函數，直接從 `contactStore` 取得姓名（無需經過 `projectStaffStore`）
- [x] 3.3 調整任務表單中負責人選取元件的值綁定，從 `staff.id` 改為 `contact.id`
- [x] 3.4 確認看板卡片上的負責人頭像顯示正常

## 4. 儀表板新增工作人員區塊（DashboardPage.vue）

- [x] 4.1 新增 computed 屬性 `projectWorkers`：從 `taskStore.tasks` 收集不重複的 `assignee`（contact.id），再從 `contactStore` 取得聯絡人資料
- [x] 4.2 在模板中新增「工作人員」區塊，以卡片或列表形式顯示姓名與電子郵件
- [x] 4.3 處理無工作人員時的空白狀態提示

## 5. 清理 projectStaffStore 及相關資源

- [x] 5.1 確認所有引用 `projectStaffStore` 的元件已更新完畢（僅剩 taskStore 遷移用動態匯入）
- [x] 5.2 保留 `projectStaffStore.js`（供 taskStore 遷移碼使用，元件不再引用）
- [x] 5.3 確認 Pinia 無需額外註冊（Pinia 為自動註冊）
- [x] 5.4 遷移碼會在首次載入時自動轉換舊資料，Drive 檔案保留唯遷移仍需使用

## Context

目前已有專案列表（ProjectList.vue）與資源檔案頁面（ProjectResources.vue），但缺乏統一的專案管理入口。點選專案名稱後僅能進入資源頁面，無法在同一個頁面查看專案全貌。左側選單也未針對專案管理情境進行區分。

本設計將建立專案管理主頁面（/projects/:projectId），整合儀表板、資源管理、任務管理，並讓左側選單在進入專案後切換為專案專屬功能。

## Goals / Non-Goals

**Goals:**

- 建立 `/projects/:projectId` 路由作為專案管理入口
- 左側選單進入專案後僅保留「首頁」，其餘替換為專案專屬功能（儀表板、資源管理、任務管理）
- 專案頂部顯示目前專案名稱
- 儀表板在同一頁面整合顯示各功能摘要
- 資源管理：支援上傳檔案（公文、附件、報表），可依資料夾分類
- 任務管理：支援任務 CRUD、相依模式（完成-開始、開始-開始、完成-完成）、依截止日期排序

**Non-Goals:**

- 不更動 Google Drive 認證與儲存機制
- 不更動現有專案列表頁面與首頁
- 不引入新的外部儲存服務

## Decisions

1. **路由設計**: 使用巢狀路由 `/projects/:projectId/` 搭配子路由（dashboard、resources、tasks），預設顯示 dashboard
2. **Layout 切換**: 新增 `ProjectLayout.vue` 作為專案管理專用 Layout，內含專案專屬左側選單；不使用 MainLayout 的 drawer 避免全域污染
3. **任務資料儲存**: 使用 Google Drive JSON 檔案儲存（`tasks-{projectId}.json`），沿用現有的 `useDriveStorage` composable
4. **相依任務實作**: 任務相依使用 `predecessorId` + `dependencyType` 欄位記錄，前端排序時以 topological order 為基礎
5. **資源分類**: 在 Google Drive 專案資料夾下建立子資料夾（公文、附件、報表、其他），取代單一層級

## Risks / Trade-offs

- **相依任務循環**: 使用者可能設定 A 相依 B、B 相依 A → 前端需偵測循環並提示
- **大量任務效能**: 以 JSON 儲存，單一專案任務量過大時讀寫可能變慢 → 目前階段可接受
- **Layout 切換體驗**: 從專案列表點選進入時，drawer 會閃爍切換 → 可搭配過渡動畫緩解

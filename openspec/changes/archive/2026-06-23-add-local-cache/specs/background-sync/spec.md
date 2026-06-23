# 背景同步 (Background Sync) 規格

## Purpose

提供非同步背景同步機制，將本地快取的變更自動同步回 Google Drive，並偵測與處理雲端衝突，確保資料最終一致性。

## Requirements

### Requirement: 同步佇列排程

系統 SHALL 在以下時機觸發背景同步：

- 資料寫入後（延遲 2 秒，等待可能的批量寫入合併）
- 頁面/路由切換時
- 恢復連線時（`online` 事件觸發）
- 每 5 分鐘定時觸發（作為保險機制）

#### Scenario: 寫入後自動排程同步

- **WHEN** 使用者編輯專案資料並儲存
- **THEN** 系統於 2 秒延遲後檢查 `sync_queue`
- **AND** 若有待同步項目，開始依序同步至 Google Drive

#### Scenario: 頁面切換觸發同步

- **WHEN** 使用者從「專案列表」頁面切換至「聯絡人」頁面
- **THEN** 系統觸發背景同步
- **AND** 若同步進行中則不重複觸發

#### Scenario: 離線恢復後自動同步

- **WHEN** 瀏覽器偵測到 `online` 事件
- **THEN** 系統立即觸發背景同步
- **AND** 將所有佇列中待同步項目上傳至 Drive

### Requirement: 同步執行流程

系統 SHALL 依序處理 `sync_queue` 中的每一筆待同步項目，並在完成後更新狀態。

#### Scenario: 成功同步

- **WHEN** 系統發起 `writeData(type, data)` 至 Google Drive API 並取得成功
- **THEN** 系統從 `sync_queue` 移除該項目
- **AND** 更新 `sync_meta` 中的 `lastSyncAt` 與 `status: 'idle'`
- **AND** 更新 `data_cache` 中的 `driveModifiedAt` 為 API 回傳的 `modifiedTime`

#### Scenario: 同步失敗（網路錯誤）

- **WHEN** 系統發起寫入 Drive API 但發生網路錯誤
- **THEN** 系統增加該項目的 `retryCount`
- **AND** 若 `retryCount < 3`，保留於佇列中等待下次同步觸發
- **AND** 若 `retryCount >= 3`，將 `sync_meta.status` 設為 `'error'` 並保留項目
- **AND** 系統發出通知或 UI 提示同步失敗

#### Scenario: 同步進行中禁止重複

- **WHEN** 系統正在進行背景同步
- **THEN** 其他同步觸發事件（定時器、頁面切換等）被忽略
- **AND** 等待當前同步完成後再處理新觸發

### Requirement: 衝突偵測與處理

系統 SHALL 在每次同步寫入 Drive 前比對本地與雲端的版本時間戳，偵測衝突。

#### Scenario: 無衝突（本地為最新）

- **WHEN** 系統準備將 `contacts` 資料寫入 Drive
- **THEN** 系統先讀取 Drive 上的當前 `modifiedTime`
- **AND** 若雲端 `modifiedTime` 等於或早於本地的 `driveModifiedAt`
- **THEN** 系統執行寫入，認為無衝突

#### Scenario: 偵測到衝突（雲端有新版本）

- **WHEN** 系統準備將 `projects` 資料寫入 Drive
- **THEN** 系統讀取 Drive 上的當前 `modifiedTime`
- **AND** 若雲端 `modifiedTime` 晚於本地的 `driveModifiedAt`
- **THEN** 系統採用 Local Wins 策略，以本地資料覆蓋雲端（強制寫入）
- **AND** 系統在 UI 顯示提示：「偵測到雲端版本更新，已以本地版本覆蓋」

#### Scenario: 衝突時可選 Remote Wins（預留）

- **WHEN** 衝突發生且使用者在設定中選擇「以雲端版本為準」
- **THEN** 系統放棄本地變更
- **AND** 從 Drive 下載最新資料覆蓋本地快取
- **AND** 從 `sync_queue` 移除該項目

### Requirement: 同步狀態指示

系統 SHALL 提供同步狀態查詢 API，供 UI 層顯示同步狀態。

#### Scenario: 查詢同步狀態

- **WHEN** UI 層呼叫 `getSyncStatus(type)`
- **THEN** 系統回傳 `{ type, status: 'idle' | 'syncing' | 'error', lastSyncAt, pendingCount }`

#### Scenario: 顯示同步指示器

- **WHEN** 背景同步進行中
- **THEN** 應用程式標題列或狀態列顯示同步中圖示（旋轉箭頭）
- **AND** 同步完成後圖示變為勾選標記後淡出
- **AND** 同步失敗時圖示變為警告標記

### Requirement: 離線佇列持久化

系統 SHALL 確保 `sync_queue` 在瀏覽器關閉後仍保留待同步項目。

#### Scenario: 瀏覽器中斷後恢復

- **WHEN** 使用者關閉瀏覽器分頁
- **AND** 重新開啟應用程式
- **THEN** 系統檢查 `sync_queue` 中是否有尚未同步的項目
- **AND** 若有，於應用程式初始化後自動觸發同步

#### Scenario: 清除已同步項目

- **WHEN** 同步成功後
- **THEN** 系統從 `sync_queue` 完整移除該項目
- **AND** `sync_queue` 中僅保留尚未同步或有錯誤的項目

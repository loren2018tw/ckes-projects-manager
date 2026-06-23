# 快取失效 (Cache Invalidation) 規格

## Purpose

定義快取失效策略，包含 TTL 自動失效、手動強制重新整理、以及離線狀態下快取行為的管理，確保使用者能在適當時間取得最新資料。

## Requirements

### Requirement: TTL 自動失效

系統 SHALL 為每筆快取資料設定 TTL（Time-To-Live），超過 TTL 的資料視為過期。

**預設 TTL 值：**

- JSON 資料檔（專案、聯絡人等）：30 秒
- 檔案列表（專案資料夾內容）：60 秒

TTL 可透過設定檔調整。

#### Scenario: 快取過期自動更新

- **WHEN** 系統讀取 `data_cache` 中的 `projects` 快取
- **AND** `cachedAt` 距今已超過 30 秒
- **THEN** 系統回傳快取資料（即時）
- **AND** 背景發起 Drive API 請求更新快取

#### Scenario: TTL 可設定

- **WHEN** 系統初始化快取層時
- **THEN** 系統讀取設定中的 TTL 值（如無設定則使用預設 30 秒）
- **AND** 所有快取讀取使用此 TTL 判斷是否過期

### Requirement: 手動強制重新整理

系統 SHALL 提供使用者強制重新整理資料的機制，忽略快取直接從 Drive 取得最新資料。

#### Scenario: 下拉刷新

- **WHEN** 使用者在資料列表頁面執行下拉刷新手勢
- **THEN** 系統忽略快取，直接發起 Drive API 請求
- **AND** 取得最新資料後更新 `data_cache` 及 `driveModifiedAt`
- **AND** 更新 UI 顯示最新資料

#### Scenario: 同步按鈕

- **WHEN** 使用者點擊工具列的「同步」按鈕
- **THEN** 系統對所有資料類型執行強制刷新
- **AND** 顯示同步進度指示
- **AND** 完成後顯示「資料已同步至最新」

#### Scenario: 強制刷新時快取保留

- **WHEN** 強制重新整理觸發但 Drive API 請求失敗
- **THEN** 系統保留現有快取資料
- **AND** 顯示錯誤訊息：「無法取得最新資料，已顯示上次快取內容」

### Requirement: 離線狀態感知

系統 SHALL 根據瀏覽器連線狀態調整快取行為。

#### Scenario: 離線時讀取快取

- **WHEN** 瀏覽器處於離線狀態
- **THEN** 系統略過 TTL 檢查
- **AND** 直接從 `data_cache` 回傳資料（無論是否過期）
- **AND** 若 `data_cache` 中無該資料，回傳錯誤：「目前離線，無可用快取資料」

#### Scenario: 離線時寫入佇列

- **WHEN** 瀏覽器處於離線狀態
- **THEN** 系統允許使用者編輯資料
- **AND** 資料寫入 `data_cache` 並加入 `sync_queue`
- **AND** UI 顯示「離線模式 — 變更將於連線後自動同步」

#### Scenario: 離線到連線轉換

- **WHEN** 瀏覽器從離線恢復連線
- **THEN** 系統立即觸發背景同步
- **AND** 同步完成後 UI 顯示「所有變更已同步」

### Requirement: 快取手動清除

系統 SHALL 提供清除所有本地快取的功能。

#### Scenario: 清除全部快取

- **WHEN** 使用者透過設定頁面執行「清除本地快取」
- **THEN** 系統清除 `data_cache` 中所有資料
- **AND** 保留 `sync_queue`（避免遺失待同步項目）
- **AND** 下次讀取資料時重新從 Drive API 取得

#### Scenario: 登出時清除快取

- **WHEN** 使用者登出
- **THEN** 系統清除整個 IndexedDB 資料庫（包含 `sync_queue`）
- **AND** 確保下次登入時取得全新資料

### Requirement: 快取統計

系統 SHALL 提供快取狀態統計資訊供除錯與監控使用。

#### Scenario: 查詢快取統計

- **WHEN** 開發者或管理介面呼叫 `getCacheStats()`
- **THEN** 系統回傳 `{ totalEntries, totalSize (bytes), oldestEntry, newestEntry, pendingSyncCount }`

#### Scenario: 快取大小警示

- **WHEN** IndexedDB 已使用空間超過 50MB
- **THEN** 系統自動清除最舊的 20% 快取項目（LRU 策略）
- **AND** 記錄清除日誌供除錯參考

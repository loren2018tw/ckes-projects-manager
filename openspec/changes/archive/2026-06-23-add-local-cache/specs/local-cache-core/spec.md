# 本地快取核心 (Local Cache Core) 規格

## Purpose

提供基於 IndexedDB 的本地資料快取引擎，作為 `useDriveStorage.js` 與 Google Drive API 之間的快取層，儲存 JSON 資料檔的本機副本與版本資訊，實現讀取優先回傳本地資料、減少網路延遲的目標。

## Requirements

### Requirement: IndexedDB 資料庫初始化

系統 SHALL 在應用程式啟動時自動建立 IndexedDB 資料庫，包含以下 object stores：

**資料庫名稱：** `ckes_cache`

**Object Stores：**

| Store Name   | Key Path             | 說明         |
| ------------ | -------------------- | ------------ |
| `data_cache` | `type`               | 快取資料本體 |
| `sync_queue` | `id` (autoIncrement) | 待同步佇列   |
| `sync_meta`  | `type`               | 同步中繼資訊 |

**`data_cache` Store Document Schema：**

| 欄位              | 型別                | 說明                                                            |
| ----------------- | ------------------- | --------------------------------------------------------------- |
| `type`            | `string`            | 資料類型識別碼，例如 `projects`、`contacts`、`purchaseRequests` |
| `data`            | `object`            | JSON 資料本體                                                   |
| `cachedAt`        | `string` (ISO 8601) | 本地快取時間                                                    |
| `driveModifiedAt` | `string` (ISO 8601) | 雲端檔案最後修改時間 (`modifiedTime`)                           |
| `etag`            | `string`            | Drive API 回傳的 ETag（可選）                                   |

**`sync_queue` Store Document Schema：**

| 欄位         | 型別                     | 說明                               |
| ------------ | ------------------------ | ---------------------------------- |
| `id`         | `number` (autoIncrement) | 自動產生的佇列 ID                  |
| `type`       | `string`                 | 資料類型                           |
| `action`     | `'write' \| 'delete'`    | 操作類型                           |
| `data`       | `object` (可選)          | 要寫入的資料（action 為 write 時） |
| `createdAt`  | `string` (ISO 8601)      | 加入佇列時間                       |
| `retryCount` | `number`                 | 已重試次數（預設 0）               |
| `error`      | `string` (可選)          | 最後錯誤訊息                       |

**`sync_meta` Store Document Schema：**

| 欄位         | 型別                             | 說明             |
| ------------ | -------------------------------- | ---------------- |
| `type`       | `string`                         | 資料類型         |
| `lastSyncAt` | `string` (ISO 8601)              | 最後成功同步時間 |
| `status`     | `'idle' \| 'syncing' \| 'error'` | 同步狀態         |

#### Scenario: 首次啟動自動建立資料庫

- **WHEN** 使用者首次載入應用程式
- **THEN** 系統自動建立 `ckes_cache` IndexedDB 資料庫，並依 schema 建立 `data_cache`、`sync_queue`、`sync_meta` 三個 object stores

#### Scenario: 資料庫版本升級

- **WHEN** 系統偵測到 IndexedDB schema 版本號與目前資料庫不符
- **THEN** 系統執行版本遷移（onupgradeneeded），保留既有資料

### Requirement: 快取讀取優先

系統 SHALL 提供一層透明快取讀取 API，Pinia stores 呼叫 `readData(type)` 時依以下順序回傳：

```
1. IndexedDB 中有快取且未過期 → 直接回傳快取資料
2. IndexedDB 中有快取但已過期 → 回傳快取資料 + 背景發起 Drive API 更新
3. IndexedDB 中無快取 → 等待 Drive API 回傳後快取再回傳
```

#### Scenario: 快取命中且有效

- **WHEN** 系統呼叫 `readData('projects')`
- **THEN** 系統從 IndexedDB `data_cache` 中尋找 key 為 `projects` 的紀錄
- **AND** 若 `cachedAt` 仍在 TTL 有效期內
- **THEN** 系統立即回傳快取資料，不發起 Drive API 請求

#### Scenario: 快取過期但存在

- **WHEN** 系統呼叫 `readData('projects')`
- **THEN** 系統立即回傳快取資料
- **AND** 背景發起 Drive API 請求取得最新資料
- **AND** 取得新資料後更新 IndexedDB 快取與 `driveModifiedAt`
- **AND** 若 API 請求失敗，快取資料仍維持可用

#### Scenario: 快取不存在（首次讀取）

- **WHEN** 系統首次呼叫 `readData('contacts')`
- **THEN** 系統發起 Drive API 請求
- **AND** 取得資料後寫入 IndexedDB `data_cache`
- **AND** 記錄 `driveModifiedAt` 與 `cachedAt`
- **AND** 回傳資料給呼叫端

### Requirement: 快取寫入策略

系統 SHALL 在 Pinia stores 呼叫 `writeData(type, data)` 時，優先寫入本地快取而非直接寫入 Drive。

#### Scenario: 寫入資料先存本地

- **WHEN** 系統呼叫 `writeData('projects', { ... })`
- **THEN** 系統先將資料寫入 IndexedDB `data_cache`
- **AND** 更新 `cachedAt` 為當前時間
- **AND** 在 `sync_queue` 新增一筆 `{ type: 'projects', action: 'write', data: { ... } }` 紀錄
- **AND** 立即回傳成功狀態給呼叫端

#### Scenario: 寫入後同步佇列累積

- **WHEN** 系統在短時間內多次呼叫 `writeData`
- **THEN** 系統僅保留該 `type` 最新的一次寫入於 `sync_queue`（覆蓋先前待同步項目）
- **AND** 避免佇列中重複累積相同 type 的多筆寫入

### Requirement: 版本追蹤

系統 SHALL 在每次從 Drive API 取得資料時記錄 `modifiedTime`，用於後續衝突比對。

#### Scenario: 記錄雲端版本

- **WHEN** 系統從 Drive API 成功讀取資料
- **THEN** 系統將 API 回傳的 `modifiedTime` 存入 `data_cache` 的 `driveModifiedAt` 欄位

#### Scenario: 本地更新後版本更新

- **WHEN** 系統寫入本地快取
- **THEN** 系統將 `driveModifiedAt` 設為當前時間（與雲端尚未同步）
- **AND** 待背景同步成功後更新為雲端回傳的實際 `modifiedTime`

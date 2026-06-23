## Context

目前 `useDriveStorage.js` 直接呼叫 Google Drive REST API v3 讀寫 JSON 資料檔，所有 Pinia store 在初始化及每次操作時皆發送網路請求。僅 file/folder ID 快取於 sessionStorage，資料本體無任何本地副本。這導致：

- 頁面切換時需等待 Drive API 回應方可顯示資料
- 離線時完全無法操作
- 重複讀取相同資料浪費頻寬

## Goals / Non-Goals

**Goals:**

- 提供一層透明快取，封裝在 `useDriveStorage.js` 內部，對 Pinia stores 保持相同 API 簽名
- IndexedDB 做為本地資料庫，存放 JSON 資料的快取副本與版本資訊
- 寫入操作支援背景同步：資料先寫本地，非同步佇列排程上傳 Drive
- 衝突偵測：透過 `updatedAt` 時間戳比對本地與雲端版本
- 快取 TTL 自動失效，支援手動強制刷新

**Non-Goals:**

- 不支援真正的離線編輯（仍需連線驗證權限）
- 不實作 PWA Service Worker 層級快取
- 不處理二進位檔案（附件、公文等）的快取，僅針對 JSON 資料檔
- 不支援多標籤頁即時同步（同一瀏覽器多分頁操作同一帳號）

## Decisions

| 決策              | 選擇                          | 替代方案                      | 理由                                                              |
| ----------------- | ----------------------------- | ----------------------------- | ----------------------------------------------------------------- |
| 本地儲存          | IndexedDB                     | localStorage / sessionStorage | 支援結構化資料、大量儲存、非同步讀寫，不阻塞主執行緒              |
| IndexedDB wrapper | `idb` 套件                    | 自行封裝                      | 簡潔的 Promise-based API，減少 boilerplate                        |
| 快取策略          | Cache-Aside（唯讀快取）       | Write-Through / Write-Behind  | 讀取先查快取再回源；寫入先寫快取再背景同步，保持回應速度          |
| 版本追蹤          | ISO 字串 `updatedAt`          | ETag / 整數版本號             | Drive API 回傳的 `modifiedTime` 即為 ISO 字串，可直接作為版本依據 |
| 衝突處理          | Local Wins（本地優先）        | Remote Wins / 手動合併        | 單人使用場景為主，本地最新編輯應優先保留；雲端衝突時覆蓋          |
| 同步觸發          | 頁面切換 + 定時器 + 強制事件  | 僅定時器                      | 使用者操作後立即排程，定時器作為保險                              |
| 離線偵測          | `navigator.onLine` + 事件監聽 | `@vueuse/core` `useOnline`    | 避免引入新相依；Quasar 生態可選用 `useOnline`                     |

**架構層次：**

```
Pinia Store (projectStore, contactStore, ...)
        │  readData(type) / writeData(type, data)
        ▼
useDriveStorage (composable)
        │
        ├── Cache Layer (新) ─── IndexedDB (idb)
        │       ├─ getCached(type)      → 回傳本地資料 + 版本
        │       ├─ setCached(type, data) → 寫入本地 + 標記待同步
        │       ├─ markSynced(type)      → 清除待同步標記
        │       └─ getPendingSyncs()     → 取得所有待同步項目
        │
        └── Drive API Layer (既有) ─── Google Drive REST API
                ├─ readData(type)   → 回傳雲端資料 + modifiedTime
                └─ writeData(type, data) → 寫入雲端
```

## Risks / Trade-offs

- **[Risk] IndexedDB 空間限制**：瀏覽器可能清除 IndexedDB（尤其是 Safari）。→ 設計 graceful fallback，快取失效時自動重回 Direct-to-Drive 模式。
- **[Risk] 背景同步失敗**：同步佇列可能因權杖過期或網路問題失敗。→ 實作重試機制（最多 3 次），失敗後保留在佇列中並標記錯誤。
- **[Risk] 衝突導致資料遺失**：使用 Local Wins 策略，雲端資料可能被覆蓋。→ 同步前比對 `updatedAt`，若雲端更新則發出警告。
- **[Trade-off] 寫入延遲**：寫入 Drive 從同步改為非同步，使用者可能預期立即看到雲端更新。→ UI 提供同步狀態指示器。
- **[Trade-off] 多標籤頁不一致**：不同分頁各有獨立 IndexedDB。→ 初期不處理，如有需求後續可加入 BroadcastChannel 通知。

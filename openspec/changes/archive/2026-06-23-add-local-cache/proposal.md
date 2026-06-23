## Why

目前所有資料（專案、聯絡人、任務、採購單等 JSON 檔案）均直接讀寫 Google Drive API，每次操作皆需經過網路請求，導致頁面切換及資料載入時有明顯延遲感。為了改善使用者體驗，需要建立本地快取機制，將雲端資料快取於瀏覽器本地，並在適當時機進行背景同步，達到「讀取瞬間呈現、寫入流暢無感」的目標。

## What Changes

- **本地資料庫層**：使用 IndexedDB 做為本地快取儲存體，取代目前僅 cache file/folder ID 的 sessionStorage 模式
- **資料快取策略**：每次從 Drive 讀取 JSON 資料時，同時寫入 IndexedDB；後續讀取優先從本地返回，再於背景更新
- **背景同步機制**：定期或於觸發事件時，將本地變更同步回 Google Drive；支援離線佇列（pending changes），連線後自動回寫
- **衝突偵測**：比對本地與雲端的版本時間戳，偵測衝突並提供處理策略
- **快取失效與強制重新整理**：提供下拉刷新、手動同步按鈕，以及快取 TTL 自動失效機制

## Capabilities

### New Capabilities

- `local-cache-core`: 核心本地快取引擎，包含 IndexedDB schema、CRUD 操作、版本追蹤
- `background-sync`: 背景同步機制，包含排程同步、變更佇列、衝突偵測與處理
- `cache-invalidation`: 快取失效策略，包含 TTL 管理、手動刷新、離線狀態感知

### Modified Capabilities

（無既有規格需修改 — 此為全新基礎設施）

## Impact

- **src/composables/useDriveStorage.js**：核心改寫，加入快取層包裹原始 Drive API 呼叫
- **所有 Pinia stores**：需調整資料讀寫流程，非同步回呼模式可能改變
- **新相依套件**：`idb`（IndexedDB wrapper）或自行封裝 IndexedDB 工具函式
- **離線狀態偵測**：需要 `navigator.onLine` 事件監聽或 `@vueuse/core` 的 `useOnline`
- **無 Breaking Changes**：對外 API 行為保持一致（唯讀取速度提升、寫入改為背景同步）

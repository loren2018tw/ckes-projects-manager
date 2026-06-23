## 1. 相依套件安裝

- [x] 1.1 安裝 `idb` 套件至專案相依
- [x] 1.2 確認 `package.json` 中 `idb` 已正確加入 dependencies

## 2. IndexedDB 資料庫初始化

- [x] 2.1 建立 `src/utils/cacheDb.js`：封裝 IndexedDB 底層操作（openDB、版本管理）
- [x] 2.2 實作 `data_cache` object store（type 為 keyPath，包含 data、cachedAt、driveModifiedAt、etag）
- [x] 2.3 實作 `sync_queue` object store（autoIncrement id，包含 type、action、data、createdAt、retryCount、error）
- [x] 2.4 實作 `sync_meta` object store（type 為 keyPath，包含 lastSyncAt、status）
- [x] 2.5 實作資料庫版本升級（onupgradeneeded）處理

## 3. 快取層核心功能（Cache Layer）

- [x] 3.1 建立 `src/utils/cacheLayer.js`：封裝 Cache-Aside 讀寫策略
- [x] 3.2 實作 `getCached(type)`：從 IndexedDB 讀取快取，包含 TTL 檢查
- [x] 3.3 實作 `setCached(type, data, driveModifiedAt)`：寫入快取，同時加入 sync_queue
- [x] 3.4 實作 `markSynced(type, driveModifiedAt)`：同步成功後更新 sync_meta 與清除佇列項目
- [x] 3.5 實作 `getPendingSyncs()`：取得所有待同步佇列項目
- [x] 3.6 實作 `removePendingSync(type)`：從佇列移除指定類型項目
- [x] 3.7 實作 `clearAllCache()`：清除 data_cache（保留 sync_queue）

## 4. 整合至 useDriveStorage.js

- [x] 4.1 改寫 `readData(type)`：加入快取層（先讀快取，必要時背景回源）
- [x] 4.2 改寫 `writeData(type, data)`：先寫快取再加入同步佇列，立即回傳
- [x] 4.3 確保既有 Pinia stores 不需修改即可享有快取功能（API 簽名不變）
- [x] 4.4 測試既有功能不受影響（專案 CRUD、聯絡人 CRUD 等）

## 5. 背景同步機制

- [x] 5.1 實作 `processSyncQueue()`：依序處理 sync_queue 中所有待同步項目
- [x] 5.2 實作重試邏輯：失敗時遞增 retryCount，最多 3 次，超過則標記 error
- [x] 5.3 實作同步排程觸發點：寫入後延遲 2 秒、路由切換時、online 事件
- [x] 5.4 實作 5 分鐘定時同步（作為保險機制）
- [x] 5.5 實作同步進行中鎖定，避免重複觸發

## 6. 衝突偵測與處理

- [x] 6.1 同步寫入 Drive 前，先讀取雲端檔案的 `modifiedTime`
- [x] 6.2 比對本地 `driveModifiedAt` 與雲端 `modifiedTime`
- [x] 6.3 實作 Local Wins 策略：強制寫入本地版本並記錄衝突
- [x] 6.4 實作 Remote Wins 選項：放棄本地變更，下載雲端版本覆蓋快取
- [x] 6.5 衝突發生時觸發 UI 通知提示

## 7. 連線狀態感知

- [x] 7.1 實作 `navigator.onLine` 事件監聽（online / offline）
- [x] 7.2 離線時：略過 TTL 檢查，直接回傳快取資料
- [x] 7.3 離線時：允許寫入快取及佇列，顯示「離線模式」提示
- [x] 7.4 恢復連線時自動觸發背景同步

## 8. 快取 TTL 與強制重新整理

- [x] 8.1 實作 TTL 檢查機制，預設 JSON 資料 30 秒、檔案列表 60 秒
- [x] 8.2 實作 TTL 可設定功能（支援透過設定檔調整）
- [x] 8.3 實作 `forceRefresh(type)`：忽略快取，直接從 Drive 取得最新資料
- [x] 8.4 實作 `forceRefreshAll()`：對所有資料類型執行強制刷新

## 9. UI 同步狀態指示

- [x] 9.1 實作同步狀態查詢 API：`getSyncStatus(type)` 回傳 `{ status, lastSyncAt, pendingCount }`
- [x] 9.2 於應用程式工具列加入同步狀態指示器（旋轉箭頭 / 勾選 / 警告）
- [x] 9.3 實作手動同步按鈕觸發 `forceRefreshAll()`
- [x] 9.4 實作衝突通知及離線模式提示

## 10. 清除與除錯工具

- [x] 10.1 使用者選單加入「清除本地快取」功能
- [x] 10.2 登出時清除整個 IndexedDB 資料庫
- [x] 10.3 實作 `getCacheStats()` 回傳快取統計資料（項目數、大小、待同步數）
- [x] 10.4 實作空間超限自動清除（超過 50MB 清除最舊 20%）

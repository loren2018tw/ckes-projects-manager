# Ckes專案管理系統 (ckes-projects-manager)

## 環境變數

本專案使用 Google 登入，需在根目錄建立 `.env` 檔案（已列入 `.gitignore`，不會被提交），內容如下：

```env
QCLI_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

請到 [Google Cloud Console](https://console.cloud.google.com) 建立 OAuth 2.0 用戶端 ID（網頁應用程式類型），並將用戶端 ID 填入上述變數。

## Install the dependencies

```bash
pnpm install
# or: yarn/npm/bun install
```

### Start the app in development mode (HMR, error reporting, etc.)

```bash
quasar dev
```

### Build the app for production

```bash
quasar build
```

### Customize the configuration

See [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js).

# Parkly 全台停車資訊查詢

Parkly 是一個支援桌機、平板與手機的 RWD 停車資訊網站。前端以 Vite 啟動，後端透過 Python 串接 TDX 與地方政府公開資料，提供附近停車場、路邊停車、剩餘車位、費率、距離與地圖查詢。

## 主要功能

- 顯示全台 TDX 停車場與路邊停車資料
- 整合高雄市政府等地方政府公開資料，並排除重複項目
- 支援地址搜尋與瀏覽器定位
- 搜尋框會即時建議常用地標、縣市與目前載入的停車場名稱
- 移動地圖後自動辨識縣市並更新目前區域的停車資訊
- 跨縣市查詢使用 TDX 資料快取，減少重複等待
- 依 1、3、5、10 公里範圍同步篩選地圖與左側清單
- 停車場以 `P` 標記，路邊車格以不同狀態的圓點標記
- 縮小地圖時將鄰近標記合併為區域數量
- 顯示剩餘車格、總車格、距離、費率與導航入口
- 固定導覽列、手機版漢堡選單與完整 RWD 版面

## 使用技術

- HTML5、SCSS / CSS、Tailwind CSS
- JavaScript、jQuery、Vite
- Leaflet、MapLibre GL
- Python 3 HTTP API
- TDX 運輸資料流通服務
- 地方政府停車開放資料

## 執行環境

開始前請先安裝：

- [Node.js](https://nodejs.org/) 20 以上版本（包含 npm）
- [Python](https://www.python.org/) 3.10 以上版本（只有開發本機 API 時需要）
- 可連線至 TDX 與地圖服務的網路環境

可在 PowerShell 中確認版本：

```powershell
node --version
npm --version
python --version
```

## 安裝步驟

1. 具有私人 repository 權限的協作者可使用：

   ```powershell
   git clone https://github.com/xiang940804/parkly-taiwan-parking.git
   cd parkly-taiwan-parking
   ```

2. 安裝前端套件：

   ```powershell
   npm install
   ```

Python API 目前只使用 Python 標準函式庫，因此不需要另外執行 `pip install`。

此 repository 設為 **Private**。未受邀的 GitHub 使用者無法檢視或複製原始碼。

## 開啟伺服器

一般前端開發不需要設定 TDX 金鑰，也不需要另外啟動 Python API。Vite 預設將 `/api` 代理到已部署的 Parkly API：

```powershell
cd "C:\Users\Xiang\Desktop\網頁程式設計課程"
npm run dev
```

成功後以瀏覽器開啟：

<http://127.0.0.1:5173/>

請勿直接雙擊 `index.html` 開啟網站。SCSS、JavaScript 模組、API 代理與部分樣式需要經過 Vite 才能正確載入。

### 關閉伺服器

在 PowerShell 視窗按下 `Ctrl + C`。

### 選用：開發本機 Python API

只有修改 `api/server.py` 時才需要本機 API。第一次設定時，將範例檔複製為不會提交到 Git 的 `.env`：

```powershell
Copy-Item .env.example .env
```

開啟 `.env`，填入自己的本機開發值：

```dotenv
PARKLY_API_PROXY=http://127.0.0.1:8000
TDX_CLIENT_ID=your_client_id
TDX_CLIENT_SECRET=your_client_secret
PARKLY_API_HOST=127.0.0.1
PARKLY_API_PORT=8000
```

設定一次後，之後不需要在每個 PowerShell 工作階段重新輸入。使用兩個 PowerShell 視窗分別執行：

```powershell
npm run api
```

```powershell
npm run dev
```

Python API 會自動讀取專案根目錄的 `.env`；Vite 也會使用同一份檔案中的 `PARKLY_API_PROXY`。

## TDX 金鑰說明

- 正式網站已由 Google Secret Manager 管理現有 TDX 金鑰，使用網站或執行前端不需要重新設定。
- 金鑰由 Python API 讀取，不會傳送至瀏覽器前端。
- GitHub repository 不保存 Client Secret；私人 repository 也不應提交長效金鑰。
- 請勿將 Client Secret 放進前端 JavaScript，否則開啟網站的人可以查看。

本機建議使用 `.env`，也可以臨時使用 PowerShell 工作階段環境變數：

```powershell
$env:TDX_CLIENT_ID = "<目前的 Client ID>"
$env:TDX_CLIENT_SECRET = "<目前的 Client Secret>"
npm run api
```

關閉該 PowerShell 視窗後，這兩個工作階段變數就不會繼續保留。請不要將實際 Secret 提交到 Git。

環境變數優先於 `.env`。因此正式 Cloud Run 仍維持原本做法：從 Google Secret Manager 注入 `TDX_CLIENT_ID` 與 `TDX_CLIENT_SECRET`，不會被 `.env` 覆蓋；Docker 映像也不包含 `.env`。

一般協作者只需執行 `npm run dev`，Vite 會使用正式 Parkly API，因此不需要取得或設定 TDX 金鑰。只有要修改及測試 Python API 的後端開發者才需要由專案管理者授予適當的 Secret 存取方式。

## 服務架構

| 服務 | 位址 | 用途 |
| --- | --- | --- |
| Vite 前端 | `http://127.0.0.1:5173` | 載入 HTML、SCSS、JavaScript 與地圖介面 |
| 正式 Parkly API | `https://parkly-tw-20261120.web.app/api` | 預設開發資料來源，不需要本機金鑰 |
| 本機 Python API（選用） | `http://127.0.0.1:8000` | 修改後端程式時使用 |

Vite 預設將 `/api/*` 請求轉送到正式 Parkly API；如需測試本機後端，可用 `PARKLY_API_PROXY` 改成 `http://127.0.0.1:8000`。

## 正式部署

目前正式環境已部署完成：

- GCP／Firebase 專案：`parkly-tw-20261120`
- Private GitHub repository：<https://github.com/xiang940804/parkly-taiwan-parking>
- 正式網站：<https://parkly-tw-20261120.web.app>
- Cloud Run API：<https://parkly-api-ja77rc5c2q-de.a.run.app>
- 部署區域：`asia-east1`
- Cloud Run service：`parkly-api`
- 執行服務帳號：`parkly-api-runtime@parkly-tw-20261120.iam.gserviceaccount.com`

正式架構由 Firebase Hosting 提供 Vite 靜態檔案，並將 `/api/**` rewrite 到 Cloud Run。`TDX_CLIENT_ID` 與 `TDX_CLIENT_SECRET` 儲存在 Google Secret Manager；Cloud Run 服務帳號只被授權讀取這兩個指定 Secret。

Python API 在本機監聽 `127.0.0.1:8000`；偵測到 Cloud Run 的 `K_SERVICE` 後會自動改為 `0.0.0.0:$PORT`。Cloud Run 目前設定最少 instance 為 0、最多 1：閒置時可縮到 0 以降低費用，但第一個請求可能有冷啟動等待時間。

重新部署 API：

```powershell
gcloud run deploy parkly-api --source api --project parkly-tw-20261120 --region asia-east1 --allow-unauthenticated --service-account parkly-api-runtime@parkly-tw-20261120.iam.gserviceaccount.com --set-secrets TDX_CLIENT_ID=parkly-tdx-client-id:latest,TDX_CLIENT_SECRET=parkly-tdx-client-secret:latest --memory 512Mi --cpu 1 --concurrency 40 --timeout 60 --min 0 --max 1
```

重新部署前端：

```powershell
npm run deploy:web
```

## 地圖標記說明

- 綠色或橘色 `P`：停車場
- 藍色空心圓：路邊車格目前有空位
- 藍色實心圓：路邊車格目前已占用
- 灰色圓點：資料來源未提供即時占用狀態
- 數字標記：目前地圖比例下合併的區域數量，點擊後會放大

不同縣市的開放資料完整度不同；如果來源只提供路段級座標，網站會以路段位置呈現，不會建立不存在的單一車格座標。

## 常用指令

| 指令 | 功能 |
| --- | --- |
| `npm install` | 安裝前端套件 |
| `npm run api` | 啟動 Python API（8000） |
| `npm run cache:parking` | 重新建立全台 22 縣市 Firebase 停車快取 |
| `npm run dev` | 啟動 Vite 開發伺服器（5173） |
| `npm run build` | 建立正式版檔案到 `dist` |
| `npm run preview` | 預覽已建置的前端檔案 |
| `npm run deploy:web` | 建置並重新部署 Firebase Hosting |

正式建置：

```powershell
npm run build
```

產生的靜態檔案會放在 `dist` 目錄。正式部署時仍需部署 Python API，並設定 `/api` 的反向代理。

## API 範例

健康檢查：

```text
GET http://127.0.0.1:8000/api/health
```

查詢指定中心點附近停車資料：

```text
GET http://127.0.0.1:8000/api/parking?lat=22.6273&lon=120.3014&radius=3&type=all
```

常用參數：

- `lat`：地圖中心緯度
- `lon`：地圖中心經度
- `radius`：搜尋半徑，單位為公里
- `type`：`all`、`offstreet` 或 `curb`

## 全台快取與費用控制

- `public/data/parking/` 包含 22 縣市的 TDX 停車快照，Vite 建置時會複製到 Firebase Hosting。
- 使用者移動到不同縣市時，前端先載入 Firebase 快取並立即呈現，再於背景補充 Cloud Run 即時資料。
- 即時查詢會將座標合併為約 10 公里網格，瀏覽器快取 5 分鐘；Cloud Run 回應也可由 Firebase CDN 共用 5 分鐘。
- 靜態點位不必因每次拖曳地圖重新呼叫 Cloud Run；即時剩餘車位仍可能因資料來源或快取時間而短暫延遲。
- 正式專案的 Cloud Run 最大執行個體為 1、最小為 0，並設定每月 NT$30 的 Cloud Run Spend cap（約低於 US$1）。
- 另有涵蓋整個 Parkly 專案的每月 NT$30 警示預算，會在 50%、80% 與 100% 寄送通知。
- Spend cap 只涵蓋 Cloud Run，Google 官方亦說明執行判定並非瞬時完成；Firebase Hosting、建置儲存及其他服務不包含在此上限內。

重新產生快取時，金鑰只需放在目前終端機的環境變數：

```powershell
$env:TDX_CLIENT_ID='你的 Client ID'
$env:TDX_CLIENT_SECRET='你的 Client Secret'
npm run cache:parking
npm run build
```

## 專案結構

```text
網頁程式設計課程/
├─ api/                         Python API、TDX 與地方資料整合
├─ public/data/parking/         22 縣市 Firebase Hosting 停車快取
├─ scripts/build_parking_cache.py  全台快取產生程式
├─ src/                         前端 JavaScript 與 SCSS
├─ index.html                   首頁
├─ parking.html                 停車資訊查詢頁
├─ package.json                 npm 指令與套件設定
├─ vite.config.js               Vite 與 API 代理設定
├─ Parkly-專題簡報內容.md       簡報文字素材
└─ README.md                    專案說明
```

## 常見問題

### 網頁沒有套用 CSS

不要直接開啟 HTML 檔案。請確認已執行 `npm run dev`，並從 <http://127.0.0.1:5173/> 進入。

### 網頁可開啟，但沒有真正的停車資料

確認第一個終端機仍在執行 `npm run api`，並檢查 <http://127.0.0.1:8000/api/health>。若出現 TDX 驗證失敗，請重新啟動 API 並正確輸入現有金鑰。

### 輸入 TDX Secret 時沒有任何字出現

這是隱藏輸入效果。直接完整輸入後按 Enter 即可。

### 地圖空白或圖磚沒有載入

請檢查網路連線、瀏覽器開發者工具的錯誤訊息，以及防火牆是否阻擋地圖服務。

### 無法取得目前位置

請允許瀏覽器的位置權限。若拒絕權限，仍可在搜尋欄手動輸入地址或行政區。

### 顯示連接埠已被占用

專案固定使用 5173 與 8000。請先關閉原本使用這兩個連接埠的程序，或回到先前已啟動伺服器的終端機繼續使用。

## 資料來源

- [TDX 運輸資料流通服務](https://tdx.transportdata.tw/)
- 各地方政府停車開放資料
- OpenFreeMap / OpenStreetMap 地圖資料

停車剩餘數量與費率以各資料來源最新回傳內容為準，實際狀況仍應依現場公告判斷。


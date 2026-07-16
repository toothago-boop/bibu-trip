# BiBu遊・北海道自駕行程

一個為 2026 北海道 7 日 6 夜自駕遊而設的手機優先 dashboard。介面沿用原版 BiBu遊 海報的柔和手繪、奶油紙張與橙色風格。

## 已有功能

- 7 日完整行程、景點搜尋、航班、酒店、Checklist 與備忘
- 免費附近餐廳探索：支援預設地區／目前位置、距離與菜式篩選，並可直接加入行程
- 每間餐廳均有食べログ參考連結，可在新分頁查看菜式、相片及評價
- 新增、修改、刪除、拖放及上下移動行程
- 自動找出「預留車程不足」的時間衝突
- 免費 Google Maps 地點／步行／駕車連結；網站本身不使用收費 Maps API
- 本機自動儲存、JSON 匯入／匯出及離線 PWA
- 可選 Google 登入 + Firestore 多裝置即時同步
- Firebase Hosting 設定及只准本人讀寫的 Firestore 規則

## 第一次 Firebase 設定

網站未填 Firebase Web App 設定時仍可正常使用，資料只會留在目前瀏覽器。

1. Firebase Console → Project settings → Your apps → Add app → Web。
2. 把 Firebase 提供的 `firebaseConfig` 值填入 `public/firebase-config.js`。
3. Authentication → Sign-in method → 啟用 Google。
4. Firestore Database → Create database。（Spark 免費額度已足夠私人行程使用。）
5. 在本機登入 Firebase CLI 後執行：

```bash
firebase deploy --only hosting,firestore:rules
```

Firebase Web App config 會公開在瀏覽器，這是正常設計；真正保護資料的是 `firestore.rules`。

## GitHub 自動部署

如果 Firebase Console 已連接這個 repo，之後每次推送到 `main` 都可自動部署。若尚未建立 workflow，在 repo 根目錄執行一次：

```bash
firebase init hosting:github
```

依畫面選擇 `toothago-boop/bibu-trip`、`main` 及 `public`。Firebase 會建立所需 GitHub Actions workflow 和 secret；之後毋須再手動上載整個資料夾。

## 路線時間的做法

每段行程可以設定一個預計交通分鐘數，dashboard 會拿它與下一個活動的開始時間比較並提示衝突。按「步行」或「駕車」會開啟免費 Google Maps Directions，由 Google Maps 顯示當時的最新建議時間；沒有把付費 Google Maps API 嵌入網站。

## 本機預覽

```bash
firebase emulators:start --only hosting
```

亦可用任何 static file server 開啟 `public/`。

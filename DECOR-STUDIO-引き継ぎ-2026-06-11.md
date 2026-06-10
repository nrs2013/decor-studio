# DECOR STUDIO 引き継ぎ書（2026-06-11）

> 次のチャットの Claude へ。**まず本書 → `DECOR-STUDIO-引き継ぎ-2026-06-10.md`（Art-Net診断の続き）→ 必要に応じて使い方ガイド** の順で読むこと。
> のむさん（コンサート演出家・コード未経験・GitHub `nrs2013`）向けには **結論先・舞台用語・コピペ完成形コマンド** で。

---

## 0. 今日やったこと（新機能：ボール球）

**ボール球（電球）機能を実装・出荷済み。** のむさん要望の経緯：電飾アプリとして「リアルな電球を置いて、ゲージ（卓フェーダー）で光る強さが変わる」機能。デモを3回見せて方向確定（アニメっぽい十字光芒はNG→写真調へ、色は卓任せ、クリア質感）。

### 仕様（確定済み・実装済み）

| 項目 | 内容 |
|---|---|
| 図形タイプ | `bulb`（`points[0]`=中心1点、`diameter` 既定**5.5**ドット、`bulbStyle` clear/frost） |
| 置き方 | 右サイドバー新設「**PARTS棚**」（`PartsPalette.tsx`）からキャンバスへD&D。中心がドロップしたマスに乗る |
| 2個目以降 | ⌘C → 空きマスをクリック（ペーストマーク）→ ⌘V。**ボール球のみのコピペは中心基準**（`pasteDelta` in geometry.ts）。他図形は従来どおり左上基準 |
| 色とゲージ | **両方とも卓（grandMA3）のRGBが握る**。`bulbHueIntensity()`: max成分=ゲージ、比率=色相。(128,0,0)=赤の半分 |
| 描画 | `src/renderer/src/render/bulb.ts`。クリア=ガラス映り込み+コイル白飛び+ジュワッと育つにじみ+水平レンズ筋（十字キラーンは廃止）。ゲージ92%超で白サージ（のむさん「最後はもっと光った感じ」対応） |
| 本番出力 | `OutputRenderer` は**加算描画のみ**＝消灯バルブは完全透明（LED的に正しい）。Syphon/Resolume Add合成で従来どおり |
| Inspector | BULB選択時：径（0.5刻み）+ 質感（クリア/フロスト）。Display/Width は非表示 |
| Array | 既存 repeat がボール球にも効く＝**等間隔の球列（ストリングライト）が一発** |

テスト67本green（bulb.test.ts / geometry.test.ts に追加分）。ブラウザ検証済み（dev:web + `__decorStore` フック）。

## 1. 🔴 重大：このフォルダは iCloud に齧られる（対策済み・知らないと死ぬ）

`~/Documents` は **iCloud Drive同期**（複数Mac共有）。今日だけで **2回 node_modules が破壊された**（esbuildのバイナリ消失→index.js消失）。git も一度 **SIGBUS(exit 138)** で殺され、コミットメッセージが前回ので刻まれた（amendで修正済み）。iCloudの衝突コピー「dist 2」も湧いた（削除済み）。

### 対策済みの構造（2026-06-11〜）

```
node_modules -> node_modules.nosync   （symlink。.nosync は iCloud が同期しない）
dist         -> dist.nosync           （同上）
```

- `.gitignore` に `node_modules.nosync` / `dist.nosync` 追加済み
- electron-builder.yml の files に除外追加済み（dist symlink化で自前出力の自動除外が効かなくなるため明示除外。+ @fontsource原材料除外で **.app 630MB→264MB**）
- **今後 npm がコケて「ファイルが無い」系エラーが出たら、まず iCloud を疑う**。直し方：`cd ~/Documents/decor-studio && rm -rf node_modules.nosync && npm ci`
- 根本対策（未実施・のむさんに提案中）：リポジトリごと iCloud 外（例 `~/dev/`）へ引っ越し

## 2. ビルド&起動（.nosync構造でもコマンドは従来どおり）

```
cd ~/Documents/decor-studio
npm run build && npx electron-builder --dir
open "dist/mac-arm64/DECOR STUDIO.app"
```

## 3. 未解決・次の一手

- **Art-Net受信トラブル**：引き継ぎ-2026-06-10 §0 参照（送信側=grandMA3 onPC、本命容疑=送信側Macのローカルネットワーク許可）。本日は未進展。
- **push**：本日のボール球コミットはローカルのみ。push はのむさん確認待ち（GitHub Pages の Web版も更新される）。
- ボール球の将来案：PARTS棚に第2弾アイコン（ロープライト等）追加はパレットに項目を足すだけの構造にしてある。

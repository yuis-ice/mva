---
title: "mva: ファイル移動だけでクラウドアーカイブ - rcloneを使った革新的なバックアップCLI"
tags: [TypeScript, rclone, CLI, backup, archiving]
private: false
---

# mva: ファイル移動だけでクラウドアーカイブ - rcloneを使った革新的なバックアップCLI

![mva CLI Screenshot](https://raw.githubusercontent.com/yuis-ice/mva/main/screenshot.png)

## はじめに

クラウドバックアップやアーカイブの操作は、しばしば複雑で時間のかかる作業です。mva（mv-archive）は、このプロセスを根本的に簡素化するTypeScript/Node.js製のCLIツールです。

**核心的なアイデア**: ファイルを特定のディレクトリに移動するだけで、自動的に圧縮・アーカイブ・クラウドアップロードが実行される

```bash
# これだけで自動アーカイブが開始
mv document.pdf /srv/mva/gdrive/
mv backup.tar.gz /srv/mva/azure/archive/
```

## mvaの特徴

### 🎯 認知負荷の最小化
- 複雑なコマンドを覚える必要なし
- 普通の`mv`コマンドだけでアーカイブ開始
- 直感的な操作でクラウドストレージへアップロード

### ⚡ 帯域幅最適化
- rcloneによる効率的なクラウドアップロード
- 自動ファイル圧縮（tar.gz）
- 増分アップロード対応

### 🛡️ 安全性重視
- ファイルの安全な移動とアーカイブ
- 設定可能な圧縮オプション
- エラーハンドリングとログ機能

## インストール

```bash
npm install -g mva
```

GitHubから直接インストール:
```bash
git clone https://github.com/yuis-ice/mva.git
cd mva
npm install
npm run build
npm link
```

## 基本的な使い方

### 1. 初期設定

```bash
mva init
```

これにより`~/.mva/config.yml`が作成されます：

```yaml
directories:
  - directory: "/srv/mva/gdrive"
    at: "0 2 * * *"  # 毎日午前2時
    format: "{humanTime}-{filename}.{ext}"
    compress: "tar.gz"
    destination: "gdrive:archive"
```

### 2. 監視ディレクトリの作成

```bash
mva setup-directories
```

### 3. 監視サービスの開始

```bash
mva start
```

### 4. ファイルのアーカイブ

ファイルを監視ディレクトリに移動するだけ：

```bash
mv important-data.pdf /srv/mva/gdrive/
# → 自動的に圧縮・アップロード開始
```

## 技術的なアーキテクチャ

### コアコンポーネント

#### ConfigManager
- YAML設定ファイルの管理
- 設定の検証とデフォルト値の提供
- `~/.mva/config.yml`の読み書き

#### ArchiveService
- ファイル圧縮（tar.gz）
- rcloneプロセスの管理
- ファイル名テンプレート処理

#### WatchService
- chokidarによるリアルタイムファイル監視
- node-cronによるスケジュール実行
- イベントドリブンなファイル処理

### 依存関係

```json
{
  "commander": "CLI フレームワーク",
  "js-yaml": "YAML 設定解析",
  "chokidar": "ファイルシステム監視",
  "node-cron": "cron スケジューリング",
  "tar": "ファイル圧縮",
  "fs-extra": "拡張ファイル操作"
}
```

## 設定オプション詳細

### ディレクトリ設定

```yaml
directories:
  - directory: "/srv/mva/gdrive"      # 監視対象ディレクトリ
    at: "0 2 * * *"                   # cron形式のスケジュール
    format: "{humanTime}-{filename}.{ext}"  # アーカイブファイル名形式
    compress: "tar.gz"                # 圧縮形式
    destination: "gdrive:archive"     # rclone送信先
```

### ファイル名テンプレート

- `{humanTime}`: 人間が読みやすい時刻形式
- `{filename}`: 元のファイル名
- `{ext}`: ファイル拡張子
- `{timestamp}`: UNIXタイムスタンプ

## rclone連携

mvaはrcloneのサブプロセスを起動してクラウドアップロードを行います。事前にrcloneの設定が必要です：

```bash
# Google Drive の設定例
rclone config
# → "gdrive" という名前でGoogle Driveを設定

# 設定確認
rclone listremotes
```

## 実用的な使用例

### 日次バックアップワークフロー

```bash
# 毎日のドキュメントをGoogle Driveにバックアップ
mv ~/Documents/daily-report.pdf /srv/mva/gdrive/

# 週次バックアップをAzure Storageに
mv ~/backups/week-backup.tar.gz /srv/mva/azure/
```

### 開発環境でのログアーカイブ

```bash
# アプリケーションログを自動アーカイブ
mv /var/log/app/app.log /srv/mva/s3/logs/
```

## まとめ

mvaは、従来のバックアップ・アーカイブ作業を革新的に簡素化します：

- **シンプル**: `mv`コマンドだけでアーカイブ開始
- **効率的**: rcloneによる最適化されたアップロード
- **安全**: 自動圧縮とエラーハンドリング
- **柔軟**: YAML設定による高いカスタマイズ性

GitHubリポジトリ: [yuis-ice/mva](https://github.com/yuis-ice/mva)

ぜひお試しください！フィードバックやコントリビューションをお待ちしています。

---

**関連記事**
- [mvaの内部アーキテクチャ解説](./mva-architecture.md)
- [rcloneとの連携パターン詳細](./mva-rclone-integration.md)

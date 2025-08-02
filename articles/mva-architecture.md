---
title: "mvaの内部アーキテクチャ解説 - TypeScriptで構築されたモジュラー設計"
tags: [TypeScript, architecture, design-patterns, Node.js, CLI]
private: false
---

# mvaの内部アーキテクチャ解説 - TypeScriptで構築されたモジュラー設計

![mva CLI Screenshot](https://raw.githubusercontent.com/yuis-ice/mva/main/screenshot.png)

## はじめに

前回の記事では[mvaの基本的な使い方](./mva-introduction.md)を紹介しました。今回は、mva（mv-archive）の内部アーキテクチャに焦点を当て、TypeScriptで構築されたモジュラー設計の詳細を解説します。

## アーキテクチャ概要

mvaは以下の4つの主要コンポーネントで構成されています：

```
src/
├── index.ts                    # CLI エントリーポイント
├── config/
│   └── ConfigManager.ts        # 設定管理
└── services/
    ├── ArchiveService.ts       # アーカイブ・圧縮処理
    └── WatchService.ts         # ファイル監視・スケジューリング
```

### 責任分離の原則

各コンポーネントは明確に分離された責任を持ちます：

- **CLI層**: ユーザーインターフェースとコマンド処理
- **設定層**: YAML設定の管理と検証
- **サービス層**: 実際のビジネスロジック実装

## 1. CLI エントリーポイント（index.ts）

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { ConfigManager } from './config/ConfigManager.js';
import { ArchiveService } from './services/ArchiveService.js';
import { WatchService } from './services/WatchService.js';

const program = new Command();

program
  .name('mva')
  .description('Simple file archiving with rclone')
  .version('1.0.0');

// コマンド定義
program
  .command('init')
  .description('Initialize mva configuration')
  .action(async () => {
    // 設定初期化ロジック
  });
```

### 設計のポイント

#### Commander.jsの活用
- 宣言的なコマンド定義
- 自動ヘルプ生成
- 型安全なオプション処理

#### エラーハンドリング戦略
```typescript
.action(async () => {
  try {
    await configManager.initConfig();
    console.log('✅ Configuration initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize:', error.message);
    process.exit(1);
  }
});
```

## 2. ConfigManager - 設定管理の中核

```typescript
export interface DirectoryConfig {
  directory: string;
  at: string;
  format: string;
  compress: string;
  destination: string;
}

export interface Config {
  directories: DirectoryConfig[];
}

export class ConfigManager {
  private configPath: string;

  constructor() {
    this.configPath = path.join(os.homedir(), '.mva', 'config.yml');
  }

  async loadConfig(): Promise<Config> {
    if (!await fs.pathExists(this.configPath)) {
      throw new Error('Configuration not found. Run "mva init" first.');
    }

    const content = await fs.readFile(this.configPath, 'utf-8');
    const config = yaml.load(content) as Config;
    
    this.validateConfig(config);
    return config;
  }
}
```

### 型安全性の確保

#### インターフェース定義
- `DirectoryConfig`: 監視ディレクトリの設定
- `Config`: 全体設定の型定義
- TypeScriptによるコンパイル時型チェック

#### 設定検証機能
```typescript
private validateConfig(config: Config): void {
  if (!config.directories || !Array.isArray(config.directories)) {
    throw new Error('Invalid configuration: directories must be an array');
  }

  for (const dir of config.directories) {
    if (!dir.directory || !dir.destination) {
      throw new Error('Invalid directory configuration');
    }
  }
}
```

### YAML設定の利点

- **人間が読みやすい**: JSONより直感的
- **コメント対応**: 設定の説明を記述可能
- **階層構造**: ネストした設定の自然な表現

## 3. ArchiveService - ファイル処理の核心

```typescript
export class ArchiveService {
  async archiveFile(filePath: string, config: DirectoryConfig): Promise<void> {
    const archiveName = this.generateArchiveName(filePath, config.format);
    const archivePath = path.join(path.dirname(filePath), archiveName);

    // 圧縮処理
    if (config.compress === 'tar.gz') {
      await this.createTarGz(filePath, archivePath);
    }

    // rcloneアップロード
    await this.uploadToRclone(archivePath, config.destination);

    // クリーンアップ
    await fs.remove(filePath);
    await fs.remove(archivePath);
  }

  private async createTarGz(sourcePath: string, targetPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(targetPath);
      const archive = tar.create({ gzip: true }, [sourcePath]);
      
      archive.pipe(output);
      output.on('close', resolve);
      output.on('error', reject);
    });
  }
}
```

### 非同期処理の設計

#### Promise-based API
- async/awaitによる可読性の向上
- エラーハンドリングの統一
- リソースの適切なクリーンアップ

#### ストリーム処理
```typescript
private async uploadToRclone(filePath: string, destination: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const rclone = spawn('rclone', ['copy', filePath, destination]);
    
    rclone.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`rclone exited with code ${code}`));
      }
    });
  });
}
```

### ファイル名テンプレート機能

```typescript
private generateArchiveName(filePath: string, format: string): string {
  const fileName = path.basename(filePath, path.extname(filePath));
  const ext = path.extname(filePath).slice(1);
  const humanTime = new Date().toISOString().replace(/[:.]/g, '-');
  
  return format
    .replace('{filename}', fileName)
    .replace('{ext}', ext)
    .replace('{humanTime}', humanTime)
    .replace('{timestamp}', Date.now().toString());
}
```

## 4. WatchService - リアルタイム監視システム

```typescript
export class WatchService {
  private watchers: chokidar.FSWatcher[] = [];
  private cronJobs: ScheduledTask[] = [];

  async start(): Promise<void> {
    const config = await this.configManager.loadConfig();

    for (const dirConfig of config.directories) {
      // ファイル監視の開始
      this.startWatching(dirConfig);
      
      // Cronジョブの設定
      this.scheduleCronJob(dirConfig);
    }
  }

  private startWatching(config: DirectoryConfig): void {
    const watcher = chokidar.watch(config.directory, {
      ignored: /(^|[\/\\])\../,
      persistent: true
    });

    watcher.on('add', (filePath) => {
      this.handleFileAdded(filePath, config);
    });

    this.watchers.push(watcher);
  }
}
```

### イベントドリブン設計

#### chokidarによるファイル監視
- 効率的なファイルシステムイベント処理
- クロスプラットフォーム対応
- フィルタリング機能による性能最適化

#### node-cronによるスケジューリング
```typescript
private scheduleCronJob(config: DirectoryConfig): void {
  const task = cron.schedule(config.at, async () => {
    await this.processDirectoryFiles(config);
  }, {
    scheduled: false,
    timezone: 'Asia/Tokyo'
  });

  task.start();
  this.cronJobs.push(task);
}
```

### リソース管理

```typescript
async stop(): Promise<void> {
  // ファイル監視の停止
  for (const watcher of this.watchers) {
    await watcher.close();
  }
  this.watchers = [];

  // Cronジョブの停止
  for (const job of this.cronJobs) {
    job.stop();
  }
  this.cronJobs = [];
}
```

## TypeScript活用のベストプラクティス

### 1. 厳密な型定義

```typescript
// 設定用の型定義
export interface DirectoryConfig {
  readonly directory: string;
  readonly at: string;
  readonly format: string;
  readonly compress: 'tar.gz' | 'zip';
  readonly destination: string;
}
```

### 2. エラーハンドリングの型安全性

```typescript
class ConfigurationError extends Error {
  constructor(message: string, public readonly path?: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}
```

### 3. 適切なモジュール分割

```typescript
// ESModules形式でのexport/import
export { ConfigManager } from './config/ConfigManager.js';
export { ArchiveService } from './services/ArchiveService.js';
export { WatchService } from './services/WatchService.js';
```

## パフォーマンス最適化

### 1. 非同期処理の最適化

```typescript
// 並列処理による効率化
async processDirectoryFiles(config: DirectoryConfig): Promise<void> {
  const files = await fs.readdir(config.directory);
  
  await Promise.all(
    files.map(file => 
      this.archiveService.archiveFile(
        path.join(config.directory, file), 
        config
      )
    )
  );
}
```

### 2. メモリ効率的なストリーム処理

- 大きなファイルでもメモリ使用量を抑制
- バックプレッシャー制御
- ガベージコレクション効率の向上

## まとめ

mvaのアーキテクチャは以下の設計原則に基づいています：

- **単一責任**: 各クラスが明確な責任を持つ
- **依存性注入**: テスタブルな設計
- **型安全性**: TypeScriptによる静的型チェック
- **非同期設計**: Node.jsの特性を活かした効率的処理
- **エラーハンドリング**: 堅牢性を重視した例外処理

この設計により、拡張性と保守性を両立したCLIツールを実現しています。

GitHubリポジトリ: [yuis-ice/mva](https://github.com/yuis-ice/mva)

---

**シリーズ記事**
- [mvaの基本的な使い方](./mva-introduction.md)
- [rcloneとの連携パターン詳細](./mva-rclone-integration.md)

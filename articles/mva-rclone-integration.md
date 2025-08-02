---
title: "mvaとrcloneの連携パターン詳細 - クラウドストレージを自動化する実践テクニック"
tags: [rclone, cloud-storage, automation, backup, DevOps]
private: false
---

# mvaとrcloneの連携パターン詳細 - クラウドストレージを自動化する実践テクニック

![mva CLI Screenshot](https://raw.githubusercontent.com/yuis-ice/mva/main/screenshot.png)

## はじめに

[mvaの基本的な使い方](./mva-introduction.md)と[内部アーキテクチャ](./mva-architecture.md)を解説してきましたが、今回はmvaとrcloneの連携パターンに特化して詳しく解説します。

rcloneは50以上のクラウドストレージサービスに対応した強力なツールです。mvaはこのrcloneの機能を活用して、シームレスなクラウドアーカイブを実現しています。

## rclone基本設定

### 1. rcloneのインストール

```bash
# macOS
brew install rclone

# Ubuntu/Debian
sudo apt install rclone

# Windows
winget install Rclone.Rclone
```

### 2. 主要クラウドサービスの設定例

#### Google Drive設定

```bash
rclone config
# 1. 新しいリモートを作成
# 2. 名前: gdrive
# 3. Storage: Google Drive (15)
# 4. client_id: (空白でEnter)
# 5. client_secret: (空白でEnter)
# 6. scope: drive (1)
# 7. ブラウザでの認証を完了
```

#### Amazon S3設定

```bash
rclone config
# 1. 新しいリモートを作成
# 2. 名前: s3
# 3. Storage: Amazon S3 (4)
# 4. provider: AWS (1)
# 5. access_key_id: YOUR_ACCESS_KEY
# 6. secret_access_key: YOUR_SECRET_KEY
# 7. region: ap-northeast-1
```

#### Microsoft OneDrive設定

```bash
rclone config
# 1. 新しいリモートを作成
# 2. 名前: onedrive
# 3. Storage: Microsoft OneDrive (23)
# 4. client_id: (空白でEnter)
# 5. client_secret: (空白でEnter)
# 6. ブラウザでの認証を完了
```

## mvaの設定パターン

### 1. 単一クラウドサービス構成

最もシンプルな設定：

```yaml
# ~/.mva/config.yml
directories:
  - directory: "/srv/mva/gdrive"
    at: "0 2 * * *"  # 毎日午前2時
    format: "{humanTime}-{filename}.{ext}"
    compress: "tar.gz"
    destination: "gdrive:archive"
```

### 2. マルチクラウド構成

複数のクラウドサービスに分散：

```yaml
directories:
  - directory: "/srv/mva/documents"
    at: "0 2 * * *"
    format: "docs-{humanTime}-{filename}.{ext}"
    compress: "tar.gz"
    destination: "gdrive:documents"
    
  - directory: "/srv/mva/media"
    at: "0 3 * * *"
    format: "media-{humanTime}-{filename}.{ext}"
    compress: "tar.gz"
    destination: "s3:my-bucket/media"
    
  - directory: "/srv/mva/logs"
    at: "0 1 * * *"
    format: "logs-{timestamp}-{filename}.{ext}"
    compress: "tar.gz"
    destination: "onedrive:logs"
```

### 3. 階層型ストレージ構成

重要度に応じた配置：

```yaml
directories:
  # 重要データ：複数箇所にバックアップ
  - directory: "/srv/mva/critical"
    at: "0 * * * *"  # 毎時
    format: "critical-{humanTime}-{filename}.{ext}"
    compress: "tar.gz"
    destination: "gdrive:critical-backup"
    
  # 通常データ：日次バックアップ
  - directory: "/srv/mva/normal"
    at: "0 2 * * *"  # 毎日午前2時
    format: "{humanTime}-{filename}.{ext}"
    compress: "tar.gz"
    destination: "s3:normal-backup"
    
  # アーカイブデータ：週次バックアップ
  - directory: "/srv/mva/archive"
    at: "0 2 * * 0"  # 毎週日曜日午前2時
    format: "weekly-{humanTime}-{filename}.{ext}"
    compress: "tar.gz"
    destination: "glacier:long-term-archive"
```

## rclone連携の内部実装

### 1. サブプロセス管理

```typescript
// ArchiveService.ts
private async uploadToRclone(filePath: string, destination: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const rclone = spawn('rclone', [
      'copy',
      filePath,
      destination,
      '--progress',
      '--stats-one-line',
      '--stats', '5s'
    ]);

    let output = '';
    
    rclone.stdout.on('data', (data) => {
      output += data.toString();
      // プログレス情報をリアルタイム表示
      console.log(data.toString().trim());
    });

    rclone.stderr.on('data', (data) => {
      console.error('rclone error:', data.toString());
    });

    rclone.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Upload completed successfully');
        resolve();
      } else {
        reject(new Error(`rclone exited with code ${code}`));
      }
    });
  });
}
```

### 2. 高度なrcloneオプション

```typescript
private buildRcloneCommand(filePath: string, destination: string, options?: RcloneOptions): string[] {
  const baseCommand = ['rclone', 'copy', filePath, destination];
  
  if (options?.bandwidth) {
    baseCommand.push('--bwlimit', options.bandwidth);
  }
  
  if (options?.encryption) {
    baseCommand.push('--crypt-password', options.encryption);
  }
  
  if (options?.checksum) {
    baseCommand.push('--checksum');
  }
  
  if (options?.retries) {
    baseCommand.push('--retries', options.retries.toString());
  }
  
  return baseCommand;
}
```

### 3. エラーハンドリングとリトライ機能

```typescript
private async uploadWithRetry(
  filePath: string, 
  destination: string, 
  maxRetries: number = 3
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await this.uploadToRclone(filePath, destination);
      return; // 成功時は即座にreturn
    } catch (error) {
      console.log(`❌ Upload attempt ${attempt} failed: ${error.message}`);
      
      if (attempt === maxRetries) {
        throw new Error(`Upload failed after ${maxRetries} attempts`);
      }
      
      // 指数バックオフ
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`⏳ Retrying in ${delay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

## 実践的な運用パターン

### 1. 開発環境でのログ管理

```yaml
directories:
  - directory: "/var/log/application"
    at: "0 */6 * * *"  # 6時間おき
    format: "app-logs-{humanTime}.tar.gz"
    compress: "tar.gz"
    destination: "s3:logs-bucket/application"
    
  - directory: "/var/log/nginx"
    at: "0 2 * * *"  # 毎日午前2時
    format: "nginx-{humanTime}.tar.gz"
    compress: "tar.gz"
    destination: "s3:logs-bucket/nginx"
```

### 2. データベースバックアップ自動化

```bash
#!/bin/bash
# データベースダンプとmvaの組み合わせ

# PostgreSQLバックアップ
pg_dump mydb > /srv/mva/database/mydb-$(date +%Y%m%d).sql

# MySQLバックアップ
mysqldump mydb > /srv/mva/database/mydb-$(date +%Y%m%d).sql

# mvaが自動的にクラウドにアップロード
```

対応する設定：

```yaml
directories:
  - directory: "/srv/mva/database"
    at: "0 1 * * *"  # 毎日午前1時
    format: "db-backup-{humanTime}-{filename}.{ext}"
    compress: "tar.gz"
    destination: "gdrive:database-backups"
```

### 3. 写真・動画の自動アーカイブ

```yaml
directories:
  - directory: "/srv/mva/photos"
    at: "0 3 * * *"  # 毎日午前3時
    format: "photos-{humanTime}-{filename}.{ext}"
    compress: "tar.gz"
    destination: "gdrive:personal/photos"
    
  - directory: "/srv/mva/videos"
    at: "0 4 * * 0"  # 毎週日曜日午前4時
    format: "videos-{humanTime}-{filename}.{ext}"
    compress: "tar.gz"
    destination: "s3:media-bucket/videos"
```

## パフォーマンス最適化

### 1. 帯域幅制限

```typescript
// 業務時間中は帯域幅を制限
const currentHour = new Date().getHours();
const bandwidth = (currentHour >= 9 && currentHour <= 17) ? '1M' : '10M';

const rcloneOptions = {
  bandwidth,
  checksum: true,
  retries: 3
};
```

### 2. 並列アップロード制御

```typescript
// 同時アップロード数の制限
private uploadQueue: Promise<void>[] = [];
private readonly MAX_CONCURRENT_UPLOADS = 3;

async queueUpload(filePath: string, destination: string): Promise<void> {
  if (this.uploadQueue.length >= this.MAX_CONCURRENT_UPLOADS) {
    await Promise.race(this.uploadQueue);
  }
  
  const uploadPromise = this.uploadToRclone(filePath, destination)
    .finally(() => {
      const index = this.uploadQueue.indexOf(uploadPromise);
      if (index > -1) {
        this.uploadQueue.splice(index, 1);
      }
    });
  
  this.uploadQueue.push(uploadPromise);
  return uploadPromise;
}
```

### 3. デデュプリケーション

```typescript
// ファイルハッシュによる重複チェック
private async calculateHash(filePath: string): Promise<string> {
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(filePath);
  
  for await (const chunk of stream) {
    hash.update(chunk);
  }
  
  return hash.digest('hex');
}

private async isDuplicate(filePath: string, destination: string): Promise<boolean> {
  const hash = await this.calculateHash(filePath);
  
  // rclone hashcheckコマンドで重複チェック
  try {
    const result = await this.runRcloneCommand([
      'hashsum', 'sha256', destination,
      '--include', `*${hash}*`
    ]);
    
    return result.stdout.trim().length > 0;
  } catch {
    return false;
  }
}
```

## セキュリティ考慮事項

### 1. 暗号化設定

```yaml
directories:
  - directory: "/srv/mva/sensitive"
    at: "0 2 * * *"
    format: "encrypted-{humanTime}-{filename}.{ext}"
    compress: "tar.gz"
    destination: "crypt:secure-storage"  # rclone cryptで暗号化
```

rclone暗号化設定：

```bash
rclone config
# Storage: Encrypt/Decrypt a remote (10)
# remote: gdrive:sensitive-data
# filename_encryption: standard (1)
# directory_name_encryption: true (1)
# password: [強力なパスワード]
```

### 2. アクセス制御

```typescript
// アップロード前のファイル権限チェック
private async checkFilePermissions(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    const mode = stats.mode & parseInt('777', 8);
    
    // ワールド読み取り可能なファイルは警告
    if (mode & parseInt('004', 8)) {
      console.warn(`⚠️ File ${filePath} is world-readable`);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Cannot access file ${filePath}: ${error.message}`);
    return false;
  }
}
```

## 監視とログ

### 1. アップロード状況の監視

```typescript
// アップロード統計の記録
private uploadStats = {
  totalFiles: 0,
  totalSize: 0,
  successCount: 0,
  failureCount: 0
};

private async logUploadResult(filePath: string, success: boolean, size: number): Promise<void> {
  this.uploadStats.totalFiles++;
  this.uploadStats.totalSize += size;
  
  if (success) {
    this.uploadStats.successCount++;
  } else {
    this.uploadStats.failureCount++;
  }
  
  // 統計をファイルに保存
  const logEntry = {
    timestamp: new Date().toISOString(),
    filePath,
    success,
    size,
    stats: { ...this.uploadStats }
  };
  
  await fs.appendFile(
    path.join(os.homedir(), '.mva', 'upload.log'),
    JSON.stringify(logEntry) + '\n'
  );
}
```

### 2. 容量監視とアラート

```typescript
// ストレージ容量の監視
private async checkStorageQuota(destination: string): Promise<void> {
  try {
    const result = await this.runRcloneCommand(['about', destination]);
    const about = JSON.parse(result.stdout);
    
    const usedPercentage = (about.used / about.total) * 100;
    
    if (usedPercentage > 90) {
      console.warn(`⚠️ Storage ${destination} is ${usedPercentage.toFixed(1)}% full`);
      // アラート送信ロジック
    }
  } catch (error) {
    console.error(`Failed to check storage quota: ${error.message}`);
  }
}
```

## まとめ

mvaとrcloneの連携により、以下のような高度なクラウドアーカイブシステムを構築できます：

- **マルチクラウド対応**: 50以上のストレージサービスに対応
- **自動化**: ファイル移動だけでアーカイブ開始
- **スケーラビリティ**: 大量ファイルの効率的な処理
- **セキュリティ**: 暗号化とアクセス制御
- **監視**: 詳細なログとアラート機能

これらの機能により、個人利用から企業レベルの運用まで幅広く対応できる堅牢なバックアップソリューションを実現しています。

GitHubリポジトリ: [yuis-ice/mva](https://github.com/yuis-ice/mva)

---

**シリーズ記事**
- [mvaの基本的な使い方](./mva-introduction.md)
- [mvaの内部アーキテクチャ解説](./mva-architecture.md)

---
title: "Detailed mva-rclone Integration Patterns - Practical Techniques for Cloud Storage Automation"
tags: [rclone, cloud-storage, automation, backup, DevOps]
private: false
---

# Detailed mva-rclone Integration Patterns - Practical Techniques for Cloud Storage Automation

![mva CLI Screenshot](https://raw.githubusercontent.com/yuis-ice/mva/main/screenshot.png)

## Introduction

After covering [basic usage of mva](./mva-introduction-en.md) and [internal architecture](./mva-architecture-en.md), this article focuses specifically on detailed integration patterns between mva and rclone.

rclone is a powerful tool that supports over 50 cloud storage services. mva leverages rclone's capabilities to achieve seamless cloud archiving.

## Basic rclone Setup

### 1. Installing rclone

```bash
# macOS
brew install rclone

# Ubuntu/Debian
sudo apt install rclone

# Windows
winget install Rclone.Rclone
```

### 2. Major Cloud Service Configuration Examples

#### Google Drive Setup

```bash
rclone config
# 1. Create new remote
# 2. Name: gdrive
# 3. Storage: Google Drive (15)
# 4. client_id: (blank and Enter)
# 5. client_secret: (blank and Enter)
# 6. scope: drive (1)
# 7. Complete browser authentication
```

#### Amazon S3 Setup

```bash
rclone config
# 1. Create new remote
# 2. Name: s3
# 3. Storage: Amazon S3 (4)
# 4. provider: AWS (1)
# 5. access_key_id: YOUR_ACCESS_KEY
# 6. secret_access_key: YOUR_SECRET_KEY
# 7. region: ap-northeast-1
```

#### Microsoft OneDrive Setup

```bash
rclone config
# 1. Create new remote
# 2. Name: onedrive
# 3. Storage: Microsoft OneDrive (23)
# 4. client_id: (blank and Enter)
# 5. client_secret: (blank and Enter)
# 6. Complete browser authentication
```

## mva Configuration Patterns

### 1. Single Cloud Service Configuration

The simplest setup:

```yaml
# ~/.mva/config.yml
directories:
  - directory: "/srv/mva/gdrive"
    at: "0 2 * * *"  # Daily at 2 AM
    format: "{humanTime}-{filename}.{ext}"
    compress: "tar.gz"
    destination: "gdrive:archive"
```

### 2. Multi-Cloud Configuration

Distributed across multiple cloud services:

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

### 3. Hierarchical Storage Configuration

Placement based on importance:

```yaml
directories:
  # Critical data: Backup to multiple locations
  - directory: "/srv/mva/critical"
    at: "0 * * * *"  # Every hour
    format: "critical-{humanTime}-{filename}.{ext}"
    compress: "tar.gz"
    destination: "gdrive:critical-backup"
    
  # Normal data: Daily backup
  - directory: "/srv/mva/normal"
    at: "0 2 * * *"  # Daily at 2 AM
    format: "{humanTime}-{filename}.{ext}"
    compress: "tar.gz"
    destination: "s3:normal-backup"
    
  # Archive data: Weekly backup
  - directory: "/srv/mva/archive"
    at: "0 2 * * 0"  # Every Sunday at 2 AM
    format: "weekly-{humanTime}-{filename}.{ext}"
    compress: "tar.gz"
    destination: "glacier:long-term-archive"
```

## Internal Implementation of rclone Integration

### 1. Subprocess Management

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
      // Real-time progress display
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

### 2. Advanced rclone Options

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

### 3. Error Handling and Retry Functionality

```typescript
private async uploadWithRetry(
  filePath: string, 
  destination: string, 
  maxRetries: number = 3
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await this.uploadToRclone(filePath, destination);
      return; // Return immediately on success
    } catch (error) {
      console.log(`❌ Upload attempt ${attempt} failed: ${error.message}`);
      
      if (attempt === maxRetries) {
        throw new Error(`Upload failed after ${maxRetries} attempts`);
      }
      
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`⏳ Retrying in ${delay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

## Practical Operation Patterns

### 1. Log Management in Development Environment

```yaml
directories:
  - directory: "/var/log/application"
    at: "0 */6 * * *"  # Every 6 hours
    format: "app-logs-{humanTime}.tar.gz"
    compress: "tar.gz"
    destination: "s3:logs-bucket/application"
    
  - directory: "/var/log/nginx"
    at: "0 2 * * *"  # Daily at 2 AM
    format: "nginx-{humanTime}.tar.gz"
    compress: "tar.gz"
    destination: "s3:logs-bucket/nginx"
```

### 2. Database Backup Automation

```bash
#!/bin/bash
# Combination of database dump and mva

# PostgreSQL backup
pg_dump mydb > /srv/mva/database/mydb-$(date +%Y%m%d).sql

# MySQL backup
mysqldump mydb > /srv/mva/database/mydb-$(date +%Y%m%d).sql

# mva automatically uploads to cloud
```

Corresponding configuration:

```yaml
directories:
  - directory: "/srv/mva/database"
    at: "0 1 * * *"  # Daily at 1 AM
    format: "db-backup-{humanTime}-{filename}.{ext}"
    compress: "tar.gz"
    destination: "gdrive:database-backups"
```

### 3. Automatic Photo/Video Archiving

```yaml
directories:
  - directory: "/srv/mva/photos"
    at: "0 3 * * *"  # Daily at 3 AM
    format: "photos-{humanTime}-{filename}.{ext}"
    compress: "tar.gz"
    destination: "gdrive:personal/photos"
    
  - directory: "/srv/mva/videos"
    at: "0 4 * * 0"  # Every Sunday at 4 AM
    format: "videos-{humanTime}-{filename}.{ext}"
    compress: "tar.gz"
    destination: "s3:media-bucket/videos"
```

## Performance Optimization

### 1. Bandwidth Limiting

```typescript
// Limit bandwidth during business hours
const currentHour = new Date().getHours();
const bandwidth = (currentHour >= 9 && currentHour <= 17) ? '1M' : '10M';

const rcloneOptions = {
  bandwidth,
  checksum: true,
  retries: 3
};
```

### 2. Parallel Upload Control

```typescript
// Limit concurrent uploads
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

### 3. Deduplication

```typescript
// Duplicate check by file hash
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
  
  // Check duplicates with rclone hashcheck command
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

## Security Considerations

### 1. Encryption Settings

```yaml
directories:
  - directory: "/srv/mva/sensitive"
    at: "0 2 * * *"
    format: "encrypted-{humanTime}-{filename}.{ext}"
    compress: "tar.gz"
    destination: "crypt:secure-storage"  # Encrypt with rclone crypt
```

rclone encryption setup:

```bash
rclone config
# Storage: Encrypt/Decrypt a remote (10)
# remote: gdrive:sensitive-data
# filename_encryption: standard (1)
# directory_name_encryption: true (1)
# password: [strong password]
```

### 2. Access Control

```typescript
// Check file permissions before upload
private async checkFilePermissions(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    const mode = stats.mode & parseInt('777', 8);
    
    // Warn for world-readable files
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

## Monitoring and Logging

### 1. Upload Status Monitoring

```typescript
// Record upload statistics
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
  
  // Save statistics to file
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

### 2. Storage Capacity Monitoring and Alerts

```typescript
// Monitor storage capacity
private async checkStorageQuota(destination: string): Promise<void> {
  try {
    const result = await this.runRcloneCommand(['about', destination]);
    const about = JSON.parse(result.stdout);
    
    const usedPercentage = (about.used / about.total) * 100;
    
    if (usedPercentage > 90) {
      console.warn(`⚠️ Storage ${destination} is ${usedPercentage.toFixed(1)}% full`);
      // Alert sending logic
    }
  } catch (error) {
    console.error(`Failed to check storage quota: ${error.message}`);
  }
}
```

## Summary

The integration of mva and rclone enables building advanced cloud archiving systems with the following features:

- **Multi-cloud support**: Compatible with 50+ storage services
- **Automation**: Archive initiation with simple file movement
- **Scalability**: Efficient processing of large file volumes
- **Security**: Encryption and access control
- **Monitoring**: Detailed logging and alert features

These capabilities realize a robust backup solution that can handle everything from personal use to enterprise-level operations.

GitHub Repository: [yuis-ice/mva](https://github.com/yuis-ice/mva)

---

**Series Articles**
- [Basic usage of mva](./mva-introduction-en.md)
- [mva Internal Architecture Deep Dive](./mva-architecture-en.md)

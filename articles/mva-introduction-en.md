---
title: "mva: Cloud Archive with Simple File Movement - Innovative Backup CLI using rclone"
tags: [TypeScript, rclone, CLI, backup, archiving]
private: false
---

# mva: Cloud Archive with Simple File Movement - Innovative Backup CLI using rclone

![mva CLI Screenshot](https://raw.githubusercontent.com/yuis-ice/mva/main/screenshot.png)

## Introduction

Cloud backup and archiving operations are often complex and time-consuming tasks. mva (mv-archive) is a TypeScript/Node.js CLI tool that fundamentally simplifies this process.

**Core Idea**: Simply move files to specific directories, and compression, archiving, and cloud uploading are automatically executed.

```bash
# This alone starts automatic archiving
mv document.pdf /srv/mva/gdrive/
mv backup.tar.gz /srv/mva/azure/archive/
```

## Features of mva

### 🎯 Minimal Cognitive Load
- No need to remember complex commands
- Archive initiation with simple `mv` commands
- Intuitive operations for cloud storage uploads

### ⚡ Bandwidth Optimization
- Efficient cloud uploads via rclone
- Automatic file compression (tar.gz)
- Incremental upload support

### 🛡️ Safety-First
- Safe file movement and archiving
- Configurable compression options
- Error handling and logging features

## Installation

```bash
npm install -g mva
```

Install directly from GitHub:
```bash
git clone https://github.com/yuis-ice/mva.git
cd mva
npm install
npm run build
npm link
```

## Basic Usage

### 1. Initial Setup

```bash
mva init
```

This creates `~/.mva/config.yml`:

```yaml
directories:
  - directory: "/srv/mva/gdrive"
    at: "0 2 * * *"  # Daily at 2 AM
    format: "{humanTime}-{filename}.{ext}"
    compress: "tar.gz"
    destination: "gdrive:archive"
```

### 2. Create Watch Directories

```bash
mva setup-directories
```

### 3. Start Watch Service

```bash
mva start
```

### 4. Archive Files

Simply move files to watch directories:

```bash
mv important-data.pdf /srv/mva/gdrive/
# → Automatically starts compression and upload
```

## Technical Architecture

### Core Components

#### ConfigManager
- YAML configuration file management
- Configuration validation and default values
- Read/write operations for `~/.mva/config.yml`

#### ArchiveService
- File compression (tar.gz)
- rclone process management
- Filename template processing

#### WatchService
- Real-time file monitoring with chokidar
- Scheduled execution with node-cron
- Event-driven file processing

### Dependencies

```json
{
  "commander": "CLI framework",
  "js-yaml": "YAML configuration parsing",
  "chokidar": "File system watching",
  "node-cron": "Cron scheduling",
  "tar": "File compression",
  "fs-extra": "Enhanced file operations"
}
```

## Configuration Options Details

### Directory Configuration

```yaml
directories:
  - directory: "/srv/mva/gdrive"      # Watch target directory
    at: "0 2 * * *"                   # Cron format schedule
    format: "{humanTime}-{filename}.{ext}"  # Archive filename format
    compress: "tar.gz"                # Compression format
    destination: "gdrive:archive"     # rclone destination
```

### Filename Templates

- `{humanTime}`: Human-readable time format
- `{filename}`: Original filename
- `{ext}`: File extension
- `{timestamp}`: UNIX timestamp

## rclone Integration

mva launches rclone subprocesses for cloud uploads. Prior rclone configuration is required:

```bash
# Google Drive configuration example
rclone config
# → Configure Google Drive with name "gdrive"

# Verify configuration
rclone listremotes
```

## Practical Use Cases

### Daily Backup Workflow

```bash
# Backup daily documents to Google Drive
mv ~/Documents/daily-report.pdf /srv/mva/gdrive/

# Weekly backup to Azure Storage
mv ~/backups/week-backup.tar.gz /srv/mva/azure/
```

### Development Environment Log Archiving

```bash
# Auto-archive application logs
mv /var/log/app/app.log /srv/mva/s3/logs/
```

## Summary

mva revolutionarily simplifies traditional backup and archiving work:

- **Simple**: Archive initiation with just `mv` command
- **Efficient**: Optimized uploads via rclone
- **Safe**: Automatic compression and error handling
- **Flexible**: High customizability through YAML configuration

GitHub Repository: [yuis-ice/mva](https://github.com/yuis-ice/mva)

Please give it a try! We welcome feedback and contributions.

---

**Related Articles**
- [mva Internal Architecture Deep Dive](./mva-architecture-en.md)
- [Detailed rclone Integration Patterns](./mva-rclone-integration-en.md)

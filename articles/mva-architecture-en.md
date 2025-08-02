---
title: "mva Internal Architecture Deep Dive - Modular Design Built with TypeScript"
tags: [TypeScript, architecture, design-patterns, Node.js, CLI]
private: false
---

# mva Internal Architecture Deep Dive - Modular Design Built with TypeScript

![mva CLI Screenshot](https://raw.githubusercontent.com/yuis-ice/mva/main/screenshot.png)

## Introduction

In the previous article, we introduced [basic usage of mva](./mva-introduction-en.md). This time, we'll focus on mva's internal architecture and dive deep into the modular design built with TypeScript.

## Architecture Overview

mva consists of four main components:

```
src/
├── index.ts                    # CLI entry point
├── config/
│   └── ConfigManager.ts        # Configuration management
└── services/
    ├── ArchiveService.ts       # Archive & compression processing
    └── WatchService.ts         # File watching & scheduling
```

### Separation of Concerns

Each component has clearly separated responsibilities:

- **CLI Layer**: User interface and command processing
- **Configuration Layer**: YAML configuration management and validation
- **Service Layer**: Actual business logic implementation

## 1. CLI Entry Point (index.ts)

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

// Command definitions
program
  .command('init')
  .description('Initialize mva configuration')
  .action(async () => {
    // Configuration initialization logic
  });
```

### Design Points

#### Leveraging Commander.js
- Declarative command definitions
- Automatic help generation
- Type-safe option processing

#### Error Handling Strategy
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

## 2. ConfigManager - Core of Configuration Management

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

### Ensuring Type Safety

#### Interface Definitions
- `DirectoryConfig`: Watch directory configuration
- `Config`: Overall configuration type definition
- Compile-time type checking with TypeScript

#### Configuration Validation
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

### Benefits of YAML Configuration

- **Human-readable**: More intuitive than JSON
- **Comment support**: Can describe configuration
- **Hierarchical structure**: Natural representation of nested settings

## 3. ArchiveService - Core of File Processing

```typescript
export class ArchiveService {
  async archiveFile(filePath: string, config: DirectoryConfig): Promise<void> {
    const archiveName = this.generateArchiveName(filePath, config.format);
    const archivePath = path.join(path.dirname(filePath), archiveName);

    // Compression processing
    if (config.compress === 'tar.gz') {
      await this.createTarGz(filePath, archivePath);
    }

    // rclone upload
    await this.uploadToRclone(archivePath, config.destination);

    // Cleanup
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

### Asynchronous Processing Design

#### Promise-based API
- Improved readability with async/await
- Unified error handling
- Proper resource cleanup

#### Stream Processing
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

### Filename Template Feature

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

## 4. WatchService - Real-time Monitoring System

```typescript
export class WatchService {
  private watchers: chokidar.FSWatcher[] = [];
  private cronJobs: ScheduledTask[] = [];

  async start(): Promise<void> {
    const config = await this.configManager.loadConfig();

    for (const dirConfig of config.directories) {
      // Start file watching
      this.startWatching(dirConfig);
      
      // Setup cron jobs
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

### Event-Driven Design

#### File Watching with chokidar
- Efficient file system event processing
- Cross-platform support
- Performance optimization through filtering

#### Scheduling with node-cron
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

### Resource Management

```typescript
async stop(): Promise<void> {
  // Stop file watching
  for (const watcher of this.watchers) {
    await watcher.close();
  }
  this.watchers = [];

  // Stop cron jobs
  for (const job of this.cronJobs) {
    job.stop();
  }
  this.cronJobs = [];
}
```

## TypeScript Best Practices

### 1. Strict Type Definitions

```typescript
// Configuration type definitions
export interface DirectoryConfig {
  readonly directory: string;
  readonly at: string;
  readonly format: string;
  readonly compress: 'tar.gz' | 'zip';
  readonly destination: string;
}
```

### 2. Type-Safe Error Handling

```typescript
class ConfigurationError extends Error {
  constructor(message: string, public readonly path?: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}
```

### 3. Proper Module Division

```typescript
// ESModules format export/import
export { ConfigManager } from './config/ConfigManager.js';
export { ArchiveService } from './services/ArchiveService.js';
export { WatchService } from './services/WatchService.js';
```

## Performance Optimization

### 1. Asynchronous Processing Optimization

```typescript
// Efficiency through parallel processing
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

### 2. Memory-Efficient Stream Processing

- Suppressed memory usage even for large files
- Backpressure control
- Improved garbage collection efficiency

## Summary

mva's architecture is based on these design principles:

- **Single Responsibility**: Each class has clear responsibilities
- **Dependency Injection**: Testable design
- **Type Safety**: Static type checking with TypeScript
- **Asynchronous Design**: Efficient processing leveraging Node.js characteristics
- **Error Handling**: Robust exception handling focusing on resilience

This design achieves a CLI tool that balances extensibility and maintainability.

GitHub Repository: [yuis-ice/mva](https://github.com/yuis-ice/mva)

---

**Series Articles**
- [Basic usage of mva](./mva-introduction-en.md)
- [Detailed rclone integration patterns](./mva-rclone-integration-en.md)

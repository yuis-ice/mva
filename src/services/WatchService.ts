import * as chokidar from 'chokidar';
import * as cron from 'node-cron';
import * as fs from 'fs-extra';
import * as path from 'path';
import { MvaConfig, DirectoryConfig } from '../types';
import { ArchiveService } from './ArchiveService';

export class WatchService {
  private config: MvaConfig;
  private archiveService: ArchiveService;
  private watchers: chokidar.FSWatcher[] = [];
  private cronJobs: cron.ScheduledTask[] = [];
  private isRunning = false;

  constructor(config: MvaConfig) {
    this.config = config;
    this.archiveService = new ArchiveService(config);
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Watch service is already running');
    }

    console.log('🔍 Starting file watchers...');
    
    // Test rclone connections first
    for (const dirConfig of this.config.directories) {
      const isConnected = await this.archiveService.testRcloneConnection(dirConfig.destination);
      if (!isConnected) {
        console.warn(`⚠️  Could not connect to ${dirConfig.destination}. Files will be queued.`);
      }
    }

    // Create watch directories if they don't exist
    for (const dirConfig of this.config.directories) {
      await fs.ensureDir(dirConfig.directory);
      
      // Set up file watcher for immediate processing
      const watcher = chokidar.watch(dirConfig.directory, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
        ignoreInitial: false,
        depth: 0 // only watch direct children
      });

      watcher.on('add', (filePath) => {
        this.handleFileAdded(filePath, dirConfig);
      });

      watcher.on('error', (error) => {
        console.error(`❌ Watcher error for ${dirConfig.directory}:`, error);
      });

      this.watchers.push(watcher);

      // Set up cron job for scheduled processing
      const cronJob = cron.schedule(dirConfig.at, async () => {
        await this.processDirectoryFiles(dirConfig);
      }, {
        timezone: 'America/New_York' // You can make this configurable
      });

      this.cronJobs.push(cronJob);

      console.log(`👀 Watching: ${dirConfig.directory} (schedule: ${dirConfig.at})`);
    }

    this.isRunning = true;
    console.log('✅ mva daemon is running');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping file watchers...');

    // Close all watchers
    for (const watcher of this.watchers) {
      await watcher.close();
    }
    this.watchers = [];

    // Stop all cron jobs
    for (const job of this.cronJobs) {
      job.stop();
    }
    this.cronJobs = [];

    this.isRunning = false;
    console.log('✅ mva daemon stopped');
  }

  private async handleFileAdded(filePath: string, dirConfig: DirectoryConfig): Promise<void> {
    try {
      // Wait a bit to ensure file is completely written
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if file still exists and is not being written to
      if (!(await fs.pathExists(filePath))) {
        return;
      }

      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        return; // Ignore directories
      }

      // Double-check file is not being written (size should be stable)
      await new Promise(resolve => setTimeout(resolve, 500));
      const newStats = await fs.stat(filePath);
      if (newStats.size !== stats.size) {
        // File is still being written, skip for now
        return;
      }

      console.log(`📁 New file detected: ${filePath}`);
      await this.archiveService.archiveFile(filePath, dirConfig);
      
    } catch (error) {
      console.error(`❌ Failed to process file ${filePath}:`, error);
    }
  }

  private async processDirectoryFiles(dirConfig: DirectoryConfig): Promise<void> {
    try {
      console.log(`⏰ Scheduled processing for ${dirConfig.directory}`);
      
      const files = await fs.readdir(dirConfig.directory);
      const filesToProcess: string[] = [];

      for (const file of files) {
        const filePath = path.join(dirConfig.directory, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile()) {
          filesToProcess.push(filePath);
        }
      }

      if (filesToProcess.length === 0) {
        console.log(`📂 No files to process in ${dirConfig.directory}`);
        return;
      }

      console.log(`📦 Processing ${filesToProcess.length} files from ${dirConfig.directory}`);
      
      for (const filePath of filesToProcess) {
        try {
          await this.archiveService.archiveFile(filePath, dirConfig);
        } catch (error) {
          console.error(`❌ Failed to archive ${filePath}:`, error);
        }
      }
      
    } catch (error) {
      console.error(`❌ Failed to process directory ${dirConfig.directory}:`, error);
    }
  }

  getStatus(): { isRunning: boolean; watchedDirectories: number; activeJobs: number } {
    return {
      isRunning: this.isRunning,
      watchedDirectories: this.watchers.length,
      activeJobs: this.cronJobs.length
    };
  }
}

#!/usr/bin/env node

import { Command } from 'commander';
import { ConfigManager } from './config/ConfigManager';
import { ArchiveService } from './services/ArchiveService';
import { WatchService } from './services/WatchService';
import path from 'path';
import fs from 'fs-extra';

const program = new Command();

program
  .name('mva')
  .description('mv-archive - rclone backup/archiving simpler, efficient, and graceful')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize mva configuration')
  .action(async () => {
    try {
      const configManager = new ConfigManager();
      await configManager.initConfig();
      console.log('✅ mva configuration initialized at ~/.mva/config.yml');
    } catch (error) {
      console.error('❌ Failed to initialize config:', error);
      process.exit(1);
    }
  });

program
  .command('start')
  .description('Start the mva daemon to watch configured directories')
  .action(async () => {
    try {
      const configManager = new ConfigManager();
      const config = await configManager.loadConfig();
      const watchService = new WatchService(config);
      
      console.log('🚀 Starting mva daemon...');
      await watchService.start();
      
      // Keep the process running
      process.on('SIGINT', async () => {
        console.log('\n🛑 Stopping mva daemon...');
        await watchService.stop();
        process.exit(0);
      });
      
    } catch (error) {
      console.error('❌ Failed to start daemon:', error);
      process.exit(1);
    }
  });

program
  .command('archive <files...>')
  .description('Manually archive files to a configured destination')
  .option('-d, --destination <destination>', 'destination name from config')
  .action(async (files: string[], options) => {
    try {
      const configManager = new ConfigManager();
      const config = await configManager.loadConfig();
      const archiveService = new ArchiveService(config);
      
      if (!options.destination) {
        console.error('❌ Please specify a destination with -d option');
        process.exit(1);
      }
      
      const destination = config.directories.find(dir => dir.destination === options.destination);
      if (!destination) {
        console.error(`❌ Destination '${options.destination}' not found in config`);
        process.exit(1);
      }
      
      for (const file of files) {
        const absolutePath = path.resolve(file);
        if (await fs.pathExists(absolutePath)) {
          await archiveService.archiveFile(absolutePath, destination);
          console.log(`✅ Archived: ${file}`);
        } else {
          console.error(`❌ File not found: ${file}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to archive files:', error);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show mva configuration and status')
  .action(async () => {
    try {
      const configManager = new ConfigManager();
      const config = await configManager.loadConfig();
      
      console.log('📋 mva Configuration:');
      console.log(`Config file: ${configManager.getConfigPath()}`);
      console.log('\nDirectories:');
      
      for (const dir of config.directories) {
        console.log(`  • ${dir.directory}`);
        console.log(`    Schedule: ${dir.at}`);
        console.log(`    Format: ${dir.format}`);
        console.log(`    Compression: ${dir.compress}`);
        console.log(`    Destination: ${dir.destination}`);
        console.log('');
      }
      
    } catch (error) {
      console.error('❌ Failed to show status:', error);
      process.exit(1);
    }
  });

// Handle mva directory creation
program
  .command('setup-directories')
  .description('Create mva watch directories based on config')
  .action(async () => {
    try {
      const configManager = new ConfigManager();
      const config = await configManager.loadConfig();
      
      for (const dir of config.directories) {
        const watchDir = dir.directory;
        await fs.ensureDir(watchDir);
        console.log(`✅ Created watch directory: ${watchDir}`);
      }
      
    } catch (error) {
      console.error('❌ Failed to setup directories:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);

import * as fs from 'fs-extra';
import * as path from 'path';
import * as tar from 'tar';
import { spawn } from 'child_process';
import { MvaConfig, DirectoryConfig, ArchiveFile } from '../types';

export class ArchiveService {
  private config: MvaConfig;

  constructor(config: MvaConfig) {
    this.config = config;
  }

  async archiveFile(filePath: string, dirConfig: DirectoryConfig): Promise<void> {
    const fileInfo = await this.getFileInfo(filePath);
    const archiveName = this.generateArchiveName(fileInfo, dirConfig.format);
    const tempDir = path.join('/tmp', 'mva', Date.now().toString());
    
    try {
      // Create temporary directory
      await fs.ensureDir(tempDir);
      
      // Copy file to temp directory with archive name
      const tempFilePath = path.join(tempDir, path.basename(filePath));
      await fs.copy(filePath, tempFilePath);
      
      let finalArchivePath: string;
      
      // Compress if needed
      if (dirConfig.compress === 'tar.gz') {
        finalArchivePath = path.join(tempDir, `${archiveName}.tar.gz`);
        await this.createTarGz(tempFilePath, finalArchivePath);
        // Remove the original file from temp
        await fs.remove(tempFilePath);
      } else if (dirConfig.compress === 'none') {
        finalArchivePath = path.join(tempDir, archiveName);
        await fs.move(tempFilePath, finalArchivePath);
      } else {
        throw new Error(`Unsupported compression format: ${dirConfig.compress}`);
      }
      
      // Upload to rclone destination
      await this.uploadToRclone(finalArchivePath, dirConfig.destination);
      
      // Remove original file
      await fs.remove(filePath);
      
      console.log(`✅ Archived ${filePath} to ${dirConfig.destination}`);
      
    } finally {
      // Clean up temp directory
      await fs.remove(tempDir);
    }
  }

  private async getFileInfo(filePath: string): Promise<ArchiveFile> {
    const stats = await fs.stat(filePath);
    const parsedPath = path.parse(filePath);
    
    return {
      originalPath: filePath,
      filename: parsedPath.name,
      extension: parsedPath.ext,
      size: stats.size,
      timestamp: new Date()
    };
  }

  private generateArchiveName(fileInfo: ArchiveFile, format: string): string {
    const humanTime = this.formatHumanTime(fileInfo.timestamp);
    
    return format
      .replace('{humanTime}', humanTime)
      .replace('{filename}', fileInfo.filename)
      .replace('{ext}', fileInfo.extension.replace('.', ''))
      .replace('{timestamp}', fileInfo.timestamp.getTime().toString())
      .replace('{date}', fileInfo.timestamp.toISOString().split('T')[0])
      .replace('{time}', fileInfo.timestamp.toTimeString().split(' ')[0].replace(/:/g, '-'));
  }

  private formatHumanTime(date: Date): string {
    return date.toISOString()
      .replace(/T/, '_')
      .replace(/:/g, '-')
      .replace(/\..+/, '');
  }

  private async createTarGz(sourcePath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      tar.create(
        {
          gzip: true,
          file: outputPath,
          cwd: path.dirname(sourcePath)
        },
        [path.basename(sourcePath)]
      )
      .then(() => resolve())
      .catch(reject);
    });
  }

  private async uploadToRclone(localPath: string, destination: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const rcloneArgs = ['copy', localPath, destination];
      const rclone = spawn('rclone', rcloneArgs, {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      rclone.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      rclone.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      rclone.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`rclone failed with code ${code}: ${stderr}`));
        }
      });

      rclone.on('error', (error) => {
        reject(new Error(`Failed to spawn rclone: ${error.message}`));
      });
    });
  }

  async testRcloneConnection(destination: string): Promise<boolean> {
    try {
      await new Promise((resolve, reject) => {
        const rclone = spawn('rclone', ['lsd', destination], {
          stdio: ['ignore', 'pipe', 'pipe']
        });

        rclone.on('close', (code) => {
          if (code === 0) {
            resolve(void 0);
          } else {
            reject(new Error(`rclone test failed with code ${code}`));
          }
        });

        rclone.on('error', (error) => {
          reject(error);
        });
      });
      
      return true;
    } catch (error) {
      console.warn(`⚠️  rclone test failed for ${destination}:`, error);
      return false;
    }
  }
}

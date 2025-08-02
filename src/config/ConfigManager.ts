import * as yaml from 'js-yaml';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { MvaConfig } from '../types';

export class ConfigManager {
  private configPath: string;

  constructor() {
    this.configPath = path.join(os.homedir(), '.mva', 'config.yml');
  }

  getConfigPath(): string {
    return this.configPath;
  }

  async initConfig(): Promise<void> {
    const configDir = path.dirname(this.configPath);
    await fs.ensureDir(configDir);

    if (await fs.pathExists(this.configPath)) {
      throw new Error('Configuration file already exists');
    }

    const defaultConfig: MvaConfig = {
      directories: [
        {
          directory: '/srv/mva/gdrive',
          at: '0 2 * * *', // Daily at 2 AM
          format: '{humanTime}-{filename}.{ext}',
          compress: 'tar.gz',
          destination: 'gdrive:archive'
        },
        {
          directory: '/srv/mva/azure/archive',
          at: '0 3 * * *', // Daily at 3 AM
          format: '{humanTime}-{filename}.{ext}',
          compress: 'tar.gz',
          destination: 'azure:backup'
        }
      ]
    };

    const yamlStr = yaml.dump(defaultConfig, { 
      indent: 2,
      lineWidth: -1
    });
    
    await fs.writeFile(this.configPath, yamlStr, 'utf8');
  }

  async loadConfig(): Promise<MvaConfig> {
    if (!(await fs.pathExists(this.configPath))) {
      throw new Error('Configuration file not found. Run "mva init" to create it.');
    }

    const configContent = await fs.readFile(this.configPath, 'utf8');
    const config = yaml.load(configContent) as MvaConfig;

    // Validate configuration
    this.validateConfig(config);

    return config;
  }

  async saveConfig(config: MvaConfig): Promise<void> {
    this.validateConfig(config);
    
    const yamlStr = yaml.dump(config, { 
      indent: 2,
      lineWidth: -1
    });
    
    await fs.writeFile(this.configPath, yamlStr, 'utf8');
  }

  private validateConfig(config: MvaConfig): void {
    if (!config || !config.directories || !Array.isArray(config.directories)) {
      throw new Error('Invalid configuration: missing directories array');
    }

    for (const dir of config.directories) {
      if (!dir.directory || !dir.at || !dir.format || !dir.compress || !dir.destination) {
        throw new Error(`Invalid directory configuration: ${JSON.stringify(dir)}`);
      }

      // Basic cron format validation
      const cronParts = dir.at.split(' ');
      if (cronParts.length !== 5) {
        throw new Error(`Invalid cron format: ${dir.at}`);
      }
    }
  }
}

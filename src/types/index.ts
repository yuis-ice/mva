export interface DirectoryConfig {
  directory: string;
  at: string; // cron format
  format: string; // e.g., "{humanTime}-{filename}.{ext}"
  compress: string; // e.g., "tar.gz"
  destination: string; // rclone remote name
}

export interface MvaConfig {
  directories: DirectoryConfig[];
}

export interface ArchiveFile {
  originalPath: string;
  filename: string;
  extension: string;
  size: number;
  timestamp: Date;
}

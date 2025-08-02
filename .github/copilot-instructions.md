<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# mva (mv-archive) CLI Application

This is a TypeScript/Node.js CLI application for simplified rclone backup and archiving.

## Key Concepts

- **Safety**: Files are safely moved and archived with compression
- **Bandwidth optimized**: Uses rclone for efficient cloud uploads
- **Cognitive load minimized**: Simple `mv` operations to trigger archiving

## Architecture

- **ConfigManager**: Handles YAML configuration file at `~/.mva/config.yml`
- **ArchiveService**: Manages file compression (tar.gz) and rclone uploads
- **WatchService**: Monitors directories with file watchers and cron scheduling
- **CLI Interface**: Commander.js-based CLI with multiple commands

## Configuration Format

```yaml
directories:
  - directory: "/srv/mva/gdrive"
    at: "0 2 * * *"  # cron format
    format: "{humanTime}-{filename}.{ext}"
    compress: "tar.gz"
    destination: "gdrive:archive"
```

## Usage Pattern

Users simply move files to watched directories:
```bash
mv document.pdf /srv/mva/gdrive/
mv backup.tar.gz /srv/mva/azure/archive/
```

## Dependencies

- `commander`: CLI framework
- `js-yaml`: YAML configuration parsing
- `chokidar`: File system watching
- `node-cron`: Cron scheduling
- `tar`: File compression
- `fs-extra`: Enhanced file operations

## rclone Integration

The application spawns rclone processes to upload files to configured cloud destinations. Ensure rclone is installed and configured on the system.

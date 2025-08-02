# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-08-02

### Added
- Initial release of mva (mv-archive) CLI tool
- TypeScript/Node.js CLI with Commander.js framework
- YAML configuration management at `~/.mva/config.yml`
- File watching with chokidar for real-time monitoring
- Cron scheduling with node-cron for batch processing
- File compression support (tar.gz)
- rclone integration for cloud uploads
- Comprehensive CLI commands:
  - `mva init` - Initialize configuration
  - `mva start` - Start daemon for watching directories
  - `mva archive` - Manual archiving with destination selection
  - `mva status` - Show configuration and status
  - `mva setup-directories` - Create watch directories
- Template-based filename formatting with placeholders:
  - `{humanTime}` - ISO timestamp
  - `{filename}` - Original filename
  - `{ext}` - File extension
  - `{timestamp}` - Unix timestamp
  - `{date}` - Date in YYYY-MM-DD format
  - `{time}` - Time in HH-MM-SS format
- Complete GitHub repository structure:
  - Issue templates for bugs and feature requests
  - Pull request template with CLA
  - Contributing guidelines with development setup
  - Comprehensive documentation and examples
- VS Code integration:
  - Debug launch configurations
  - Build and run tasks
  - TypeScript support
- Demo files and screenshot for documentation

### Features
- **Safety**: Files are safely moved and archived with compression
- **Bandwidth optimized**: Uses rclone for efficient cloud transfers
- **Cognitive load minimized**: Simple `mv` operations trigger archiving
- **Multiple destinations**: Support for different cloud providers
- **Flexible scheduling**: Cron-based batch processing
- **Real-time processing**: Immediate file handling on detection
- **Error handling**: Comprehensive error reporting and validation
- **Configuration validation**: YAML schema validation and helpful error messages

### Technical Details
- Built with TypeScript for type safety and better development experience
- Modular architecture with separate services for different concerns
- Comprehensive test coverage preparation
- Cross-platform compatibility (Linux, macOS, Windows with WSL)
- Node.js 16+ requirement
- rclone dependency for cloud operations

[1.0.0]: https://github.com/yuis-ice/mva/releases/tag/v1.0.0

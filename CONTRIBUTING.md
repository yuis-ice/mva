# Contributing to mva

Thank you for your interest in contributing to mva! We welcome contributions from the community and are excited to see what you'll bring to the project.

## 🚀 Getting Started

### Development Setup
1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/mva.git
   cd mva
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Test your setup**
   ```bash
   npm run dev -- --help
   ```

### Prerequisites
- Node.js 16 or higher
- npm or yarn
- rclone installed and configured
- TypeScript knowledge for code contributions

## 📝 How to Contribute

### Reporting Issues
- Use the [issue templates](../../issues/new/choose)
- Search existing issues first
- Provide detailed reproduction steps
- Include system information and versions

### Suggesting Features
- Use the feature request template
- Explain the use case and benefit
- Consider backward compatibility
- Be open to discussion and iteration

### Code Contributions

#### Types of Contributions
- 🐛 **Bug fixes** - Fix issues in existing functionality
- ✨ **New features** - Add new commands or capabilities
- 📚 **Documentation** - Improve docs, examples, or comments
- 🔧 **Refactoring** - Improve code quality without changing behavior
- ⚡ **Performance** - Optimize existing functionality
- 🧪 **Tests** - Add or improve test coverage

#### Development Workflow
1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```

2. **Make your changes**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed
   - Ensure all tests pass

3. **Test thoroughly**
   ```bash
   npm run build
   npm test
   # Test CLI commands manually
   node dist/index.js --help
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new archive format support"
   ```

5. **Push and create a pull request**
   ```bash
   git push origin your-branch-name
   ```

## 📋 Code Standards

### TypeScript Guidelines
- Use TypeScript strict mode
- Provide proper type annotations
- Follow existing patterns and interfaces
- Use meaningful variable and function names

### Code Style
- Use 2 spaces for indentation
- Use semicolons
- Use single quotes for strings
- Follow existing patterns in the codebase

### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `refactor:` for code refactoring
- `test:` for test additions/changes
- `chore:` for maintenance tasks

### Testing
- Add tests for new functionality
- Ensure existing tests continue to pass
- Test CLI commands manually
- Test with different rclone configurations

## 🏗️ Project Structure

```
src/
├── index.ts              # CLI entry point
├── types/                # TypeScript interfaces
├── config/               # Configuration management
└── services/             # Core business logic
    ├── ArchiveService.ts # File compression and rclone
    └── WatchService.ts   # File watching and scheduling
```

### Key Components
- **ConfigManager**: Handles YAML configuration parsing and validation
- **ArchiveService**: Manages file compression and rclone uploads
- **WatchService**: Monitors directories and schedules processing
- **CLI Interface**: Commander.js-based command-line interface

## 🧪 Testing Guidelines

### Manual Testing
- Test all CLI commands
- Verify file watching functionality
- Test with various file types and sizes
- Test compression and upload workflows
- Verify error handling

### Test Coverage
- Unit tests for core functions
- Integration tests for workflows
- CLI command testing
- Configuration validation testing

## 📚 Documentation

### What to Document
- New CLI commands or options
- Configuration changes
- Breaking changes
- Migration guides
- Examples and use cases

### Documentation Locations
- **README.md** - Main documentation
- **CLI help text** - Command descriptions
- **Code comments** - Complex logic explanations
- **CHANGELOG.md** - Version history

## 🤝 Community Guidelines

### Code of Conduct
- Be respectful and inclusive
- Help others learn and grow
- Provide constructive feedback
- Focus on what's best for the community

### Communication
- Use GitHub Issues for bugs and features
- Use GitHub Discussions for questions and ideas
- Be patient and helpful in responses
- Keep discussions on topic

## Contributor License Agreement (CLA)

By submitting a pull request or contribution, you agree to the following:

> You grant the project founder a **non-exclusive, irrevocable, worldwide, royalty-free license** to use, modify, sublicense, and relicense your contribution, including the right to incorporate it into dual-licensed or commercial versions of the project.

This ensures that the project can grow sustainably while preserving creator rights.

If you are contributing on behalf of a company or organization, please contact us in advance.

## 🎯 Priority Areas

We're particularly interested in contributions in these areas:
- Additional compression formats
- New rclone features integration
- Performance optimizations
- Better error handling and logging
- Cross-platform compatibility improvements
- Documentation and examples

## ❓ Getting Help

- 💬 [GitHub Discussions](../../discussions) - Ask questions
- 📖 [Documentation](../README.md) - Read the docs
- 🐛 [Issues](../../issues) - Report problems
- 📧 Contact maintainers for sensitive topics

## 🙏 Recognition

Contributors will be:
- Listed in the project README
- Mentioned in release notes
- Credited in relevant documentation
- Invited to join the maintainer team (for significant contributions)

Thank you for making mva better for everyone! 🚀

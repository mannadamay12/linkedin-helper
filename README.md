# LinkedIn Connection Helper

A browser extension that automates personalized connection messages on LinkedIn with intelligent profile detection and message customization.

## Overview

This extension detects LinkedIn profile information and automatically generates contextual connection messages. It includes a configuration interface for customizing personal information, message templates, and extension behavior.

## Features

- Automatic name and profile detection from LinkedIn pages
- Role-based message templates (engineers, recruiters, general professionals)
- Custom template creation and management
- Configurable personal information for message personalization
- Robust error handling with fallback strategies
- Memory management and resource cleanup
- Adaptive DOM detection resilient to LinkedIn UI changes
- Multi-template system for different connection scenarios

## Quick Start

### For Users

1. **Download the latest release** from the [Releases page](https://github.com/Sachin9082/linkedin-helper/releases)
2. **Extract the ZIP file** to a folder on your computer
3. **Open Chrome** and navigate to `chrome://extensions/`
4. **Enable "Developer mode"** in the top right
5. **Click "Load unpacked"** and select the extracted folder
6. **Navigate to LinkedIn** and start using the extension!

### For Developers

```bash
# Clone the repository
git clone https://github.com/Sachin1801/linkedin-helper.git
cd linkedin-helper

# Install dependencies
npm install

# Build for development
npm run build:dev

# Build for production
npm run build:prod

# Validate the extension
npm run validate

# Create a new release
npm run release patch  # or minor, major
```

## Development Setup

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Sachin1801/linkedin-helper.git
   cd linkedin-helper
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build:dev
   ```

4. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/` folder

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Build extension (development mode) |
| `npm run build:dev` | Build with development optimizations |
| `npm run build:prod` | Build with production optimizations |
| `npm run validate` | Validate extension files |
| `npm run clean` | Clean build artifacts |
| `npm run release <type>` | Create a new release (patch/minor/major) |

## Build System

The extension uses a comprehensive build system that:

- **Minifies code** for production builds
- **Validates files** for common issues
- **Generates icons** automatically
- **Creates distribution packages**
- **Updates version numbers** across files

### Build Process

1. **Validation**: Checks for common issues and security concerns
2. **Processing**: Minifies JavaScript and CSS, optimizes assets
3. **Packaging**: Creates ZIP files for distribution
4. **Versioning**: Updates version numbers in all relevant files

### Production Build

```bash
npm run build:prod
```

This creates an optimized build in the `dist/` folder with:
- Minified JavaScript and CSS
- Removed console.log statements
- Optimized assets
- Production-ready manifest

## Distribution

### Private Distribution

For private distribution through GitHub:

1. **Create a release**
   ```bash
   npm run release patch  # or minor, major
   ```

2. **Push to GitHub**
   ```bash
   git push origin main --tags
   ```

3. **GitHub Actions** will automatically:
   - Build the extension
   - Create a GitHub release
   - Upload distribution files
   - Generate release notes

### Manual Distribution

1. **Build the extension**
   ```bash
   npm run build:prod
   ```

2. **Distribute the `dist/` folder** or the generated ZIP file

### Chrome Web Store (Optional)

To publish to the Chrome Web Store:

1. **Build for production**
   ```bash
   npm run build:prod
   ```

2. **Create a ZIP file**
   ```bash
   npm run zip
   ```

3. **Upload to Chrome Web Store Developer Dashboard**

## Architecture

The extension uses a modular architecture with the following components:

- **Core Infrastructure**: Memory management, operation queuing, error boundaries
- **DOM Layer**: Element detection and LinkedIn-specific operations  
- **Data Layer**: Configuration storage and template processing
- **Application Layer**: Event handling and business logic
- **Build System**: Automated build, validation, and distribution

## File Structure

```
linkedin-helper/
├── manifest.json           # Extension configuration
├── content.js              # Main content script
├── popup.html              # Configuration interface
├── popup.css               # Interface styling
├── popup.js                # Configuration logic
├── icon.png                # Extension icon
├── package.json            # Build configuration
├── scripts/                # Build scripts
│   ├── build.js           # Main build script
│   ├── release.js         # Release management
│   ├── validate.js        # File validation
│   ├── clean.js           # Cleanup script
│   └── create-icon.js     # Icon generation
├── .github/workflows/      # GitHub Actions
│   ├── build.yml          # Build workflow
│   └── release.yml        # Release workflow
├── dist/                   # Build output (generated)
└── README.md              # Documentation
```

## Configuration

Click the extension icon to access the configuration panel with three sections:

- **Personal Info**: Your name, title, background, university, and contact details
- **Templates**: Default and custom message templates with variable substitution
- **Settings**: Extension preferences and data management options

## Usage

### New Connection Requests

1. Navigate to a LinkedIn profile
2. Click "Connect" on the profile
3. Click "Add a note" in the connection modal
4. The extension automatically detects profile information and inserts a personalized message
5. Review and send the connection request

### Messaging After Connection

1. Open a LinkedIn message thread
2. Click the ✉️ button (appears on messaging pages)
3. Or use keyboard shortcut: `Ctrl+Shift+M` (Cmd+Shift+M on Mac)
4. The extension inserts a template message
5. Review and send

## Technical Details

- **Version**: 5.0.0
- **Manifest**: Version 3
- **Permissions**: activeTab, storage
- **Target**: https://www.linkedin.com/*
- **Architecture**: Modular content script with popup interface
- **Build System**: Node.js-based with minification and optimization

## Development

The extension includes debug utilities accessible via browser console:

- `liHelperDebug.getResourceStats()` - Memory usage monitoring
- `liHelperDebug.getResilientStats()` - DOM detection performance
- `liHelperStorage.getConfig()` - Current configuration
- `liHelperTemplates.list()` - Available templates

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Add validation for new features
- Update documentation for changes
- Test thoroughly before submitting

## Privacy

- All processing occurs locally in the browser
- No external server communication
- Data stored locally using Chrome storage API
- Only operates on LinkedIn domains

## License

This project is for educational purposes. Use responsibly and in accordance with LinkedIn's terms of service.

## Support

For issues and questions:
- Create an issue on GitHub
- Check the [Releases page](https://github.com/Sachin1801/linkedin-helper/releases) for updates
- Review the configuration guide in the extension popup

## Changelog

### v5.0.0
- Enhanced build system with automated releases
- Improved template system with multiple message types
- Better error handling and user feedback
- Production-ready distribution pipeline

### v4.0.0
- Multi-template system for different scenarios
- Improved profile detection
- Enhanced messaging interface support
- Better performance and memory management

### v3.0.0
- Modular architecture redesign
- Enhanced configuration interface
- Improved LinkedIn UI compatibility
- Better error recovery mechanisms
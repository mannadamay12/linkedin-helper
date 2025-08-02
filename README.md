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

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension folder
5. The extension icon will appear in your browser toolbar

## Configuration

Click the extension icon to access the configuration panel with three sections:

- **Personal Info**: Your name, title, background, university, and contact details
- **Templates**: Default and custom message templates with variable substitution
- **Settings**: Extension preferences and data management options

## Usage

1. Navigate to a LinkedIn profile
2. Click "Connect" on the profile
3. Click "Add a note" in the connection modal
4. The extension automatically detects profile information and inserts a personalized message
5. Review and send the connection request

## Architecture

The extension uses a modular architecture with the following components:

- **Core Infrastructure**: Memory management, operation queuing, error boundaries
- **DOM Layer**: Element detection and LinkedIn-specific operations  
- **Data Layer**: Configuration storage and template processing
- **Application Layer**: Event handling and business logic

## File Structure

```
linkedin-helper/
├── manifest.json       # Extension configuration
├── content.js          # Main content script with modular architecture
├── popup.html          # Configuration interface
├── popup.css           # Interface styling
├── popup.js            # Configuration logic
├── icon.png            # Extension icon
└── README.md           # Documentation
```

## Technical Details

- **Version**: 3.2
- **Manifest**: Version 3
- **Permissions**: activeTab, storage
- **Target**: https://www.linkedin.com/*
- **Architecture**: Modular content script with popup interface

## Development

The extension includes debug utilities accessible via browser console:

- `liHelperDebug.getResourceStats()` - Memory usage monitoring
- `liHelperDebug.getResilientStats()` - DOM detection performance
- `liHelperStorage.getConfig()` - Current configuration
- `liHelperTemplates.list()` - Available templates

## Privacy

- All processing occurs locally in the browser
- No external server communication
- Data stored locally using Chrome storage API
- Only operates on LinkedIn domains

## License

This project is for educational purposes. Use responsibly and in accordance with LinkedIn's terms of service.
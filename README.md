# LinkedIn Connection Helper

A Chrome extension that automatically personalizes connection request messages on LinkedIn based on the recipient's profile information.

## Features

- **Smart Name Detection**: Automatically detects the recipient's name from LinkedIn's connection modal
- **Role & Company Recognition**: Extracts professional information to personalize messages
- **Contextual Templates**: Different message templates for engineers, recruiters, and other professionals
- **Fallback Support**: Manual name entry option if automatic detection fails
- **Visual Feedback**: Success/error notifications and highlighted message insertion
- **Debug Mode**: Console logging for troubleshooting

## Installation

### Method 1: Load as Unpacked Extension (Development)

1. Clone or download this repository to your local machine
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" button
5. Select the folder containing this extension's files
6. The extension icon should appear in your Chrome toolbar

### Method 2: Install from ZIP

1. Download the extension as a ZIP file
2. Extract the ZIP to a folder on your computer
3. Follow steps 2-6 from Method 1 above

## How to Use

1. Navigate to LinkedIn and go to someone's profile
2. Click the "Connect" button
3. When the connection modal appears, click "Add a note"
4. The extension will automatically:
   - Detect the person's name, role, and company
   - Insert a personalized message based on their profile
   - Show a success notification

## Message Templates

The extension uses different templates based on the recipient's role:

- **Engineers/Developers**: Focuses on learning about their technical journey
- **Recruiters/Hiring Managers**: Emphasizes job opportunities and skills fit
- **General Professionals**: Asks about work culture and career insights
- **Default**: A friendly connection request for when role detection fails

## Troubleshooting

- **Name not detected**: The extension will prompt you to enter the name manually
- **Message not inserted**: Check the browser console for error messages
- **Extension not working**: Ensure you're on linkedin.com and the extension is enabled

## Privacy & Security

- This extension works entirely in your browser
- No data is sent to external servers
- Only modifies content on linkedin.com domains

## Technical Details

- **Manifest Version**: 3
- **Permissions**: activeTab, scripting
- **Content Script**: Runs at document_idle
- **Supported URLs**: https://www.linkedin.com/*

## File Structure

```
linkedin-helper/
├── manifest.json       # Extension configuration
├── icon.png           # Extension icon (128x128)
├── content.js         # Main content script
└── README.md          # This file
```

## Contributing

Feel free to fork this repository and submit pull requests for improvements!

## License

This project is for educational purposes. Please use responsibly and in accordance with LinkedIn's terms of service.
# Deployment Guide

This guide walks you through deploying the LinkedIn Connection Helper extension for private distribution through GitHub.

## Prerequisites

- Node.js 16+ installed
- Git configured with GitHub access
- GitHub repository set up
- Chrome browser for testing

## Quick Deployment

### 1. Initial Setup

```bash
# Clone your repository (if not already done)
git clone https://github.com/Sachin1801/linkedin-helper.git
cd linkedin-helper

# Install dependencies
npm install

# Test the build system
npm run validate
npm run build:prod
```

### 2. Create Your First Release

```bash
# Create a patch release (increments patch version)
npm run release patch

# Or create a minor release (increments minor version)
npm run release minor

# Or create a major release (increments major version)
npm run release major
```

### 3. Push to GitHub

```bash
# Push changes and tags to GitHub
git push origin main --tags
```

### 4. Verify Release

1. Go to your GitHub repository
2. Click on "Releases" in the right sidebar
3. Verify the new release was created automatically
4. Download the extension files from the release

## Detailed Deployment Process

### Step 1: Prepare Your Repository

1. **Update package.json** with your repository information:
   ```json
   {
     "repository": {
       "type": "git",
       "url": "https://github.com/Sachin1801/linkedin-helper.git"
     }
   }
   ```

2. **Configure GitHub Actions** (already included):
   - `.github/workflows/build.yml` - Builds and tests on push/PR
   - `.github/workflows/release.yml` - Creates releases on tag push

3. **Set up branch protection** (recommended):
   - Go to repository Settings → Branches
   - Add rule for `main` branch
   - Require status checks to pass before merging

### Step 2: Development Workflow

```bash
# Make your changes
# ...

# Test locally
npm run validate
npm run build:dev

# Load in Chrome for testing
# chrome://extensions/ → Load unpacked → select dist/ folder

# Commit changes
git add .
git commit -m "feat: add new feature"

# Push to GitHub
git push origin main
```

### Step 3: Release Process

#### Automated Release (Recommended)

```bash
# Create a new release
npm run release patch  # or minor, major

# This will:
# 1. Bump version in package.json and manifest.json
# 2. Build the extension
# 3. Create a git tag
# 4. Generate release notes
# 5. Commit changes

# Push to GitHub (triggers automated release)
git push origin main --tags
```

#### Manual Release

```bash
# Build for production
npm run build:prod

# Create and push tag manually
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

### Step 4: Distribution

#### Private Distribution

1. **GitHub Releases**: Users can download from your repository's releases page
2. **Direct Download**: Share the ZIP file from the release
3. **Repository Clone**: Users can clone and build themselves

#### Installation Instructions for Users

Share these instructions with your users:

1. **Download the extension**:
   - Go to [Releases page](https://github.com/Sachin1801/linkedin-helper/releases)
   - Download the latest `linkedin-helper-vX.X.X.zip`

2. **Extract the files**:
   - Extract the ZIP to a folder on your computer
   - Keep this folder (don't delete it after installation)

3. **Install in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the extracted folder

4. **Start using**:
   - Go to LinkedIn
   - Click "Connect" on profiles
   - The extension will auto-fill personalized messages

## Troubleshooting

### Build Issues

```bash
# Clean and rebuild
npm run clean
npm install
npm run build:prod

# Check for validation errors
npm run validate
```

### GitHub Actions Issues

1. **Check Actions tab** in your repository
2. **Verify secrets** are set up correctly
3. **Check branch protection** rules
4. **Review workflow files** for syntax errors

### Extension Issues

1. **Reload extension** in Chrome
2. **Check console** for errors (F12 → Console)
3. **Verify permissions** in manifest.json
4. **Test on different LinkedIn pages**

## Security Considerations

### Before Distribution

1. **Review permissions** in manifest.json
2. **Test thoroughly** on LinkedIn
3. **Validate code** for security issues
4. **Update dependencies** regularly

### For Users

1. **Verify source** (your GitHub repository)
2. **Review permissions** before installation
3. **Keep updated** with latest releases
4. **Report issues** through GitHub

## Maintenance

### Regular Tasks

1. **Update dependencies**:
   ```bash
   npm update
   npm audit fix
   ```

2. **Test with LinkedIn changes**:
   - LinkedIn updates their UI frequently
   - Test extension after major LinkedIn updates

3. **Monitor issues**:
   - Check GitHub issues
   - Monitor user feedback
   - Update documentation

### Version Management

- **Patch releases** (1.0.1): Bug fixes
- **Minor releases** (1.1.0): New features
- **Major releases** (2.0.0): Breaking changes

## Advanced Configuration

### Custom Builds

```bash
# Development build (with debug info)
npm run build:dev

# Production build (minified)
npm run build:prod

# Custom build with specific options
node scripts/build.js --production --custom-option
```

### Environment Variables

Create `.env` file for custom configuration:

```env
NODE_ENV=production
EXTENSION_NAME="Custom LinkedIn Helper"
BUILD_VERSION=1.0.0
```

### Multiple Distribution Channels

1. **GitHub Releases**: Primary distribution
2. **Chrome Web Store**: Public distribution (optional)
3. **Direct download**: For specific users
4. **Self-hosted**: For enterprise use

## Support

For deployment issues:

1. **Check this guide** for common solutions
2. **Review GitHub Actions logs** for build errors
3. **Test locally** before pushing
4. **Create GitHub issues** for bugs
5. **Update documentation** for new features

## Legal Considerations

- **Terms of Service**: Ensure compliance with LinkedIn's ToS
- **Privacy Policy**: Consider creating one for user data
- **Licensing**: Choose appropriate license for your use case
- **Attribution**: Credit original authors if applicable

#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

class ReleaseManager {
  constructor() {
    this.packagePath = path.join(__dirname, '..', 'package.json');
    this.manifestPath = path.join(__dirname, '..', 'manifest.json');
    this.currentVersion = require(this.packagePath).version;
  }

  async release() {
    try {
      const releaseType = process.argv[2];
      
      if (!releaseType || !['patch', 'minor', 'major'].includes(releaseType)) {
        console.log(chalk.red('❌ Please specify release type: patch, minor, or major'));
        console.log(chalk.gray('Usage: npm run release <patch|minor|major>'));
        process.exit(1);
      }

      console.log(chalk.blue(`🚀 Preparing ${releaseType} release...`));
      console.log(chalk.gray(`Current version: ${this.currentVersion}`));

      // Bump version
      const newVersion = this.bumpVersion(releaseType);
      console.log(chalk.green(`📈 New version: ${newVersion}`));

      // Update package.json
      await this.updatePackageVersion(newVersion);
      
      // Update manifest.json
      await this.updateManifestVersion(newVersion);
      
      // Build the extension
      console.log(chalk.yellow('🔨 Building extension...'));
      execSync('npm run build:prod', { stdio: 'inherit' });
      
      // Create git tag
      await this.createGitTag(newVersion);
      
      // Create release notes
      await this.createReleaseNotes(newVersion, releaseType);
      
      console.log(chalk.green('✅ Release prepared successfully!'));
      console.log(chalk.blue('📝 Next steps:'));
      console.log(chalk.gray('1. Review the changes'));
      console.log(chalk.gray('2. Push to GitHub: git push origin main --tags'));
      console.log(chalk.gray('3. Create a GitHub release with the generated notes'));
      
    } catch (error) {
      console.error(chalk.red('❌ Release failed:'), error);
      process.exit(1);
    }
  }

  bumpVersion(releaseType) {
    const [major, minor, patch] = this.currentVersion.split('.').map(Number);
    
    switch (releaseType) {
      case 'major':
        return `${major + 1}.0.0`;
      case 'minor':
        return `${major}.${minor + 1}.0`;
      case 'patch':
        return `${major}.${minor}.${patch + 1}`;
      default:
        throw new Error(`Invalid release type: ${releaseType}`);
    }
  }

  async updatePackageVersion(newVersion) {
    console.log(chalk.yellow('📦 Updating package.json...'));
    
    const packageJson = await fs.readJson(this.packagePath);
    packageJson.version = newVersion;
    
    await fs.writeJson(this.packagePath, packageJson, { spaces: 2 });
  }

  async updateManifestVersion(newVersion) {
    console.log(chalk.yellow('📄 Updating manifest.json...'));
    
    const manifest = await fs.readJson(this.manifestPath);
    manifest.version = newVersion;
    
    await fs.writeJson(this.manifestPath, manifest, { spaces: 2 });
  }

  async createGitTag(newVersion) {
    console.log(chalk.yellow('🏷️  Creating git tag...'));
    
    try {
      // Add all changes
      execSync('git add .', { stdio: 'inherit' });
      
      // Commit changes
      execSync(`git commit -m "chore: bump version to ${newVersion}"`, { stdio: 'inherit' });
      
      // Create tag
      execSync(`git tag -a v${newVersion} -m "Release v${newVersion}"`, { stdio: 'inherit' });
      
    } catch (error) {
      console.log(chalk.yellow('⚠️  Git operations failed, continuing...'));
    }
  }

  async createReleaseNotes(newVersion, releaseType) {
    console.log(chalk.yellow('📝 Creating release notes...'));
    
    const releaseNotesPath = path.join(__dirname, '..', 'RELEASE_NOTES.md');
    
    const notes = `# Release v${newVersion}

## 🚀 ${releaseType.charAt(0).toUpperCase() + releaseType.slice(1)} Release

### 📦 What's New
- Enhanced LinkedIn profile detection
- Improved message template system
- Better error handling and user feedback
- Performance optimizations

### 🐛 Bug Fixes
- Fixed connection modal detection issues
- Resolved template variable substitution problems
- Improved messaging interface compatibility

### 🔧 Technical Improvements
- Code minification for production builds
- Enhanced build system
- Better memory management
- Improved DOM element detection

### 📋 Installation
1. Download the \`linkedin-helper-v${newVersion}.zip\` file
2. Extract the contents
3. Open Chrome and go to \`chrome://extensions/\`
4. Enable "Developer mode"
5. Click "Load unpacked" and select the extracted folder

### 🔗 Download
- [linkedin-helper-v${newVersion}.zip](./dist/linkedin-helper-v${newVersion}.zip)

---
*Released on ${new Date().toISOString().split('T')[0]}*
`;

    await fs.writeFile(releaseNotesPath, notes);
    console.log(chalk.green(`📝 Release notes created: ${releaseNotesPath}`));
  }
}

// Run the release
const releaseManager = new ReleaseManager();
releaseManager.release();

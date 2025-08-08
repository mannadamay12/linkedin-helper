#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { minify } = require('minify');
const chalk = require('chalk');
const replace = require('replace-in-file');

class ExtensionBuilder {
  constructor() {
    this.isProduction = process.argv.includes('--production');
    this.isDevelopment = process.argv.includes('--development');
    this.buildDir = path.join(__dirname, '..', 'dist');
    this.srcDir = path.join(__dirname, '..');
    this.version = require('../package.json').version;
    
    console.log(chalk.blue(`🔨 Building LinkedIn Connection Helper v${this.version}`));
    console.log(chalk.gray(`Mode: ${this.isProduction ? 'Production' : 'Development'}`));
  }

  async build() {
    try {
      // Clean build directory
      await this.cleanBuildDir();
      
      // Copy and process files
      await this.copyManifest();
      await this.copyAssets();
      await this.processContentScript();
      await this.processPopupFiles();
      await this.createIcons();
      
      // Update version in manifest
      await this.updateVersion();
      
      // Create zip file for distribution
      await this.createZip();
      
      console.log(chalk.green('✅ Build completed successfully!'));
      console.log(chalk.blue(`📦 Extension built in: ${this.buildDir}`));
      
    } catch (error) {
      console.error(chalk.red('❌ Build failed:'), error);
      process.exit(1);
    }
  }

  async cleanBuildDir() {
    console.log(chalk.yellow('🧹 Cleaning build directory...'));
    await fs.remove(this.buildDir);
    await fs.ensureDir(this.buildDir);
  }

  async copyManifest() {
    console.log(chalk.yellow('📄 Processing manifest...'));
    
    const manifestPath = path.join(this.srcDir, 'manifest.json');
    const manifest = await fs.readJson(manifestPath);
    
    // Update version
    manifest.version = this.version;
    
    // Add production-specific settings
    if (this.isProduction) {
      manifest.description = 'LinkedIn Connection Helper - Production Build';
    }
    
    await fs.writeJson(path.join(this.buildDir, 'manifest.json'), manifest, { spaces: 2 });
  }

  async copyAssets() {
    console.log(chalk.yellow('📁 Copying assets...'));
    
    // Copy README
    await fs.copy(
      path.join(this.srcDir, 'README.md'),
      path.join(this.buildDir, 'README.md')
    );
  }

  async processContentScript() {
    console.log(chalk.yellow('📜 Processing content script...'));
    
    const contentPath = path.join(this.srcDir, 'content.js');
    let content = await fs.readFile(contentPath, 'utf8');
    
    if (this.isProduction) {
      // Remove console.log statements in production
      content = content.replace(/console\.log\([^)]*\);?\s*/g, '');
      content = content.replace(/console\.error\([^)]*\);?\s*/g, '');
      
      // Minify the content script
      try {
        content = await minify(content, {
          mangle: true,
          compress: true
        });
      } catch (error) {
        console.log(chalk.yellow('⚠️  Could not minify content script, using original'));
      }
    }
    
    await fs.writeFile(path.join(this.buildDir, 'content.js'), content);
  }

  async processPopupFiles() {
    console.log(chalk.yellow('🪟 Processing popup files...'));
    
    // Process HTML
    let html = await fs.readFile(path.join(this.srcDir, 'popup.html'), 'utf8');
    
    if (this.isProduction) {
      // Remove any debug elements or comments
      html = html.replace(/<!--\s*DEBUG.*?-->/g, '');
    }
    
    await fs.writeFile(path.join(this.buildDir, 'popup.html'), html);
    
    // Process CSS
    let css = await fs.readFile(path.join(this.srcDir, 'popup.css'), 'utf8');
    
    if (this.isProduction) {
      // Minify CSS
      try {
        css = await minify(css, { css: true });
      } catch (error) {
        console.log(chalk.yellow('⚠️  Could not minify CSS, using original'));
      }
    }
    
    await fs.writeFile(path.join(this.buildDir, 'popup.css'), css);
    
    // Process JavaScript
    let js = await fs.readFile(path.join(this.srcDir, 'popup.js'), 'utf8');
    
    if (this.isProduction) {
      // Remove console.log statements
      js = js.replace(/console\.log\([^)]*\);?\s*/g, '');
      js = js.replace(/console\.error\([^)]*\);?\s*/g, '');
      
      // Minify JavaScript
      try {
        js = await minify(js, {
          mangle: true,
          compress: true
        });
      } catch (error) {
        console.log(chalk.yellow('⚠️  Could not minify popup.js, using original'));
      }
    }
    
    await fs.writeFile(path.join(this.buildDir, 'popup.js'), js);
  }

  async createIcons() {
    console.log(chalk.yellow('🎨 Creating icons...'));
    
    // Create a simple SVG icon if none exists
    const iconSvg = `<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0a66c2;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#004182;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="20" fill="url(#grad)"/>
      <text x="64" y="80" font-family="Arial, sans-serif" font-size="60" font-weight="bold" text-anchor="middle" fill="white">🤝</text>
    </svg>`;
    
    // Save as PNG (you'll need to convert this manually or use a library)
    await fs.writeFile(path.join(this.buildDir, 'icon.svg'), iconSvg);
    
    // For now, create a placeholder icon.png
    const placeholderIcon = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    await fs.writeFile(path.join(this.buildDir, 'icon.png'), placeholderIcon);
  }

  async updateVersion() {
    console.log(chalk.yellow('🔢 Updating version information...'));
    
    // Update version in content script
    const contentPath = path.join(this.buildDir, 'content.js');
    let content = await fs.readFile(contentPath, 'utf8');
    
    // Replace version placeholder if it exists
    content = content.replace(/v\d+\.\d+\.\d+/, `v${this.version}`);
    
    await fs.writeFile(contentPath, content);
  }

  async createZip() {
    console.log(chalk.yellow('📦 Creating distribution zip...'));
    
    const archiver = require('archiver');
    const output = fs.createWriteStream(path.join(this.buildDir, `linkedin-helper-v${this.version}.zip`));
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => {
      console.log(chalk.green(`📦 Zip created: ${archive.pointer()} bytes`));
    });
    
    archive.on('error', (err) => {
      throw err;
    });
    
    archive.pipe(output);
    
    // Add all files to zip
    archive.file(path.join(this.buildDir, 'manifest.json'), { name: 'manifest.json' });
    archive.file(path.join(this.buildDir, 'content.js'), { name: 'content.js' });
    archive.file(path.join(this.buildDir, 'popup.html'), { name: 'popup.html' });
    archive.file(path.join(this.buildDir, 'popup.css'), { name: 'popup.css' });
    archive.file(path.join(this.buildDir, 'popup.js'), { name: 'popup.js' });
    archive.file(path.join(this.buildDir, 'icon.png'), { name: 'icon.png' });
    archive.file(path.join(this.buildDir, 'README.md'), { name: 'README.md' });
    
    await archive.finalize();
  }
}

// Run the build
const builder = new ExtensionBuilder();
builder.build();

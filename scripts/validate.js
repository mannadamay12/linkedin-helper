#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

class ExtensionValidator {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    this.errors = [];
    this.warnings = [];
  }

  async validate() {
    console.log(chalk.blue('🔍 Validating extension...'));
    
    try {
      await this.validateManifest();
      await this.validateContentScript();
      await this.validatePopupFiles();
      await this.validateIcons();
      await this.validatePermissions();
      
      this.printResults();
      
    } catch (error) {
      console.error(chalk.red('❌ Validation failed:'), error);
      process.exit(1);
    }
  }

  async validateManifest() {
    console.log(chalk.yellow('📄 Validating manifest.json...'));
    
    const manifestPath = path.join(this.projectRoot, 'manifest.json');
    
    if (!await fs.pathExists(manifestPath)) {
      this.errors.push('manifest.json not found');
      return;
    }
    
    try {
      const manifest = await fs.readJson(manifestPath);
      
      // Check required fields
      const requiredFields = ['manifest_version', 'name', 'version', 'description'];
      for (const field of requiredFields) {
        if (!manifest[field]) {
          this.errors.push(`Missing required field in manifest: ${field}`);
        }
      }
      
      // Check manifest version
      if (manifest.manifest_version !== 3) {
        this.warnings.push('Consider using Manifest V3 for better compatibility');
      }
      
      // Check content scripts
      if (!manifest.content_scripts || manifest.content_scripts.length === 0) {
        this.errors.push('No content scripts defined in manifest');
      }
      
      // Check permissions
      if (!manifest.permissions || manifest.permissions.length === 0) {
        this.warnings.push('No permissions defined in manifest');
      }
      
    } catch (error) {
      this.errors.push(`Invalid JSON in manifest.json: ${error.message}`);
    }
  }

  async validateContentScript() {
    console.log(chalk.yellow('📜 Validating content script...'));
    
    const contentPath = path.join(this.projectRoot, 'content.js');
    
    if (!await fs.pathExists(contentPath)) {
      this.errors.push('content.js not found');
      return;
    }
    
    const content = await fs.readFile(contentPath, 'utf8');
    
    // Check for common issues
    if (content.includes('eval(')) {
      this.warnings.push('content.js contains eval() - consider removing for security');
    }
    
    if (content.includes('innerHTML')) {
      this.warnings.push('content.js uses innerHTML - consider using textContent for security');
    }
    
    // Check file size
    const sizeInKB = content.length / 1024;
    if (sizeInKB > 100) {
      this.warnings.push(`content.js is large (${sizeInKB.toFixed(1)}KB) - consider minification`);
    }
  }

  async validatePopupFiles() {
    console.log(chalk.yellow('🪟 Validating popup files...'));
    
    const popupFiles = ['popup.html', 'popup.css', 'popup.js'];
    
    for (const file of popupFiles) {
      const filePath = path.join(this.projectRoot, file);
      
      if (!await fs.pathExists(filePath)) {
        this.errors.push(`${file} not found`);
        continue;
      }
      
      const content = await fs.readFile(filePath, 'utf8');
      
      // Check for external resources
      if (content.includes('http://') || content.includes('https://')) {
        this.warnings.push(`${file} contains external URLs - consider bundling resources`);
      }
      
      // Check file size
      const sizeInKB = content.length / 1024;
      if (sizeInKB > 50) {
        this.warnings.push(`${file} is large (${sizeInKB.toFixed(1)}KB) - consider optimization`);
      }
    }
  }

  async validateIcons() {
    console.log(chalk.yellow('🎨 Validating icons...'));
    
    const iconPath = path.join(this.projectRoot, 'icon.png');
    
    if (!await fs.pathExists(iconPath)) {
      this.warnings.push('icon.png not found - extension may not display properly');
    } else {
      const stats = await fs.stat(iconPath);
      const sizeInKB = stats.size / 1024;
      
      if (sizeInKB > 100) {
        this.warnings.push(`icon.png is large (${sizeInKB.toFixed(1)}KB) - consider optimization`);
      }
    }
  }

  async validatePermissions() {
    console.log(chalk.yellow('🔐 Validating permissions...'));
    
    const manifestPath = path.join(this.projectRoot, 'manifest.json');
    
    if (!await fs.pathExists(manifestPath)) {
      return;
    }
    
    try {
      const manifest = await fs.readJson(manifestPath);
      const permissions = manifest.permissions || [];
      
      // Check for potentially dangerous permissions
      const dangerousPermissions = [
        'tabs',
        'activeTab',
        'storage',
        'scripting'
      ];
      
      for (const permission of dangerousPermissions) {
        if (permissions.includes(permission)) {
          this.warnings.push(`Permission "${permission}" requested - ensure it's necessary`);
        }
      }
      
      // Check for host permissions
      const hostPermissions = manifest.host_permissions || [];
      if (hostPermissions.length > 0) {
        this.warnings.push('Host permissions defined - review for security implications');
      }
      
    } catch (error) {
      // Manifest validation already handled
    }
  }

  printResults() {
    console.log('\n' + chalk.blue('📊 Validation Results:'));
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(chalk.green('✅ All validations passed!'));
      return;
    }
    
    if (this.errors.length > 0) {
      console.log(chalk.red(`❌ ${this.errors.length} error(s) found:`));
      this.errors.forEach(error => {
        console.log(chalk.red(`  • ${error}`));
      });
    }
    
    if (this.warnings.length > 0) {
      console.log(chalk.yellow(`⚠️  ${this.warnings.length} warning(s) found:`));
      this.warnings.forEach(warning => {
        console.log(chalk.yellow(`  • ${warning}`));
      });
    }
    
    if (this.errors.length > 0) {
      console.log(chalk.red('\n❌ Validation failed - please fix errors before building'));
      process.exit(1);
    } else {
      console.log(chalk.green('\n✅ Validation completed - extension is ready for build'));
    }
  }
}

// Run validation
const validator = new ExtensionValidator();
validator.validate();

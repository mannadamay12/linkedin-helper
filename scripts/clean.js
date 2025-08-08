#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

class Cleaner {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    this.directoriesToClean = [
      'dist',
      'node_modules',
      '.nyc_output',
      'coverage'
    ];
    
    this.filesToClean = [
      '*.log',
      '*.tmp',
      '*.temp'
    ];
  }

  async clean() {
    try {
      console.log(chalk.blue('🧹 Cleaning project...'));
      
      // Clean directories
      for (const dir of this.directoriesToClean) {
        const dirPath = path.join(this.projectRoot, dir);
        if (await fs.pathExists(dirPath)) {
          await fs.remove(dirPath);
          console.log(chalk.green(`✅ Removed: ${dir}`));
        }
      }
      
      // Clean files
      for (const pattern of this.filesToClean) {
        const files = await this.findFiles(pattern);
        for (const file of files) {
          await fs.remove(file);
          console.log(chalk.green(`✅ Removed: ${path.relative(this.projectRoot, file)}`));
        }
      }
      
      console.log(chalk.green('✅ Clean completed successfully!'));
      
    } catch (error) {
      console.error(chalk.red('❌ Clean failed:'), error);
      process.exit(1);
    }
  }

  async findFiles(pattern) {
    const glob = require('glob');
    return new Promise((resolve, reject) => {
      glob(pattern, { cwd: this.projectRoot, absolute: true }, (err, files) => {
        if (err) reject(err);
        else resolve(files);
      });
    });
  }
}

// Run the clean
const cleaner = new Cleaner();
cleaner.clean();

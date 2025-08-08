#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

class DistributionManager {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    this.version = require('../package.json').version;
  }

  async distribute() {
    try {
      console.log(chalk.blue(`🚀 Preparing distribution for v${this.version}`));
      
      // Check if we're on main branch
      await this.checkBranch();
      
      // Check if working directory is clean
      await this.checkWorkingDirectory();
      
      // Build the extension
      await this.buildExtension();
      
      // Create git tag
      await this.createTag();
      
      // Push to GitHub
      await this.pushToGitHub();
      
      console.log(chalk.green('✅ Distribution prepared successfully!'));
      console.log(chalk.blue('📝 Next steps:'));
      console.log(chalk.gray('1. Check GitHub for the new release'));
      console.log(chalk.gray('2. Review the generated release notes'));
      console.log(chalk.gray('3. Download and test the extension'));
      
    } catch (error) {
      console.error(chalk.red('❌ Distribution failed:'), error.message);
      process.exit(1);
    }
  }

  async checkBranch() {
    console.log(chalk.yellow('🌿 Checking branch...'));
    
    try {
      const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      
      if (currentBranch !== 'main' && currentBranch !== 'master') {
        throw new Error(`Must be on main/master branch, currently on ${currentBranch}`);
      }
      
      console.log(chalk.green(`✅ On ${currentBranch} branch`));
    } catch (error) {
      throw new Error(`Failed to check branch: ${error.message}`);
    }
  }

  async checkWorkingDirectory() {
    console.log(chalk.yellow('🧹 Checking working directory...'));
    
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      
      if (status.trim()) {
        console.log(chalk.yellow('⚠️  Working directory has uncommitted changes:'));
        console.log(status);
        
        const readline = require('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const answer = await new Promise(resolve => {
          rl.question('Do you want to commit these changes? (y/N): ', resolve);
        });
        
        rl.close();
        
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
          execSync('git add .', { stdio: 'inherit' });
          execSync('git commit -m "chore: prepare for release"', { stdio: 'inherit' });
        } else {
          throw new Error('Please commit or stash changes before distributing');
        }
      }
      
      console.log(chalk.green('✅ Working directory is clean'));
    } catch (error) {
      throw new Error(`Failed to check working directory: ${error.message}`);
    }
  }

  async buildExtension() {
    console.log(chalk.yellow('🔨 Building extension...'));
    
    try {
      execSync('npm run build:prod', { stdio: 'inherit' });
      console.log(chalk.green('✅ Extension built successfully'));
    } catch (error) {
      throw new Error(`Build failed: ${error.message}`);
    }
  }

  async createTag() {
    console.log(chalk.yellow('🏷️  Creating git tag...'));
    
    try {
      // Check if tag already exists
      const existingTags = execSync(`git tag -l "v${this.version}"`, { encoding: 'utf8' });
      
      if (existingTags.trim()) {
        console.log(chalk.yellow(`⚠️  Tag v${this.version} already exists`));
        
        const readline = require('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const answer = await new Promise(resolve => {
          rl.question('Do you want to delete and recreate the tag? (y/N): ', resolve);
        });
        
        rl.close();
        
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
          execSync(`git tag -d v${this.version}`, { stdio: 'inherit' });
        } else {
          throw new Error('Tag already exists and user chose not to recreate');
        }
      }
      
      execSync(`git tag -a v${this.version} -m "Release v${this.version}"`, { stdio: 'inherit' });
      console.log(chalk.green(`✅ Tag v${this.version} created`));
    } catch (error) {
      throw new Error(`Failed to create tag: ${error.message}`);
    }
  }

  async pushToGitHub() {
    console.log(chalk.yellow('📤 Pushing to GitHub...'));
    
    try {
      execSync('git push origin main', { stdio: 'inherit' });
      execSync(`git push origin v${this.version}`, { stdio: 'inherit' });
      console.log(chalk.green('✅ Pushed to GitHub successfully'));
    } catch (error) {
      throw new Error(`Failed to push to GitHub: ${error.message}`);
    }
  }
}

// Check if this is a release command
if (process.argv.includes('--release')) {
  const releaseManager = new DistributionManager();
  releaseManager.distribute();
} else {
  console.log(chalk.blue('📦 Distribution Helper'));
  console.log(chalk.gray('Use --release flag to prepare a full distribution'));
  console.log(chalk.gray('Or use npm run release <type> for automated releases'));
}

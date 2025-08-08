#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { createCanvas } = require('canvas');
const chalk = require('chalk');

class IconGenerator {
  constructor() {
    this.sizes = [16, 32, 48, 128];
    this.outputDir = path.join(__dirname, '..');
  }

  async generateIcons() {
    console.log(chalk.blue('🎨 Generating extension icons...'));
    
    try {
      for (const size of this.sizes) {
        await this.generateIcon(size);
      }
      
      console.log(chalk.green('✅ Icons generated successfully!'));
      
    } catch (error) {
      console.error(chalk.red('❌ Icon generation failed:'), error);
      process.exit(1);
    }
  }

  async generateIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#0a66c2');
    gradient.addColorStop(1, '#004182');
    
    // Draw rounded rectangle background
    const radius = size * 0.15;
    ctx.fillStyle = gradient;
    this.roundRect(ctx, 0, 0, size, size, radius);
    ctx.fill();
    
    // Add subtle shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = size * 0.1;
    ctx.shadowOffsetX = size * 0.05;
    ctx.shadowOffsetY = size * 0.05;
    
    // Draw the handshake emoji
    ctx.font = `bold ${size * 0.6}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';
    ctx.fillText('🤝', size / 2, size / 2);
    
    // Remove shadow for border
    ctx.shadowColor = 'transparent';
    
    // Add subtle border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = size * 0.02;
    this.roundRect(ctx, size * 0.02, size * 0.02, size * 0.96, size * 0.96, radius);
    ctx.stroke();
    
    // Save the icon
    const buffer = canvas.toBuffer('image/png');
    const filename = size === 128 ? 'icon.png' : `icon-${size}.png`;
    const filepath = path.join(this.outputDir, filename);
    
    await fs.writeFile(filepath, buffer);
    console.log(chalk.green(`✅ Generated ${filename} (${size}x${size})`));
  }

  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

// Check if canvas is available
try {
  require('canvas');
  const generator = new IconGenerator();
  generator.generateIcons();
} catch (error) {
  console.log(chalk.yellow('⚠️  Canvas not available, creating simple icon...'));
  
  // Create a simple base64 icon as fallback
  const simpleIcon = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF0WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78i iglkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNy4yLWMwMDAgNzkuMWI2NWE3OWI0LCAyMDIyLzA2LzEzLTIyOjAxOjAxICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpypmY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdEV2dD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlRXZlbnQjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjQuMCAoTWFjaW50b3NoKSIgeG1wOkNyZWF0ZURhdGU9IjIwMjQtMDEtMjBUMTU6NDc6NDctMDU6MDAiIHhtcDpNZXRhZGF0YURhdGU9IjIwMjQtMDEtMjBUMTU6NDc6NDctMDU6MDAiIHhtcDpNb2RpZnlEYXRlPSIyMDI0LTAxLTIwVDE1OjQ3OjQ3LTA1OjAwIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjY5ZDM4YmM1LTM4ZTAtNDZiZC1hMzBkLTNmOWNhYzM5NzM0YyIgeG1wTU06RG9jdW1lbnRJRD0iYWRvYmU6ZG9jaWQ6cGhvdG9zaG9wOjIyYzRkOTZiLTM4ZTAtNDZiZC1hMzBkLTNmOWNhYzM5NzM0YyIgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJ4bXAuZGlkOjY5ZDM4YmM1LTM4ZTAtNDZiZC1hMzBkLTNmOWNhYzM5NzM0YyIgZGM6Zm9ybWF0PSJpbWFnZS9wbmciIHBob3Rvc2hvcDpDb2xvck1vZGU9IjMiPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJjcmVhdGVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjY5ZDM4YmM1LTM4ZTAtNDZiZC1hMzBkLTNmOWNhYzM5NzM0YyIgc3RFdnQ6d2hlbj0iMjAyNC0wMS0yMFQxNTo0Nzo0Ny0wNTowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIDI0LjAgKE1hY2ludG9zaCkiLz4gPC9yZGY6U2VxPiA8L3htcE1NOkhpc3Rvcnk+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+', 'base64');
  
  fs.writeFile(path.join(__dirname, '..', 'icon.png'), simpleIcon)
    .then(() => console.log(chalk.green('✅ Created simple icon.png')))
    .catch(err => console.error(chalk.red('❌ Failed to create icon:'), err));
}

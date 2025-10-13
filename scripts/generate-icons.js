/**
 * Icon Generation Script
 *
 * This script helps you generate PWA icons from a source image.
 *
 * INSTRUCTIONS:
 * 1. Install sharp: npm install --save-dev sharp
 * 2. Replace public/icon.svg with your actual logo/icon (512x512 recommended)
 * 3. Run: node scripts/generate-icons.js
 *
 * OR use an online tool:
 * - https://realfavicongenerator.net/
 * - https://www.pwabuilder.com/imageGenerator
 *
 * Required sizes: 72, 96, 128, 144, 152, 192, 384, 512
 */

const fs = require('fs');
const path = require('path');

console.log('\n📱 PWA Icon Generator\n');
console.log('To generate icons automatically, you have two options:\n');
console.log('Option 1: Use sharp (Node.js library)');
console.log('  1. Install: npm install --save-dev sharp');
console.log('  2. Place your source image at public/icon-source.png (512x512 recommended)');
console.log('  3. Uncomment the sharp code below and run this script\n');
console.log('Option 2: Use online tools (Recommended for quick setup)');
console.log('  1. Visit: https://realfavicongenerator.net/');
console.log('  2. Upload your logo');
console.log('  3. Download and extract to public/ folder\n');
console.log('Option 3: Manual creation');
console.log('  Create PNG files with these sizes: 72, 96, 128, 144, 152, 192, 384, 512');
console.log('  Name them as: icon-72x72.png, icon-96x96.png, etc.\n');

// Uncomment this code if you have sharp installed:
/*
const sharp = require('sharp');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const sourceImage = path.join(__dirname, '../public/icon-source.png');
const outputDir = path.join(__dirname, '../public');

if (!fs.existsSync(sourceImage)) {
  console.error('❌ Source image not found at public/icon-source.png');
  console.error('   Please create a 512x512 PNG image at that location first.');
  process.exit(1);
}

async function generateIcons() {
  console.log('🎨 Generating icons...\n');

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    await sharp(sourceImage)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 59, g: 130, b: 246, alpha: 1 }
      })
      .png()
      .toFile(outputPath);
    console.log(`✅ Generated icon-${size}x${size}.png`);
  }

  console.log('\n🎉 All icons generated successfully!');
}

generateIcons().catch(console.error);
*/

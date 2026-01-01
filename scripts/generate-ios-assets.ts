import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SOURCE_ICON = 'attached_assets/generated_images/trucknav_pro_app_icon.png';
const OUTPUT_DIR = 'ios-assets/AppIcon.appiconset';
const SPLASH_DIR = 'ios-assets/splash';

const iconSizes = [
  { name: 'Icon-20.png', size: 20 },
  { name: 'Icon-20@2x.png', size: 40 },
  { name: 'Icon-20@3x.png', size: 60 },
  { name: 'Icon-29.png', size: 29 },
  { name: 'Icon-29@2x.png', size: 58 },
  { name: 'Icon-29@3x.png', size: 87 },
  { name: 'Icon-40.png', size: 40 },
  { name: 'Icon-40@2x.png', size: 80 },
  { name: 'Icon-40@3x.png', size: 120 },
  { name: 'Icon-60@2x.png', size: 120 },
  { name: 'Icon-60@3x.png', size: 180 },
  { name: 'Icon-76.png', size: 76 },
  { name: 'Icon-76@2x.png', size: 152 },
  { name: 'Icon-83.5@2x.png', size: 167 },
  { name: 'Icon-1024.png', size: 1024 },
];

const splashSizes = [
  { name: 'splash-2732x2732.png', width: 2732, height: 2732 },
  { name: 'splash-1242x2688.png', width: 1242, height: 2688 },
  { name: 'splash-1125x2436.png', width: 1125, height: 2436 },
  { name: 'splash-828x1792.png', width: 828, height: 1792 },
  { name: 'splash-750x1334.png', width: 750, height: 1334 },
  { name: 'splash-640x1136.png', width: 640, height: 1136 },
  { name: 'splash-1536x2048.png', width: 1536, height: 2048 },
  { name: 'splash-1668x2224.png', width: 1668, height: 2224 },
  { name: 'splash-2048x2732.png', width: 2048, height: 2732 },
];

async function generateIcons() {
  console.log('Generating iOS app icons...');
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (const icon of iconSizes) {
    const outputPath = path.join(OUTPUT_DIR, icon.name);
    await sharp(SOURCE_ICON)
      .resize(icon.size, icon.size, {
        fit: 'cover',
        position: 'center'
      })
      .png()
      .toFile(outputPath);
    console.log(`  Created ${icon.name} (${icon.size}x${icon.size})`);
  }
  
  console.log(`\n✓ Generated ${iconSizes.length} app icons`);
}

async function generateSplashScreens() {
  console.log('\nGenerating splash screens...');
  
  if (!fs.existsSync(SPLASH_DIR)) {
    fs.mkdirSync(SPLASH_DIR, { recursive: true });
  }

  const iconBuffer = await sharp(SOURCE_ICON)
    .resize(400, 400)
    .toBuffer();

  for (const splash of splashSizes) {
    const outputPath = path.join(SPLASH_DIR, splash.name);
    
    const iconSize = Math.min(splash.width, splash.height) * 0.3;
    const iconX = Math.round((splash.width - iconSize) / 2);
    const iconY = Math.round((splash.height - iconSize) / 2);
    
    const resizedIcon = await sharp(iconBuffer)
      .resize(Math.round(iconSize), Math.round(iconSize))
      .toBuffer();

    await sharp({
      create: {
        width: splash.width,
        height: splash.height,
        channels: 4,
        background: { r: 17, g: 94, b: 89, alpha: 1 }
      }
    })
      .composite([{
        input: resizedIcon,
        left: iconX,
        top: iconY
      }])
      .png()
      .toFile(outputPath);
    
    console.log(`  Created ${splash.name} (${splash.width}x${splash.height})`);
  }
  
  console.log(`\n✓ Generated ${splashSizes.length} splash screens`);
}

async function copyIconToPublic() {
  console.log('\nUpdating public icons...');
  
  await sharp(SOURCE_ICON)
    .resize(180, 180)
    .png()
    .toFile('public/apple-touch-icon.png');
  console.log('  Updated apple-touch-icon.png (180x180)');
  
  await sharp(SOURCE_ICON)
    .resize(512, 512)
    .png()
    .toFile('public/icon-512.png');
  console.log('  Created icon-512.png (512x512)');
  
  await sharp(SOURCE_ICON)
    .resize(192, 192)
    .png()
    .toFile('public/icon-192.png');
  console.log('  Created icon-192.png (192x192)');
  
  console.log('\n✓ Public icons updated');
}

async function main() {
  console.log('='.repeat(50));
  console.log('iOS Asset Generator for TruckNav Pro');
  console.log('='.repeat(50));
  console.log(`\nSource icon: ${SOURCE_ICON}\n`);

  if (!fs.existsSync(SOURCE_ICON)) {
    console.error(`Error: Source icon not found at ${SOURCE_ICON}`);
    process.exit(1);
  }

  try {
    await generateIcons();
    await generateSplashScreens();
    await copyIconToPublic();
    
    console.log('\n' + '='.repeat(50));
    console.log('All iOS assets generated successfully!');
    console.log('='.repeat(50));
    console.log('\nNext steps:');
    console.log('1. Run: npx cap sync ios');
    console.log('2. Run: npx cap open ios');
    console.log('3. In Xcode, verify icons appear in Assets.xcassets');
  } catch (error) {
    console.error('Error generating assets:', error);
    process.exit(1);
  }
}

main();

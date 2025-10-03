import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const splashSizes = [
  { name: 'splash-iphone-15-pro-max.png', width: 1290, height: 2796 },
  { name: 'splash-iphone-15-pro.png', width: 1179, height: 2556 },
  { name: 'splash-iphone-se.png', width: 750, height: 1334 },
  { name: 'splash-iphone-8-plus.png', width: 1242, height: 2208 },
  { name: 'splash-ipad-pro.png', width: 2048, height: 2732 },
];

async function createGradientSVG(width, height) {
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#2563eb;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1e40af;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#grad)" />
    </svg>
  `;
}

async function createTextSVG(width, height) {
  const fontSize = Math.min(width, height) * 0.08;
  const taglineFontSize = fontSize * 0.4;
  const textY = height * 0.72;
  const taglineY = textY + fontSize * 1.2;
  
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text 
        x="${width / 2}" 
        y="${textY}" 
        font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" 
        font-size="${fontSize}" 
        font-weight="700"
        fill="white" 
        text-anchor="middle"
        dominant-baseline="middle">TruckNav Pro</text>
      <text 
        x="${width / 2}" 
        y="${taglineY}" 
        font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" 
        font-size="${taglineFontSize}" 
        font-weight="400"
        fill="white" 
        opacity="0.9"
        text-anchor="middle"
        dominant-baseline="middle">Professional Truck Navigation</text>
    </svg>
  `;
}

async function generateSplashScreen(size) {
  console.log(`Generating ${size.name}...`);
  
  const { width, height } = size;
  const outputPath = join(__dirname, '..', 'client', 'public', size.name);
  const iconPath = join(__dirname, '..', 'client', 'public', 'apple-touch-icon.png');
  
  try {
    const gradientSVG = await createGradientSVG(width, height);
    const textSVG = await createTextSVG(width, height);
    
    const iconSize = Math.min(width, height) * 0.25;
    const iconY = height * 0.35;
    
    const resizedIcon = await sharp(iconPath)
      .resize(Math.round(iconSize), Math.round(iconSize), {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer();
    
    await sharp(Buffer.from(gradientSVG))
      .composite([
        {
          input: resizedIcon,
          top: Math.round(iconY - iconSize / 2),
          left: Math.round((width - iconSize) / 2),
        },
        {
          input: Buffer.from(textSVG),
          top: 0,
          left: 0,
        }
      ])
      .png()
      .toFile(outputPath);
    
    console.log(`✅ Created ${size.name} (${width}x${height})`);
  } catch (error) {
    console.error(`❌ Error creating ${size.name}:`, error);
    throw error;
  }
}

async function generateAllSplashScreens() {
  console.log('🎨 Generating iOS splash screens for TruckNav Pro...\n');
  
  for (const size of splashSizes) {
    await generateSplashScreen(size);
  }
  
  console.log('\n✨ All splash screens generated successfully!');
  console.log('\nGenerated files:');
  splashSizes.forEach(size => {
    console.log(`  - client/public/${size.name}`);
  });
}

generateAllSplashScreens().catch(error => {
  console.error('Failed to generate splash screens:', error);
  process.exit(1);
});

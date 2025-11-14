#!/usr/bin/env node

/**
 * Asset Generator for TruckNav Pro
 * Creates app icons and splash screens for iOS and Android
 */

import fs from 'fs/promises';
import path from 'path';

// SVG template for the app icon
const iconSVG = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="#1E293B"/>
  <g transform="translate(512, 512)">
    <!-- Truck icon -->
    <rect x="-200" y="-100" width="300" height="150" fill="#DC2626" rx="10"/>
    <rect x="100" y="-80" width="100" height="130" fill="#991B1B" rx="5"/>
    <!-- Wheels -->
    <circle cx="-120" cy="75" r="30" fill="#475569"/>
    <circle cx="0" cy="75" r="30" fill="#475569"/>
    <circle cx="120" cy="75" r="30" fill="#475569"/>
    <!-- Navigation pin -->
    <g transform="translate(0, -200)">
      <path d="M 0 -50 C -30 -50 -50 -30 -50 0 C -50 20 -20 60 0 80 C 20 60 50 20 50 0 C 50 -30 30 -50 0 -50 Z" fill="#F59E0B"/>
      <circle cx="0" cy="-5" r="15" fill="#FFF"/>
    </g>
  </g>
  <!-- App name -->
  <text x="512" y="800" font-family="Arial, sans-serif" font-size="120" font-weight="bold" fill="#FFF" text-anchor="middle">TruckNav Pro</text>
</svg>
`;

// SVG template for the splash screen
const splashSVG = `
<svg width="2732" height="2732" viewBox="0 0 2732 2732" xmlns="http://www.w3.org/2000/svg">
  <rect width="2732" height="2732" fill="#1E293B"/>
  <g transform="translate(1366, 1366)">
    <!-- Truck icon -->
    <rect x="-300" y="-150" width="450" height="225" fill="#DC2626" rx="15"/>
    <rect x="150" y="-120" width="150" height="195" fill="#991B1B" rx="8"/>
    <!-- Wheels -->
    <circle cx="-180" cy="112" r="45" fill="#475569"/>
    <circle cx="0" cy="112" r="45" fill="#475569"/>
    <circle cx="180" cy="112" r="45" fill="#475569"/>
    <!-- Navigation pin -->
    <g transform="translate(0, -350)">
      <path d="M 0 -80 C -48 -80 -80 -48 -80 0 C -80 32 -32 96 0 128 C 32 96 80 32 80 0 C 80 -48 48 -80 0 -80 Z" fill="#F59E0B"/>
      <circle cx="0" cy="-8" r="24" fill="#FFF"/>
    </g>
  </g>
  <!-- App name -->
  <text x="1366" y="2000" font-family="Arial, sans-serif" font-size="200" font-weight="bold" fill="#FFF" text-anchor="middle">TruckNav Pro</text>
  <text x="1366" y="2150" font-family="Arial, sans-serif" font-size="100" fill="#94A3B8" text-anchor="middle">Professional Truck Navigation</text>
</svg>
`;

// Icon sizes needed for iOS and Android
const iconSizes = {
  ios: [20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024],
  android: [36, 48, 72, 96, 144, 192, 512]
};

// Splash screen sizes
const splashSizes = {
  ios: [
    { width: 2732, height: 2732, name: 'Default@2x~universal~anyany' },
    { width: 1278, height: 2732, name: 'Default@2x~iphone~anyany' },
    { width: 1334, height: 750, name: 'Default@2x~iphone~landscape' }
  ],
  android: [
    { width: 480, height: 800, name: 'splash-port-hdpi' },
    { width: 800, height: 480, name: 'splash-land-hdpi' },
    { width: 720, height: 1280, name: 'splash-port-xhdpi' },
    { width: 1280, height: 720, name: 'splash-land-xhdpi' },
    { width: 1080, height: 1920, name: 'splash-port-xxhdpi' },
    { width: 1920, height: 1080, name: 'splash-land-xxhdpi' }
  ]
};

async function ensureDirectories() {
  const dirs = [
    'mobile/resources',
    'mobile/resources/icon',
    'mobile/resources/splash',
    'mobile/resources/icon/ios',
    'mobile/resources/icon/android',
    'mobile/resources/splash/ios',
    'mobile/resources/splash/android'
  ];
  
  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true }).catch(() => {});
  }
}

async function createPlaceholderImage(svg, width, height, outputPath) {
  // For now, we'll save the SVG as a placeholder
  // In production, you'd use a library like sharp to convert to PNG
  const placeholderContent = `<!-- Placeholder ${width}x${height} -->
${svg.replace('width="1024"', `width="${width}"`).replace('height="1024"', `height="${height}"`)}`;
  
  await fs.writeFile(outputPath, placeholderContent);
}

async function generateIcons() {
  console.log('📱 Generating app icons...');
  
  // Save base icon SVG
  await fs.writeFile('mobile/resources/icon.svg', iconSVG);
  
  // Generate iOS icons
  for (const size of iconSizes.ios) {
    const filename = `mobile/resources/icon/ios/icon-${size}x${size}.png.svg`;
    await createPlaceholderImage(iconSVG, size, size, filename);
  }
  
  // Generate Android icons
  for (const size of iconSizes.android) {
    const filename = `mobile/resources/icon/android/icon-${size}x${size}.png.svg`;
    await createPlaceholderImage(iconSVG, size, size, filename);
  }
  
  console.log('✅ Icons generated');
}

async function generateSplashScreens() {
  console.log('🎨 Generating splash screens...');
  
  // Save base splash SVG
  await fs.writeFile('mobile/resources/splash.svg', splashSVG);
  
  // Generate iOS splash screens
  for (const config of splashSizes.ios) {
    const filename = `mobile/resources/splash/ios/${config.name}.png.svg`;
    await createPlaceholderImage(splashSVG, config.width, config.height, filename);
  }
  
  // Generate Android splash screens
  for (const config of splashSizes.android) {
    const filename = `mobile/resources/splash/android/${config.name}.png.svg`;
    await createPlaceholderImage(splashSVG, config.width, config.height, filename);
  }
  
  console.log('✅ Splash screens generated');
}

async function createResourceConfig() {
  const config = {
    resources: {
      icon: {
        source: 'mobile/resources/icon.svg',
        platforms: {
          ios: iconSizes.ios.map(size => ({
            size: `${size}x${size}`,
            path: `mobile/resources/icon/ios/icon-${size}x${size}.png`
          })),
          android: iconSizes.android.map(size => ({
            size: `${size}x${size}`,
            path: `mobile/resources/icon/android/icon-${size}x${size}.png`
          }))
        }
      },
      splash: {
        source: 'mobile/resources/splash.svg',
        platforms: {
          ios: splashSizes.ios.map(config => ({
            ...config,
            path: `mobile/resources/splash/ios/${config.name}.png`
          })),
          android: splashSizes.android.map(config => ({
            ...config,
            path: `mobile/resources/splash/android/${config.name}.png`
          }))
        }
      }
    }
  };
  
  await fs.writeFile(
    'mobile/resources/config.json',
    JSON.stringify(config, null, 2)
  );
  
  console.log('✅ Resource configuration saved');
}

async function main() {
  console.log('\n🚀 TruckNav Pro Asset Generator\n');
  
  await ensureDirectories();
  await generateIcons();
  await generateSplashScreens();
  await createResourceConfig();
  
  console.log('\n✨ Asset generation complete!');
  console.log('\n📝 Note: These are SVG placeholders. For production:');
  console.log('  1. Replace icon.svg and splash.svg with branded designs');
  console.log('  2. Use a tool like @capacitor/assets to generate PNGs');
  console.log('  3. Run: npx @capacitor/assets generate');
  console.log('\n📱 Happy app development!');
}

main().catch(error => {
  console.error(`❌ Error: ${error.message}`);
  process.exit(1);
});
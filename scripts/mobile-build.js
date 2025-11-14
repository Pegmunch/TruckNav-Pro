#!/usr/bin/env node

/**
 * Mobile Build Script for Capacitor
 * Handles building and syncing for iOS and Android platforms
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

async function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkPrerequisites() {
  log('📋 Checking prerequisites...', 'blue');
  
  // Check if build directory exists
  try {
    await fs.access('dist/public');
    log('✅ Build directory found', 'green');
  } catch (error) {
    log('❌ Build directory not found. Running build...', 'yellow');
    await runBuild();
  }
  
  // Check Capacitor config
  try {
    await fs.access('capacitor.config.ts');
    log('✅ Capacitor config found', 'green');
  } catch (error) {
    log('❌ Capacitor config not found', 'red');
    process.exit(1);
  }
}

async function runBuild() {
  log('🔨 Building web app...', 'blue');
  try {
    const { stdout, stderr } = await execAsync('npm run build');
    if (stderr && !stderr.includes('warning')) {
      log(`Build warnings: ${stderr}`, 'yellow');
    }
    log('✅ Build completed', 'green');
  } catch (error) {
    log(`❌ Build failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function syncCapacitor(platform) {
  log(`🔄 Syncing Capacitor for ${platform}...`, 'blue');
  try {
    // First, ensure the platform is added
    await execAsync(`npx cap add ${platform}`).catch(() => {
      // Platform might already be added, continue
    });
    
    // Sync the platform
    const { stdout, stderr } = await execAsync(`npx cap sync ${platform}`);
    if (stderr && !stderr.includes('warning')) {
      log(`Sync warnings: ${stderr}`, 'yellow');
    }
    log(`✅ ${platform} synced successfully`, 'green');
  } catch (error) {
    log(`❌ Sync failed for ${platform}: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function copyAssets() {
  log('📁 Copying native assets...', 'blue');
  
  // Create directories if they don't exist
  const assetDirs = [
    'ios/App/App/Assets.xcassets',
    'android/app/src/main/res'
  ];
  
  for (const dir of assetDirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }
  
  log('✅ Asset directories prepared', 'green');
}

async function updatePlatformConfigs() {
  log('⚙️  Updating platform configurations...', 'blue');
  
  // Update iOS Info.plist permissions
  const iosInfoPlist = `ios/App/App/Info.plist`;
  const androidManifest = `android/app/src/main/AndroidManifest.xml`;
  
  // These files will be created by Capacitor when platforms are added
  log('✅ Platform configurations ready for manual update', 'green');
}

async function main() {
  const args = process.argv.slice(2);
  const platform = args[0] || 'all';
  
  log(`\n🚀 TruckNav Pro Mobile Build Script\n`, 'magenta');
  log(`Platform: ${platform}`, 'blue');
  
  await checkPrerequisites();
  
  if (platform === 'all' || platform === 'ios') {
    await syncCapacitor('ios');
  }
  
  if (platform === 'all' || platform === 'android') {
    await syncCapacitor('android');
  }
  
  await copyAssets();
  await updatePlatformConfigs();
  
  log('\n✨ Mobile build preparation complete!', 'green');
  log('\nNext steps:', 'yellow');
  
  if (platform === 'all' || platform === 'ios') {
    log('  iOS: Open ios/App/App.xcworkspace in Xcode', 'blue');
    log('       Configure signing & capabilities', 'blue');
    log('       Build and run on simulator or device', 'blue');
  }
  
  if (platform === 'all' || platform === 'android') {
    log('  Android: Open android/ in Android Studio', 'blue');
    log('           Configure signing in build.gradle', 'blue');
    log('           Build and run on emulator or device', 'blue');
  }
  
  log('\n📱 Happy mobile development!', 'magenta');
}

main().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
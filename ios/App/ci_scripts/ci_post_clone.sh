#!/bin/sh
set -e

echo "=== Installing Node.js dependencies ==="
cd "$CI_PRIMARY_REPOSITORY_PATH"
npm install

echo "=== Building web assets ==="
npm run build

echo "=== Syncing Capacitor ==="
npx cap sync ios

echo "=== Installing CocoaPods ==="
cd "$CI_PRIMARY_REPOSITORY_PATH/ios/App"
pod install

echo "=== Build preparation complete ==="

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
export LANG=en_US.UTF-8
gem install cocoapods
pod install --repo-update

echo "=== Verifying Pods xcconfig exists ==="
ls -la Pods/Target\ Support\ Files/Pods-App/

echo "=== Build preparation complete ==="

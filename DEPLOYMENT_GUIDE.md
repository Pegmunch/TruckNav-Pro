# TruckNav Pro - Native Deployment Guide
## Version 3.4.38

This guide covers deploying TruckNav Pro to the Apple App Store and Google Play Store using Capacitor.

---

## Prerequisites

### On Your Mac (Required for iOS)
1. **Xcode 15+** - Download from Mac App Store
2. **Xcode Command Line Tools**: `xcode-select --install`
3. **CocoaPods**: `sudo gem install cocoapods`
4. **Apple Developer Account** ($99/year) - https://developer.apple.com
5. **Node.js 18+** and npm

### For Android
1. **Android Studio** (Hedgehog or newer)
2. **Java JDK 17+**
3. **Google Play Developer Account** ($25 one-time)

---

## Step 1: Download Project Files

### Option A: Clone from Replit
```bash
# Export your Replit project or use Git
git clone <your-replit-git-url> TruckNavPro
cd TruckNavPro
```

### Option B: Download ZIP
1. In Replit, click the three dots menu
2. Select "Download as ZIP"
3. Extract to a folder on your Mac

---

## Step 2: Install Dependencies

```bash
# Navigate to project folder
cd TruckNavPro

# Install all dependencies
npm install

# Build the web app for production
npm run build
```

---

## Step 3: Initialize Native Platforms

### Add iOS Platform
```bash
# Add iOS platform (generates Xcode project)
npx cap add ios

# Sync web assets to iOS
npx cap sync ios
```

### Add Android Platform
```bash
# Add Android platform
npx cap add android

# Sync web assets to Android
npx cap sync android
```

---

## Step 4: iOS Configuration in Xcode

### Open in Xcode
```bash
npx cap open ios
```

### 4.1 Configure Signing & Capabilities

1. Select the **App** target in the project navigator
2. Go to **Signing & Capabilities** tab
3. Select your **Team** (Apple Developer account)
4. Set **Bundle Identifier**: `uk.co.bespokemarketingai.trucknavpro`

### 4.2 Add Required Capabilities

Click **+ Capability** and add:
- **Background Modes**
  - [x] Location updates
  - [x] Background fetch
  - [x] Audio, AirPlay, and Picture in Picture (for voice navigation)
- **Push Notifications** (if using)
- **In-App Purchase** (for subscriptions)

### 4.3 Configure Info.plist

Add these keys to `ios/App/App/Info.plist`:

```xml
<!-- Location Permissions -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>TruckNav Pro needs your location to provide turn-by-turn truck navigation and avoid road restrictions.</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>TruckNav Pro needs continuous location access to provide background navigation guidance while driving.</string>

<key>NSLocationAlwaysUsageDescription</key>
<string>TruckNav Pro needs background location to continue navigation when the app is minimized.</string>

<!-- Camera for AR Navigation -->
<key>NSCameraUsageDescription</key>
<string>TruckNav Pro uses the camera for augmented reality navigation overlay.</string>

<!-- Microphone for Voice Commands -->
<key>NSMicrophoneUsageDescription</key>
<string>TruckNav Pro uses the microphone for hands-free voice commands to report traffic incidents.</string>

<!-- Motion for AR -->
<key>NSMotionUsageDescription</key>
<string>TruckNav Pro uses motion sensors for augmented reality navigation.</string>

<!-- Background Location Indicator -->
<key>UIBackgroundModes</key>
<array>
    <string>location</string>
    <string>fetch</string>
    <string>audio</string>
</array>
```

### 4.4 Set App Version

In Xcode, select the App target:
- **Version**: 3.4.38
- **Build**: 1 (increment for each upload)

### 4.5 App Icons

1. Navigate to `ios/App/App/Assets.xcassets/AppIcon.appiconset`
2. Add your app icons in all required sizes:
   - 1024x1024 (App Store)
   - 180x180, 120x120, 87x87, 80x80, 60x60, 58x58, 40x40, 29x29, 20x20

### 4.6 Launch Screen

Configure in `ios/App/App/Base.lproj/LaunchScreen.storyboard` or use:
```xml
<!-- In Info.plist -->
<key>UILaunchStoryboardName</key>
<string>LaunchScreen</string>
```

---

## Step 5: Build iOS for App Store

### 5.1 Create Archive

1. In Xcode, select **Product > Scheme > Edit Scheme**
2. Set Build Configuration to **Release**
3. Select **Any iOS Device (arm64)** as destination
4. **Product > Archive**

### 5.2 Upload to App Store Connect

1. After archiving, the Organizer window opens
2. Click **Distribute App**
3. Select **App Store Connect**
4. Choose **Upload** (or **Export** for manual upload)
5. Follow the prompts to upload

### 5.3 App Store Connect Setup

1. Go to https://appstoreconnect.apple.com
2. Create new app if not exists
3. Fill in:
   - App Name: TruckNav Pro
   - Primary Language: English (UK)
   - Bundle ID: uk.co.bespokemarketingai.trucknavpro
   - SKU: trucknavpro-2024

### 5.4 Configure In-App Purchases

1. In App Store Connect, go to **Features > In-App Purchases**
2. Create subscription:
   - **Reference Name**: PAYG Monthly
   - **Product ID**: uk.co.bespokemarketingai.trucknavpro.payg.monthly
   - **Price**: £7.99/month
   - **Subscription Duration**: 1 Month
   - **Free Trial**: None (or configure as needed)

---

## Step 6: Android Configuration

### Open in Android Studio
```bash
npx cap open android
```

### 6.1 Configure build.gradle

Edit `android/app/build.gradle`:

```gradle
android {
    namespace "uk.co.bespokemarketingai.trucknavpro"
    
    defaultConfig {
        applicationId "uk.co.bespokemarketingai.trucknavpro"
        minSdkVersion 24
        targetSdkVersion 34
        versionCode 1
        versionName "3.4.38"
    }
    
    signingConfigs {
        release {
            storeFile file("keystore.jks")
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias "trucknavpro"
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 6.2 Add Permissions

Edit `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.VIBRATE" />
```

### 6.3 Generate Signing Key

```bash
keytool -genkey -v -keystore keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias trucknavpro
```

### 6.4 Build Release APK/Bundle

```bash
# Build AAB for Play Store (recommended)
cd android
./gradlew bundleRelease

# Or build APK
./gradlew assembleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

---

## Step 7: Environment Variables

### Create `.env` file for API keys (local only)

```env
VITE_TOMTOM_API_KEY=your_tomtom_key
VITE_HERE_API_KEY=your_here_key
VITE_STRIPE_PUBLIC_KEY=your_stripe_key
```

### For production, configure in:
- **iOS**: Xcode scheme environment variables
- **Android**: gradle.properties or BuildConfig

---

## Step 8: Testing Before Submission

### iOS Testing
1. Connect iPhone/iPad
2. In Xcode, select your device
3. **Product > Run**
4. Test all features:
   - [ ] GPS tracking and location updates
   - [ ] Turn-by-turn navigation with voice
   - [ ] Turn indicator matches route line
   - [ ] Speed limit display
   - [ ] Incident reporting button
   - [ ] Subscription flow
   - [ ] Background navigation

### Android Testing
1. Connect Android device with USB debugging
2. In Android Studio, click Run
3. Test same features as iOS

---

## Step 9: App Store Submission Checklist

### Screenshots Required
- iPhone 6.7" (1290 x 2796)
- iPhone 6.5" (1284 x 2778)  
- iPhone 5.5" (1242 x 2208)
- iPad Pro 12.9" (2048 x 2732)

### App Review Information
- **Demo Account**: Provide test credentials if needed
- **Notes for Reviewer**: Explain any location-based features

### Age Rating
- Select appropriate age rating (likely 4+)

### Privacy Policy
- Required URL for apps that collect location data

---

## Step 10: Post-Submission

1. Monitor App Store Connect for review status
2. Respond promptly to any reviewer questions
3. Once approved, set release date or release immediately

---

## Troubleshooting

### "No provisioning profiles found"
- Ensure you have a valid Apple Developer membership
- In Xcode: Preferences > Accounts > Download Manual Profiles

### Build fails with CocoaPods error
```bash
cd ios/App
pod install --repo-update
```

### Capacitor sync issues
```bash
npx cap sync --force
```

### Location not working
- Check Info.plist has all location permission strings
- Ensure Background Modes capability is enabled

---

## Quick Commands Reference

```bash
# Build web app
npm run build

# Sync to native platforms
npx cap sync

# Open Xcode
npx cap open ios

# Open Android Studio
npx cap open android

# Live reload during development
npx cap run ios --livereload --external

# Check Capacitor doctor
npx cap doctor
```

---

## Support

For issues with native deployment:
- Capacitor docs: https://capacitorjs.com/docs
- Apple Developer: https://developer.apple.com/support/
- Google Play Console: https://support.google.com/googleplay/android-developer/

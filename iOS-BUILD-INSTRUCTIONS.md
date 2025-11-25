# TruckNav Pro iOS Build & Xcode Configuration

**IMPORTANT: iOS builds MUST be done on a Mac with Xcode. Replit (Linux) cannot build iOS apps.**

## Your Project Status
✅ Web app built and ready for iOS wrapping  
✅ Capacitor configured with CarPlay support  
✅ All dependencies installed  

---

## Complete iOS Build Process (On Your Mac)

### Step 1: Get Your Project Files
```bash
# Clone from Replit or download your project
cd ~/path/to/trucknav-pro
git pull origin main
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Build Web Assets
```bash
npm run build
```

### Step 4: Initialize iOS Project (First Time Only)
```bash
npx capacitor add ios
```

### Step 5: Generate Xcode Project
```bash
npx capacitor sync ios
npx capacitor open ios
```

This opens your Xcode project automatically.

---

## Xcode Configuration

### 1. **Select Correct Target**
- Left sidebar → **App** (under Targets)

### 2. **General Settings**
- **Bundle Identifier**: `com.trucknav.pro`
- **Team**: Select your Apple Developer Team
- **Minimum Deployment**: iOS 13.0 or later

### 3. **Add Capabilities** (Click "+ Capability")

#### CarPlay Navigation
```
+ Capability → Search "CarPlay"
✓ CarPlay (complication + navigation)
```

#### Background Modes
```
+ Capability → Search "Background Modes"
✓ Location Updates
✓ Background Fetch  
✓ Remote Notifications
```

#### Push Notifications
```
+ Capability → Push Notifications
```

#### Sign In with Apple (for Auth)
```
+ Capability → Sign In with Apple
```

### 4. **Info.plist Permissions**
Edit `ios/App/App/Info.plist` and add:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>TruckNav Pro uses your location for route navigation and truck-specific directions</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Background location needed for route monitoring and navigation</string>

<key>NSBackgroundModes</key>
<array>
    <string>location</string>
    <string>fetch</string>
</array>

<key>NSBonjourServices</key>
<array>
    <string>_http._tcp</string>
</array>
```

---

## Build & Run

### On iPhone Simulator
```bash
# In Xcode
Product → Destination → Choose iPhone simulator
Product → Run (⌘R)
```

### On Physical iPhone
```bash
# Connect iPhone via USB
# In Xcode
Product → Destination → Choose your iPhone
Product → Run (⌘R)
```

### CarPlay Testing
⚠️ **CarPlay can ONLY be tested on:**
- Compatible vehicle with Apple CarPlay
- CarPlay simulator (if available)
- NOT available on iPhone simulator

---

## Key Features Enabled

✅ **Navigation** - Turn-by-turn truck routing  
✅ **CarPlay Integration** - Display on car screens  
✅ **Background Location** - Track position while app is closed  
✅ **Push Notifications** - Get alerts for services, licenses, tolls  
✅ **Fleet Management** - Desktop web interface for operations  

---

## Troubleshooting

### "Pod install failed"
```bash
cd ios/App
pod install --repo-update
cd ../..
```

### "Build fails with missing header"
```bash
# Clean and rebuild
npx capacitor copy ios
npx capacitor open ios
# In Xcode: Product → Clean Build Folder (Shift+Cmd+K)
Product → Build (Cmd+B)
```

### "Team not set"
- Xcode → Settings → Accounts
- Add Apple Developer account
- Restart Xcode

### Update Capacitor (if needed)
```bash
npm update @capacitor/core @capacitor/ios @capacitor/app
npx capacitor sync ios
```

---

## Publishing to App Store

1. **Create App ID** - Apple Developer Portal
2. **Certificate & Provisioning** - Follow Apple's guide
3. **In Xcode**:
   ```
   Product → Archive
   Window → Organizer
   Select Archive → Distribute App
   ```
4. **Submit** to TestFlight or App Store Connect
5. **Review** - Apple's 24-72 hour review process

---

## Important Notes

- **macOS Required**: Xcode only runs on macOS 12+
- **CocoaPods**: Auto-installed by Capacitor
- **Signing**: Use your Apple Developer Team ID
- **CarPlay**: Requires actual vehicle or simulator to test
- **Background Modes**: Improves navigation reliability

---

## Commands Reference

| Command | Purpose |
|---------|---------|
| `npx capacitor add ios` | Create iOS project |
| `npx capacitor sync ios` | Sync changes & open Xcode |
| `npx capacitor copy ios` | Copy web assets to iOS |
| `npx capacitor open ios` | Open Xcode project |
| `npm run build` | Build web app for production |

---

**Your web app is ready. Follow these steps on your Mac to build the iOS version!**

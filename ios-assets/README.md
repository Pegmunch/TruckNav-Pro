# iOS Assets for TruckNav Pro

## ✅ Generated Assets

All required iOS assets have been generated and are ready for Xcode.

### App Icons (AppIcon.appiconset/)
| Filename | Size | Purpose |
|----------|------|---------|
| Icon-1024.png | 1024x1024 | App Store |
| Icon-60@3x.png | 180x180 | iPhone App Icon |
| Icon-60@2x.png | 120x120 | iPhone App Icon |
| Icon-40@3x.png | 120x120 | Spotlight |
| Icon-40@2x.png | 80x80 | Spotlight |
| Icon-40.png | 40x40 | Spotlight (iPad) |
| Icon-29@3x.png | 87x87 | Settings |
| Icon-29@2x.png | 58x58 | Settings |
| Icon-29.png | 29x29 | Settings (iPad) |
| Icon-20@3x.png | 60x60 | Notification |
| Icon-20@2x.png | 40x40 | Notification |
| Icon-20.png | 20x20 | Notification (iPad) |
| Icon-76@2x.png | 152x152 | iPad App Icon |
| Icon-76.png | 76x76 | iPad App Icon |
| Icon-83.5@2x.png | 167x167 | iPad Pro App Icon |

### Splash Screens (splash/)
| Filename | Size | Device |
|----------|------|--------|
| splash-2732x2732.png | 2732x2732 | Universal |
| splash-2048x2732.png | 2048x2732 | iPad Pro 12.9" |
| splash-1668x2224.png | 1668x2224 | iPad Pro 10.5" |
| splash-1536x2048.png | 1536x2048 | iPad |
| splash-1242x2688.png | 1242x2688 | iPhone XS Max |
| splash-1125x2436.png | 1125x2436 | iPhone X/XS |
| splash-828x1792.png | 828x1792 | iPhone XR |
| splash-750x1334.png | 750x1334 | iPhone 8 |
| splash-640x1136.png | 640x1136 | iPhone SE |

## Regenerating Assets

To regenerate all assets from the source icon:

```bash
npx tsx scripts/generate-ios-assets.ts
```

Source icon: `attached_assets/generated_images/trucknav_pro_app_icon.png`

## Xcode Setup

After running `npx cap sync ios` and `npx cap open ios`:

1. Select the App target in Xcode
2. Go to **Signing & Capabilities** tab
3. Sign in with your Apple Developer account
4. Enable **Automatically Manage Signing**
5. Set Bundle Identifier to: `uk.co.bespokemarketingai.trucknavpro`

### Required Capabilities
Add these in Signing & Capabilities:
- **Background Modes**: Location updates, Background fetch, Remote notifications
- **Push Notifications**

## App Store Screenshots

You'll need to capture screenshots from iOS Simulator for:
- iPhone 6.7" (1290x2796) - iPhone 15 Pro Max
- iPhone 6.5" (1284x2778) - iPhone 14 Plus  
- iPhone 5.5" (1242x2208) - iPhone 8 Plus
- iPad Pro 12.9" (2048x2732) - if supporting iPad

Capture screenshots using: `Cmd + S` in iOS Simulator

# iOS Assets for TruckNav Pro

## Required App Icons

Create these icon files from your 1024x1024 source image:

### iPhone Icons
| Filename | Size | Purpose |
|----------|------|---------|
| Icon-20@2x.png | 40x40 | Notification |
| Icon-20@3x.png | 60x60 | Notification |
| Icon-29@2x.png | 58x58 | Settings |
| Icon-29@3x.png | 87x87 | Settings |
| Icon-40@2x.png | 80x80 | Spotlight |
| Icon-40@3x.png | 120x120 | Spotlight |
| Icon-60@2x.png | 120x120 | App Icon |
| Icon-60@3x.png | 180x180 | App Icon |

### iPad Icons
| Filename | Size | Purpose |
|----------|------|---------|
| Icon-20.png | 20x20 | Notification |
| Icon-20@2x.png | 40x40 | Notification |
| Icon-29.png | 29x29 | Settings |
| Icon-29@2x.png | 58x58 | Settings |
| Icon-40.png | 40x40 | Spotlight |
| Icon-40@2x.png | 80x80 | Spotlight |
| Icon-76.png | 76x76 | App Icon |
| Icon-76@2x.png | 152x152 | App Icon |
| Icon-83.5@2x.png | 167x167 | App Icon (iPad Pro) |

### App Store
| Filename | Size | Purpose |
|----------|------|---------|
| Icon-1024.png | 1024x1024 | App Store |

## Splash Screen Images

Place in `splash/` folder:
- splash-2732x2732.png (Universal)
- splash-1242x2688.png (iPhone XS Max)
- splash-1125x2436.png (iPhone X/XS)
- splash-828x1792.png (iPhone XR)

## Quick Setup

1. Create a 1024x1024 PNG icon with your truck logo
2. Use a tool like https://appicon.co to generate all sizes
3. Copy generated icons to `AppIcon.appiconset/`
4. Run `npx cap sync ios` to update the iOS project

## Xcode Configuration

After running `npx cap open ios`:
1. Select the App target
2. Go to Signing & Capabilities
3. Add these capabilities:
   - Background Modes: Location updates, Background fetch, Remote notifications
   - Push Notifications
4. Set Team to your Apple Developer account
5. Set Bundle Identifier to: uk.co.bespokemarketingai.trucknavpro

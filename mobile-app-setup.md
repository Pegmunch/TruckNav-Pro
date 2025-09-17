# TruckNav Pro Mobile App Distribution Guide

## Overview
Convert TruckNav Pro web application to native mobile apps for distribution on Chinese and international Android app stores.

## Target App Stores

### Chinese Android Stores
- **Tencent MyApp (腾讯应用宝)** - China's largest Android store
- **Huawei AppGallery (华为应用市场)** - Huawei ecosystem
- **Xiaomi GetApps (小米应用商店)** - Xiaomi devices
- **Baidu Mobile Assistant (百度手机助手)** - Baidu ecosystem

### International Stores
- **Google Play Store** - Global Android distribution
- **Samsung Galaxy Store** - Samsung devices

## Recommended Approach: Expo/React Native

### Step 1: Create New Expo Project
```bash
# Create new Expo project for mobile version
npx create-expo-app TruckNavMobile --template
cd TruckNavMobile
```

### Step 2: Install Required Dependencies
```bash
# Core navigation and UI
npm install @react-navigation/native @react-navigation/stack
npm install react-native-screens react-native-safe-area-context
npm install @react-native-community/geolocation
npm install react-native-maps
npm install @react-native-async-storage/async-storage

# HTTP and state management
npm install @tanstack/react-query axios
npm install react-hook-form @hookform/resolvers
npm install zod

# UI components
npm install react-native-elements react-native-vector-icons
npm install react-native-paper
```

### Step 3: Port Core Components
1. **Route Planning Logic** - Convert route-planning-panel.tsx
2. **Navigation System** - Convert navigation.tsx with native maps
3. **Vehicle Profiles** - Convert vehicle-profile-setup.tsx
4. **Journey History** - Convert location/journey management
5. **Settings & Preferences** - Convert theme and measurement systems

### Step 4: Configure for Chinese Market

#### App Store Specific Requirements

**Tencent MyApp (腾讯应用宝)**
- Package name: `com.trucknav.pro.cn`
- Required certificates: Chinese business license
- Content compliance: No Google services
- Localization: Simplified Chinese mandatory

**Huawei AppGallery**
- HMS Core integration (instead of Google Play Services)
- Huawei Map Kit (instead of Google Maps)
- Package signing: Huawei certificate

**Xiaomi GetApps**
- Mi Account integration optional
- MIUI optimizations recommended
- Package name: `com.trucknav.pro.xiaomi`

**Baidu Mobile Assistant**
- Baidu Maps integration recommended
- Baidu analytics integration
- Chinese content compliance

### Step 5: Build Configuration

#### app.json Configuration
```json
{
  "expo": {
    "name": "TruckNav Pro",
    "slug": "trucknav-pro",
    "version": "1.0.0",
    "platforms": ["ios", "android"],
    "android": {
      "package": "com.trucknav.pro",
      "versionCode": 1,
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "INTERNET",
        "ACCESS_NETWORK_STATE"
      ]
    },
    "plugins": [
      ["expo-location", {
        "locationAlwaysAndWhenInUsePermission": "This app needs access to location for truck navigation."
      }]
    ]
  }
}
```

### Step 6: Store-Specific Builds

#### For Chinese Stores (No Google Services)
```bash
# Build APK without Google services
eas build --platform android --profile china
```

#### For Google Play Store
```bash
# Build AAB for Google Play
eas build --platform android --profile production
```

### Step 7: Deployment Process

1. **Test Builds**
   - Create development builds for testing
   - Test on various Android devices
   - Verify functionality without internet

2. **Store Submissions**
   - Prepare store listings in Chinese and English
   - Create screenshots for different screen sizes
   - Submit to each store individually

3. **Compliance Requirements**
   - Chinese stores: ICP license, content review
   - Privacy policy in local languages
   - Terms of service compliance

## Development Timeline

### Phase 1: Setup & Core Conversion (2-3 weeks)
- Expo project setup
- Core component conversion
- Basic navigation implementation

### Phase 2: Store-Specific Optimization (1-2 weeks)
- Chinese store compliance
- Alternative map integrations
- Localization implementation

### Phase 3: Testing & Deployment (1-2 weeks)
- Multi-device testing
- Store submission process
- Initial app store optimization

## Key Considerations

### Technical
- **Map Services**: Use different providers for Chinese vs international versions
- **Location Services**: Coordinate system differences in China (GCJ-02 vs WGS-84)
- **Network**: Handle Great Firewall restrictions
- **Performance**: Optimize for various Android versions and devices

### Legal & Compliance
- **Data Privacy**: GDPR (EU), CCPA (US), PIPL (China)
- **Content Restrictions**: China's content regulations
- **Business Registration**: Required for some Chinese stores

### Localization
- **Languages**: English, Simplified Chinese, Traditional Chinese
- **Cultural Adaptation**: Different traffic rules, road signage
- **Units**: Metric system preference in international markets

## Next Steps

1. Set up Expo development environment
2. Start with core component conversion
3. Implement store-specific configurations
4. Begin testing on target devices
5. Prepare store listing materials

This conversion process will create native Android apps that can be distributed on all target app stores while maintaining the functionality of your current web application.
# TruckNav Pro Mobile Conversion - Step-by-Step Process

## Phase 1: Development Environment Setup

### 1. Install Expo CLI and EAS CLI
```bash
npm install -g @expo/cli eas-cli
```

### 2. Create New Mobile Project
```bash
npx create-expo-app TruckNavMobile --template blank-typescript
cd TruckNavMobile
```

### 3. Copy Configuration Files
- Copy `mobile-configs/app.config.js` to project root
- Copy `mobile-configs/eas.json` to project root  
- Copy `mobile-configs/package.json` dependencies to your package.json

### 4. Install Dependencies
```bash
npm install
```

---

## Phase 2: Core Component Conversion

### 1. Port Data Models
```javascript
// Copy from current web app
// shared/schema.ts → src/types/schema.ts
// Update imports to use React Native compatible libraries
```

### 2. Convert Route Planning Component
```javascript
// src/components/RoutePlanning.tsx
// Port from: client/src/components/route/route-planning-panel.tsx
// Replace web form components with React Native equivalents
import { TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Button, Card } from 'react-native-elements';
```

### 3. Convert Navigation Component
```javascript
// src/screens/NavigationScreen.tsx
// Port from: client/src/pages/navigation.tsx
// Integrate react-native-maps for native mapping
import MapView, { Marker, Polyline } from 'react-native-maps';
```

### 4. Convert Vehicle Profiles
```javascript
// src/components/VehicleProfile.tsx
// Port from: client/src/components/vehicle/vehicle-profile-setup.tsx
// Use React Native form components
```

### 5. Convert Journey History
```javascript
// src/components/JourneyHistory.tsx
// Port journey history and favorites functionality
// Use FlatList for efficient list rendering
```

---

## Phase 3: Store-Specific Configurations

### 1. For Chinese Stores (No Google Services)
```javascript
// src/services/MapService.ts
const MapService = {
  // Use Amap (高德地图) for China builds
  initMap: () => {
    if (Config.STORE_NAME === 'china') {
      return AMapAPI.init();
    } else {
      return GoogleMapsAPI.init();
    }
  }
};
```

### 2. Location Services Configuration
```javascript
// src/services/LocationService.ts
import * as Location from 'expo-location';

// Handle Chinese coordinate system conversion
const LocationService = {
  getCurrentPosition: async () => {
    const location = await Location.getCurrentPositionAsync();
    
    // Convert to GCJ-02 for Chinese stores
    if (Config.STORE_NAME === 'china') {
      return convertWGS84ToGCJ02(location.coords);
    }
    return location.coords;
  }
};
```

---

## Phase 4: Build and Distribution

### 1. Development Testing
```bash
# Test on iOS simulator
npm run ios

# Test on Android emulator  
npm run android

# Test on physical devices
expo start
```

### 2. Create Store-Specific Builds

#### For Tencent MyApp
```bash
eas build --platform android --profile tencent
```

#### For Huawei AppGallery
```bash
eas build --platform android --profile huawei
```

#### For Xiaomi GetApps
```bash
eas build --platform android --profile xiaomi
```

#### For Baidu Mobile Assistant
```bash
eas build --platform android --profile baidu
```

#### For Google Play Store
```bash
eas build --platform android --profile google-play
```

### 3. Test APK Files
```bash
# Download and test each APK on target devices
# Verify functionality without Google services for Chinese builds
# Test location accuracy and map functionality
```

---

## Phase 5: Store Submissions

### 1. Prepare Store Assets

#### App Icons (Required Sizes)
- **1024x1024** - High resolution icon
- **512x512** - Store listing
- **192x192** - Android launcher
- **144x144** - Android launcher (hdpi)
- **96x96** - Android launcher (xhdpi)

#### Screenshots (Per Store)
- **Phone Screenshots**: 5-8 screenshots showing key features
- **Tablet Screenshots**: Optional but recommended
- **Feature Graphic**: 1024x500 for Google Play

#### App Descriptions
```
English Version:
"TruckNav Pro - Professional truck navigation app designed for heavy goods vehicles (HGVs). Features intelligent routing that avoids low bridges, weight restrictions, and narrow roads unsuitable for trucks."

Chinese Version:
"TruckNav Pro - 专业货车导航应用，专为重型货车(HGV)设计。具有智能路线规划功能，避开低桥梁、重量限制和不适合货车行驶的狭窄道路。"
```

### 2. Submit to Stores

#### Tencent MyApp Submission
1. Register at https://open.qq.com/
2. Upload APK and store assets
3. Fill out app information in Chinese
4. Submit for review (3-5 business days)

#### Huawei AppGallery Submission  
1. Register at https://developer.huawei.com/
2. Upload HMS-integrated APK
3. Complete app information and privacy policy
4. Submit for review (1-3 business days)

#### Xiaomi GetApps Submission
1. Register at https://dev.mi.com/
2. Upload APK with MIUI optimizations
3. Complete store listing in Chinese
4. Submit for review (2-3 business days)

#### Baidu Mobile Assistant Submission
1. Register at https://app.baidu.com/
2. Upload APK with Baidu services integration
3. Complete app information and categorization
4. Submit for review (3-7 business days)

---

## Phase 6: Post-Launch Management

### 1. Monitor App Performance
```javascript
// Add analytics for Chinese stores
import { Analytics } from '@react-native-firebase/analytics';

// Different analytics for different stores
const trackEvent = (event, params) => {
  if (Config.STORE_NAME === 'china') {
    // Use Chinese analytics service
    BaiduAnalytics.track(event, params);
  } else {
    // Use Firebase Analytics
    Analytics().logEvent(event, params);
  }
};
```

### 2. Handle User Feedback
- Monitor store reviews in Chinese and English
- Respond to user feedback promptly
- Address common issues in app updates

### 3. Regular Updates
- Keep apps updated across all stores
- Maintain compliance with changing store policies
- Add new features based on user feedback

---

## Key Code Components to Convert

### 1. API Client (src/services/ApiClient.ts)
```javascript
import axios from 'axios';
import { Config } from '../config';

const ApiClient = axios.create({
  baseURL: Config.API_BASE_URL,
  timeout: 10000,
});

// Handle different API endpoints for Chinese vs international versions
const getApiEndpoint = (endpoint) => {
  if (Config.STORE_NAME === 'china') {
    return `${Config.API_BASE_URL_CN}${endpoint}`;
  }
  return `${Config.API_BASE_URL}${endpoint}`;
};
```

### 2. Navigation Service (src/services/NavigationService.ts)
```javascript
import { Navigation } from '@react-navigation/native';

class NavigationService {
  navigate(routeName, params) {
    Navigation.navigate(routeName, params);
  }
  
  // Track navigation for journey history
  trackRouteStart(routeData) {
    // Port journey tracking logic from web app
  }
}
```

### 3. Storage Service (src/services/StorageService.ts)
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

class StorageService {
  async saveVehicleProfile(profile) {
    await AsyncStorage.setItem('vehicleProfile', JSON.stringify(profile));
  }
  
  async getJourneyHistory() {
    const history = await AsyncStorage.getItem('journeyHistory');
    return history ? JSON.parse(history) : [];
  }
}
```

---

## Timeline and Resources

### Development Timeline
- **Week 1-2**: Environment setup and core component conversion
- **Week 3-4**: Store-specific configurations and testing
- **Week 5-6**: Store submissions and review process
- **Week 7-8**: Launch and initial optimization

### Required Resources
- **Developer Time**: 200-300 hours for full conversion
- **Testing Devices**: Android devices from major Chinese manufacturers
- **Legal Support**: For Chinese market compliance
- **Translation Services**: Professional Chinese localization

### Budget Estimate
- **Development**: $15,000-25,000 USD
- **Legal/Compliance**: $3,000-5,000 USD
- **Translation/Localization**: $2,000-3,000 USD
- **Store Fees**: $500-1,000 USD
- **Total**: $20,500-34,000 USD

This comprehensive conversion process will create native mobile apps that can be successfully distributed on all target Chinese and international Android app stores while maintaining the full functionality of your current TruckNav Pro web application.
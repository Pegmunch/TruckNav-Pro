// Expo app configuration for TruckNav Pro mobile apps
// Supports different builds for Chinese vs International app stores

const IS_CHINA_BUILD = process.env.EXPO_PROFILE === 'china';

export default {
  expo: {
    name: IS_CHINA_BUILD ? 'TruckNav Pro CN' : 'TruckNav Pro',
    slug: IS_CHINA_BUILD ? 'trucknav-pro-cn' : 'trucknav-pro',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#1a1a1a'
    },
    assetBundlePatterns: [
      '**/*'
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: IS_CHINA_BUILD ? 'com.trucknav.pro.cn' : 'com.trucknav.pro'
    },
    android: {
      package: IS_CHINA_BUILD ? 'com.trucknav.pro.cn' : 'com.trucknav.pro',
      versionCode: 1,
      compileSdkVersion: 34,
      targetSdkVersion: 34,
      permissions: [
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'ACCESS_BACKGROUND_LOCATION',
        'INTERNET',
        'ACCESS_NETWORK_STATE',
        'ACCESS_WIFI_STATE',
        'VIBRATE',
        'WAKE_LOCK'
      ],
      config: {
        googleMaps: {
          apiKey: IS_CHINA_BUILD ? null : process.env.GOOGLE_MAPS_API_KEY
        }
      }
    },
    web: {
      favicon: './assets/favicon.png'
    },
    plugins: [
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: 'This app needs access to location for truck navigation and route planning.',
          locationWhenInUsePermission: 'This app needs access to location when in use for navigation.'
        }
      ],
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#ffffff',
          sounds: ['./assets/notification.wav']
        }
      ],
      'expo-font'
    ],
    extra: {
      // Environment-specific configurations
      apiBaseUrl: IS_CHINA_BUILD 
        ? 'https://api-cn.trucknav.pro' 
        : 'https://api.trucknav.pro',
      mapProvider: IS_CHINA_BUILD ? 'amap' : 'google',
      analyticsEnabled: !IS_CHINA_BUILD,
      storeName: IS_CHINA_BUILD ? 'china' : 'international',
      eas: {
        projectId: '550e8400-e29b-41d4-a716-446655440000'
      }
    }
  }
};
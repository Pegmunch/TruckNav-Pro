import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // App Identity - Bespoke Marketing.Ai Ltd
  appId: 'uk.co.bespokemarketingai.trucknavpro',
  appName: 'TruckNav Pro',
  webDir: 'dist/public',
  
  // App Version (update before each App Store submission)
  // Version format: MAJOR.MINOR.PATCH
  // Build number: increment for each upload to App Store Connect
  
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    url: undefined,
    cleartext: false,
    hostname: 'trucknavpro.app'
  },
  
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      backgroundColor: '#1E293B',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'medium',
      spinnerColor: '#DC2626',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1E293B',
      overlaysWebView: false
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
      style: 'dark'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#DC2626',
      sound: 'notification.wav'
    },
    BackgroundRunner: {
      label: 'uk.co.bespokemarketingai.trucknavpro.background',
      src: 'background.js',
      event: 'backgroundFetch',
      repeat: true,
      interval: 15
    },
    Geolocation: {
      // iOS location permission descriptions
    },
    Network: {
      // Monitor network connectivity
    },
    App: {
      // App lifecycle events
    }
  },
  
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
    backgroundColor: '#1E293B',
    limitsNavigationsToAppBoundDomains: false,
    preferredContentMode: 'mobile',
    scheme: 'trucknavpro',
    // Enable background modes for navigation
    // Note: Configure in Xcode - Signing & Capabilities
  },
  
  android: {
    backgroundColor: '#1E293B',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    // Flavor for production builds
    flavor: 'production'
  }
};

export default config;
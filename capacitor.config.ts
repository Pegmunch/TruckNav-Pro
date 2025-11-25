import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.trucknav.pro',
  appName: 'TruckNav Pro',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    url: undefined,
    cleartext: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
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
      backgroundColor: '#1E293B'
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
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
      label: 'com.trucknav.pro.background',
      src: 'background.js',
      event: 'backgroundFetch',
      repeat: true,
      interval: 15
    },
    CarPlay: {
      enabled: true,
      showAlternativeRoutesButton: true,
      showMuteButton: true,
      showSpeedLimitButton: true,
      showTrafficIncidentsButton: true,
      displayMode: 'navigation'
    }
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
    backgroundColor: '#1E293B',
    limitsNavigationsToAppBoundDomains: false
  },
  android: {
    backgroundColor: '#1E293B',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;
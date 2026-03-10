/**
 * Capacitor Bridge for TruckNav Pro
 * Handles native functionality when running as a mobile app
 */

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Geolocation } from '@capacitor/geolocation';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Browser } from '@capacitor/browser';
import { Network } from '@capacitor/network';
import { Preferences } from '@capacitor/preferences';
import { BackgroundRunner } from '@capacitor/background-runner';

export class CapacitorBridge {
  private static instance: CapacitorBridge;
  private isNative: boolean;
  
  private constructor() {
    this.isNative = Capacitor.isNativePlatform();
  }
  
  static getInstance(): CapacitorBridge {
    if (!CapacitorBridge.instance) {
      CapacitorBridge.instance = new CapacitorBridge();
    }
    return CapacitorBridge.instance;
  }
  
  /**
   * Check if running as native app
   */
  isNativeApp(): boolean {
    return this.isNative;
  }
  
  /**
   * Get current platform
   */
  getPlatform(): 'ios' | 'android' | 'web' {
    return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
  }
  
  /**
   * Initialize native features
   */
  async initialize(): Promise<void> {
    if (!this.isNative) return;
    
    try {
      // Hide splash screen after app loads
      await SplashScreen.hide();
      
      // Set status bar style
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#1E293B' });
      
      // Setup app state listeners
      App.addListener('appStateChange', ({ isActive }) => {
        console.log('[Capacitor] App state changed:', isActive ? 'active' : 'background');
        if (isActive) {
          this.handleAppResume();
        } else {
          this.handleAppPause();
        }
      });
      
      // Setup network monitoring
      Network.addListener('networkStatusChange', status => {
        console.log('[Capacitor] Network status:', status.connected ? 'online' : 'offline');
        window.dispatchEvent(new CustomEvent('network-status', { detail: status }));
      });
      
      // Setup push notifications if permission granted
      await this.setupPushNotifications();
      
      // Setup background tasks
      await this.setupBackgroundTasks();
      
      console.log('[Capacitor] Native bridge initialized');
    } catch (error) {
      console.error('[Capacitor] Initialization error:', error);
    }
  }
  
  /**
   * Request location permissions
   */
  async requestLocationPermissions(): Promise<boolean> {
    if (!this.isNative) return true;
    
    try {
      const permission = await Geolocation.requestPermissions();
      // Only return true if permission is actually granted
      return permission.location === 'granted';
    } catch (error) {
      console.error('[Capacitor] Location permission error:', error);
      return false;
    }
  }
  
  /**
   * Get current GPS position
   */
  async getCurrentPosition(): Promise<GeolocationPosition | null> {
    if (!this.isNative) {
      // Use web geolocation API
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve(position),
          () => resolve(null)
        );
      });
    }
    
    try {
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });
      
      // Convert to web GeolocationPosition format
      return {
        coords: {
          latitude: coordinates.coords.latitude,
          longitude: coordinates.coords.longitude,
          accuracy: coordinates.coords.accuracy || 0,
          altitude: coordinates.coords.altitude || null,
          altitudeAccuracy: coordinates.coords.altitudeAccuracy || null,
          heading: coordinates.coords.heading || null,
          speed: coordinates.coords.speed || null
        },
        timestamp: coordinates.timestamp
      } as GeolocationPosition;
    } catch (error) {
      console.error('[Capacitor] Get position error:', error);
      return null;
    }
  }
  
  /**
   * Watch GPS position
   */
  async watchPosition(callback: (position: GeolocationPosition | null) => void): Promise<string | number> {
    if (!this.isNative) {
      // Use web geolocation API
      return navigator.geolocation.watchPosition(
        (position) => callback(position),
        () => callback(null),
        { enableHighAccuracy: true }
      );
    }
    
    const watchId = await Geolocation.watchPosition(
      { enableHighAccuracy: true },
      (position, err) => {
        if (err) {
          callback(null);
        } else if (position) {
          callback({
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy || 0,
              altitude: position.coords.altitude || null,
              altitudeAccuracy: position.coords.altitudeAccuracy || null,
              heading: position.coords.heading || null,
              speed: position.coords.speed || null
            },
            timestamp: position.timestamp
          } as GeolocationPosition);
        }
      }
    );
    
    return watchId;
  }
  
  /**
   * Clear GPS watch
   */
  async clearWatch(watchId: string | number): Promise<void> {
    if (!this.isNative) {
      navigator.geolocation.clearWatch(watchId as number);
      return;
    }
    
    await Geolocation.clearWatch({ id: watchId as string });
  }
  
  /**
   * Vibrate device
   */
  async vibrate(style: 'light' | 'medium' | 'heavy' = 'medium'): Promise<void> {
    if (!this.isNative) return;
    
    const impactStyle = style === 'light' ? ImpactStyle.Light :
                       style === 'heavy' ? ImpactStyle.Heavy :
                       ImpactStyle.Medium;
    
    await Haptics.impact({ style: impactStyle });
  }
  
  /**
   * Show local notification
   */
  async showNotification(title: string, body: string, id?: number): Promise<void> {
    if (!this.isNative) return;
    
    await LocalNotifications.schedule({
      notifications: [{
        title,
        body,
        id: id || Date.now(),
        schedule: { at: new Date(Date.now() + 100) },
        sound: undefined,
        attachments: undefined,
        actionTypeId: '',
        extra: null
      }]
    });
  }
  
  /**
   * Open external URL
   */
  async openUrl(url: string): Promise<void> {
    if (!this.isNative) {
      window.open(url, '_blank');
      return;
    }
    
    await Browser.open({ url });
  }
  
  /**
   * Store data locally
   */
  async setPreference(key: string, value: any): Promise<void> {
    if (!this.isNative) {
      localStorage.setItem(key, JSON.stringify(value));
      return;
    }
    
    await Preferences.set({ key, value: JSON.stringify(value) });
  }
  
  /**
   * Retrieve stored data
   */
  async getPreference(key: string): Promise<any> {
    if (!this.isNative) {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    }
    
    const { value } = await Preferences.get({ key });
    return value ? JSON.parse(value) : null;
  }
  
  /**
   * Setup push notifications
   */
  private async setupPushNotifications(): Promise<void> {
    try {
      // Request permission
      const permission = await PushNotifications.requestPermissions();
      
      if (permission.receive === 'granted') {
        // Register for push
        await PushNotifications.register();
        
        // Handle registration
        PushNotifications.addListener('registration', token => {
          console.log('[Push] Registration token:', token.value);
          window.dispatchEvent(new CustomEvent('push-token', { detail: token.value }));
        });
        
        // Handle incoming notifications
        PushNotifications.addListener('pushNotificationReceived', notification => {
          console.log('[Push] Notification received:', notification);
          window.dispatchEvent(new CustomEvent('push-notification', { detail: notification }));
        });
        
        // Handle notification actions
        PushNotifications.addListener('pushNotificationActionPerformed', action => {
          console.log('[Push] Action performed:', action);
          window.dispatchEvent(new CustomEvent('push-action', { detail: action }));
        });
      }
    } catch (error) {
      console.error('[Push] Setup error:', error);
    }
  }
  
  /**
   * Setup background tasks
   */
  private async setupBackgroundTasks(): Promise<void> {
    if (this.getPlatform() === 'web') return;
    
    try {
      // Configure background runner
      BackgroundRunner.addListener('backgroundFetch', async () => {
        console.log('[Background] Task running');
        
        // Perform background sync
        window.dispatchEvent(new CustomEvent('background-sync'));
        
        // Complete within 30 seconds
        setTimeout(() => {
          BackgroundRunner.dispatchEvent({
            label: 'com.trucknav.pro.background',
            event: 'complete',
            details: {}
          });
        }, 25000);
      });
    } catch (error) {
      console.error('[Background] Setup error:', error);
    }
  }
  
  /**
   * Handle app resume
   */
  private handleAppResume(): void {
    window.dispatchEvent(new CustomEvent('app-resume'));
  }
  
  /**
   * Handle app pause
   */
  private handleAppPause(): void {
    window.dispatchEvent(new CustomEvent('app-pause'));
  }
  
  /**
   * Check network status
   */
  async getNetworkStatus(): Promise<{ connected: boolean; connectionType: string }> {
    if (!this.isNative) {
      return {
        connected: navigator.onLine,
        connectionType: 'unknown'
      };
    }
    
    const status = await Network.getStatus();
    return {
      connected: status.connected,
      connectionType: status.connectionType || 'unknown'
    };
  }
}

// Export singleton instance
export const capacitorBridge = CapacitorBridge.getInstance();
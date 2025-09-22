import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, X, Smartphone, Monitor } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallPromptProps {
  className?: string;
  showBadge?: boolean;
}

/**
 * PWA Installation Prompt Component
 * Handles the beforeinstallprompt event and provides a user-friendly install experience
 * Shows installation options for mobile and desktop platforms
 */
export function PWAInstallPrompt({ className = "", showBadge = true }: PWAInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [platform, setPlatform] = useState<'mobile' | 'desktop' | 'unknown'>('unknown');

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    setPlatform(isMobile ? 'mobile' : 'desktop');

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone ||
                        document.referrer.includes('android-app://');
    
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Handle beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      const beforeInstallPrompt = e as BeforeInstallPromptEvent;
      e.preventDefault();
      console.log('[PWA Install] Before install prompt triggered');
      
      setDeferredPrompt(beforeInstallPrompt);
      
      // Show prompt after a short delay to avoid immediate popup
      setTimeout(() => {
        setShowInstallPrompt(true);
      }, 3000);
    };

    // Handle app installed event
    const handleAppInstalled = () => {
      console.log('[PWA Install] App was installed');
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);
    console.log('[PWA Install] Showing install prompt');

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      console.log('[PWA Install] User choice:', choiceResult.outcome);
      
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA Install] User accepted installation');
        setShowInstallPrompt(false);
      } else {
        console.log('[PWA Install] User dismissed installation');
        setShowInstallPrompt(false);
      }
    } catch (error) {
      console.error('[PWA Install] Install prompt failed:', error);
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
    }
  };

  const dismissPrompt = () => {
    setShowInstallPrompt(false);
    // Don't show again for this session
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't show if recently dismissed
  const lastDismissed = localStorage.getItem('pwa-install-dismissed');
  if (lastDismissed && Date.now() - parseInt(lastDismissed) < 24 * 60 * 60 * 1000) {
    return null;
  }

  // Don't show if already installed or no prompt available
  if (isInstalled || !showInstallPrompt || !deferredPrompt) {
    // Show installed badge if applicable
    if (isInstalled && showBadge) {
      return (
        <div className={`pwa-install-status ${className}`} data-testid="pwa-installed-badge">
          <Badge 
            variant="secondary"
            className="fixed bottom-4 left-4 flex items-center gap-1 px-2 py-1 text-xs z-40"
          >
            <Download className="h-3 w-3 text-green-600" />
            <span>Installed</span>
          </Badge>
        </div>
      );
    }
    return null;
  }

  const PlatformIcon = platform === 'mobile' ? Smartphone : Monitor;
  const platformText = platform === 'mobile' ? 'phone' : 'computer';

  return (
    <div className={`pwa-install-prompt ${className}`} data-testid="pwa-install-prompt">
      <Alert 
        className="fixed bottom-4 left-4 max-w-sm z-50 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800"
        data-testid="alert-install-prompt"
      >
        <PlatformIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertTitle className="text-blue-800 dark:text-blue-200">
          Install TruckNav Pro
        </AlertTitle>
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          <p className="mb-3">
            Install TruckNav Pro on your {platformText} for:
          </p>
          <ul className="text-sm space-y-1 mb-3">
            <li>• Faster access and performance</li>
            <li>• Offline navigation capability</li>
            <li>• Push notifications for alerts</li>
            <li>• Full-screen navigation experience</li>
          </ul>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleInstallClick}
              disabled={isInstalling}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-install-pwa"
            >
              {isInstalling ? (
                <>
                  <Download className="h-3 w-3 mr-1 animate-pulse" />
                  Installing...
                </>
              ) : (
                <>
                  <Download className="h-3 w-3 mr-1" />
                  Install App
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissPrompt}
              data-testid="button-dismiss-install"
            >
              <X className="h-3 w-3 mr-1" />
              Not Now
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}

/**
 * Hook for checking PWA installation status
 */
export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone ||
                        document.referrer.includes('android-app://');
    
    setIsInstalled(isStandalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      const beforeInstallPrompt = e as BeforeInstallPromptEvent;
      e.preventDefault();
      setDeferredPrompt(beforeInstallPrompt);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      return choiceResult.outcome === 'accepted';
    } catch (error) {
      console.error('PWA install failed:', error);
      return false;
    }
  };

  return {
    canInstall,
    isInstalled,
    install
  };
}

/**
 * PWA Feature Detection Component
 * Shows available PWA features and capabilities
 */
export function PWAFeatureSupport({ className = "" }: { className?: string }) {
  const [features, setFeatures] = useState({
    serviceWorker: false,
    pushNotifications: false,
    backgroundSync: false,
    installPrompt: false,
    offlineCapable: false
  });

  useEffect(() => {
    const checkFeatures = () => {
      setFeatures({
        serviceWorker: 'serviceWorker' in navigator,
        pushNotifications: 'PushManager' in window,
        backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
        installPrompt: 'onbeforeinstallprompt' in window,
        offlineCapable: 'caches' in window && 'serviceWorker' in navigator
      });
    };

    checkFeatures();
  }, []);

  const supportedFeatures = Object.entries(features).filter(([_, supported]) => supported);
  const featureLabels: Record<string, string> = {
    serviceWorker: 'Service Worker',
    pushNotifications: 'Push Notifications',
    backgroundSync: 'Background Sync',
    installPrompt: 'App Installation',
    offlineCapable: 'Offline Support'
  };

  return (
    <div className={`pwa-feature-support ${className}`} data-testid="pwa-features">
      <div className="flex flex-wrap gap-1">
        {supportedFeatures.map(([feature, _]) => (
          <Badge 
            key={feature}
            variant="secondary"
            className="text-xs"
            data-testid={`feature-${feature}`}
          >
            ✓ {featureLabels[feature]}
          </Badge>
        ))}
      </div>
    </div>
  );
}
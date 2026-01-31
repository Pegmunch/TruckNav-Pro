import { createContext, useContext, useState, useCallback, useEffect, ReactNode, useMemo } from 'react';
import Joyride, { Step, CallBackProps, STATUS, EVENTS, ACTIONS } from 'react-joyride';
import { useIsMobile } from '@/hooks/use-mobile';

const ONBOARDING_STORAGE_KEY = 'trucknav_onboarding_v2_completed';
const FLEET_ONBOARDING_STORAGE_KEY = 'trucknav_fleet_onboarding_v1_completed';

interface OnboardingContextType {
  isOnboardingComplete: boolean;
  isFleetOnboardingComplete: boolean;
  startTour: () => void;
  startFleetTour: () => void;
  resetTour: () => void;
  resetFleetTour: () => void;
  skipTour: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}

interface OnboardingProviderProps {
  children: ReactNode;
  isReady?: boolean;
  isFleetPage?: boolean;
}

export function OnboardingProvider({ children, isReady = true, isFleetPage = false }: OnboardingProviderProps) {
  const isMobile = useIsMobile();
  const [runTour, setRunTour] = useState(false);
  const [runFleetTour, setRunFleetTour] = useState(false);
  
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(() => {
    try {
      return localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [isFleetOnboardingComplete, setIsFleetOnboardingComplete] = useState(() => {
    try {
      return localStorage.getItem(FLEET_ONBOARDING_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const navigationTourSteps: Step[] = useMemo(() => [
    {
      target: '[data-tour-id="menu-button"]',
      content: 'Welcome to TruckNav Pro! Tap the menu button to access route planning, vehicle settings, and more.',
      placement: 'right',
      disableBeacon: true,
      title: 'Menu Button'
    },
    {
      target: '[data-tour-id="header-settings"]',
      content: 'Use the settings gear to quickly change your vehicle profile, language, and theme preferences.',
      placement: 'bottom',
      title: 'Quick Settings'
    },
    {
      target: '[data-tour-id="right-controls"]',
      content: 'Map controls: Zoom in/out, toggle 3D view, show live traffic, switch to satellite view. The red-bordered button shows reported incidents on the map.',
      placement: 'left',
      title: 'Map Controls'
    },
    {
      target: '[data-tour-id="speedometer"]',
      content: 'The speedometer shows your current speed, speed limit, and road information during navigation.',
      placement: 'top',
      title: 'Speed Display'
    },
    {
      target: '[data-tour-id="nav-button"]',
      content: 'During navigation, use this button to recenter the map on your current position.',
      placement: 'right',
      title: 'Navigation Controls'
    },
    {
      target: '[data-tour-id="voice-button"]',
      content: 'Enable voice commands to report traffic incidents hands-free while driving. Say "report traffic" or "report accident".',
      placement: 'right',
      title: 'Voice Commands'
    },
    {
      target: '[data-tour-id="incident-button"]',
      content: 'The more users report traffic, the more accurate live data becomes! To report manually: Use Preview mode while stationary. If navigating, cancel your route, use Recent Destinations to re-enter, press Preview (orange), then tap Report Incident. Press Go to continue your route.',
      placement: 'right',
      title: 'Traffic Reporting'
    },
    ...(!isMobile ? [{
      target: '[data-tour-id="desktop-fleet-link"]',
      content: 'Access the Fleet Management system from here to manage your vehicles, drivers, compliance, and more.',
      placement: 'bottom' as const,
      title: 'Fleet Management'
    }] : [])
  ], [isMobile]);

  const fleetTourSteps: Step[] = useMemo(() => [
    {
      target: '[data-testid="tab-vehicles"]',
      content: 'Manage your fleet vehicles here. Add new trucks, view details, and track registration, MOT, and maintenance status.',
      placement: 'bottom',
      disableBeacon: true,
      title: 'Vehicle Registry'
    },
    {
      target: '[data-testid="tab-operators"]',
      content: 'Manage your drivers and operators. Track license information, Driver CPC expiry, and tachograph card details.',
      placement: 'bottom',
      title: 'Operator Management'
    },
    {
      target: '[data-testid="tab-service"]',
      content: 'Track all maintenance and service records. Monitor MOT dates, routine services, and repairs with cost tracking.',
      placement: 'bottom',
      title: 'Service Records'
    },
    {
      target: '[data-testid="tab-fuel"]',
      content: 'Log fuel fill-ups and track consumption. Automatically calculates MPG and monitors fuel efficiency per vehicle.',
      placement: 'bottom',
      title: 'Fuel Consumption'
    },
    {
      target: '[data-testid="tab-documents"]',
      content: 'Store and manage vehicle documents like registration certificates, insurance, and maintenance records.',
      placement: 'bottom',
      title: 'Document Management'
    },
    {
      target: '[data-testid="tab-analytics"]',
      content: 'View cost analytics with charts showing expenses by category, per vehicle, and monthly trends.',
      placement: 'bottom',
      title: 'Cost Analytics'
    },
    {
      target: '[data-testid="tab-incidents"]',
      content: 'Log and track fleet incidents including accidents, damage, breakdowns, and near-misses with severity levels.',
      placement: 'bottom',
      title: 'Incident Logging'
    },
    {
      target: '[data-testid="tab-trips"]',
      content: 'Track trips with profitability analysis. Compare planned vs actual metrics and monitor route efficiency.',
      placement: 'bottom',
      title: 'Trip Tracking'
    },
    {
      target: '[data-testid="tab-compliance"]',
      content: 'Track regulatory compliance including DVLA checks, emission standards, hazmat certifications, and tachograph inspections.',
      placement: 'bottom',
      title: 'Compliance Tracking'
    },
    {
      target: '[data-testid="tab-tracking"]',
      content: 'Real-time GPS tracking dashboard showing all fleet vehicles on an interactive map with status indicators.',
      placement: 'bottom',
      title: 'Live Fleet Tracking'
    },
    {
      target: '[data-testid="tab-behavior"]',
      content: 'Monitor driver behavior with safety scoring. Track speeding, harsh braking, and identify high-risk drivers.',
      placement: 'bottom',
      title: 'Driver Behavior'
    },
    {
      target: '[data-testid="tab-hos"]',
      content: 'Hours of Service compliance tracking. Monitor driving hours, duty status, and detect regulation violations.',
      placement: 'bottom',
      title: 'Hours of Service'
    },
    {
      target: '[data-testid="tab-billing"]',
      content: 'Customer billing portal for managing contracts, rates, trip billing, and revenue analytics.',
      placement: 'bottom',
      title: 'Customer Billing'
    },
    {
      target: '[data-testid="tab-geofencing"]',
      content: 'Create virtual zones for warehouses, customers, and restricted areas. Get alerts for entry and exit events.',
      placement: 'bottom',
      title: 'Geofencing'
    }
  ], []);

  // DISABLED: Auto-start tour removed - users can manually trigger tour from menu
  // This prevents the "NAV" label and tour highlights from appearing unexpectedly
  // To re-enable auto-start, uncomment the effect below
  /*
  useEffect(() => {
    if (isFleetPage && !isFleetOnboardingComplete && isReady) {
      const timer = setTimeout(() => {
        setRunFleetTour(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (!isFleetPage && !isOnboardingComplete && isReady) {
      const timer = setTimeout(() => {
        setRunTour(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isReady, isOnboardingComplete, isFleetOnboardingComplete, isFleetPage]);
  */

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, action, type } = data;
    
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRunTour(false);
      setIsOnboardingComplete(true);
      try {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
      } catch (e) {
        console.warn('Failed to save onboarding state:', e);
      }
    }
    
    if (type === EVENTS.STEP_AFTER && action === ACTIONS.CLOSE) {
      setRunTour(false);
    }
  }, []);

  const handleFleetJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, action, type } = data;
    
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRunFleetTour(false);
      setIsFleetOnboardingComplete(true);
      try {
        localStorage.setItem(FLEET_ONBOARDING_STORAGE_KEY, 'true');
      } catch (e) {
        console.warn('Failed to save fleet onboarding state:', e);
      }
    }
    
    if (type === EVENTS.STEP_AFTER && action === ACTIONS.CLOSE) {
      setRunFleetTour(false);
    }
  }, []);

  const startTour = useCallback(() => {
    setRunTour(true);
  }, []);

  const startFleetTour = useCallback(() => {
    setRunFleetTour(true);
  }, []);

  const resetTour = useCallback(() => {
    try {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to reset onboarding state:', e);
    }
    setIsOnboardingComplete(false);
    setRunTour(true);
  }, []);

  const resetFleetTour = useCallback(() => {
    try {
      localStorage.removeItem(FLEET_ONBOARDING_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to reset fleet onboarding state:', e);
    }
    setIsFleetOnboardingComplete(false);
    setRunFleetTour(true);
  }, []);

  const skipTour = useCallback(() => {
    setRunTour(false);
    setRunFleetTour(false);
    setIsOnboardingComplete(true);
    setIsFleetOnboardingComplete(true);
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
      localStorage.setItem(FLEET_ONBOARDING_STORAGE_KEY, 'true');
    } catch (e) {
      console.warn('Failed to save onboarding state:', e);
    }
  }, []);

  const joyrideStyles = {
    options: {
      primaryColor: '#3b82f6',
      zIndex: 10000,
      arrowColor: '#fff',
      backgroundColor: '#fff',
      textColor: '#1f2937',
      overlayColor: 'rgba(0, 0, 0, 0.5)'
    },
    buttonNext: {
      backgroundColor: '#3b82f6',
      borderRadius: '8px',
      padding: '8px 16px'
    },
    buttonBack: {
      color: '#6b7280',
      marginRight: '8px'
    },
    buttonSkip: {
      color: '#9ca3af'
    },
    tooltip: {
      borderRadius: '12px',
      padding: '16px'
    },
    tooltipTitle: {
      fontSize: '18px',
      fontWeight: 600,
      marginBottom: '8px'
    },
    tooltipContent: {
      fontSize: '14px',
      lineHeight: 1.5
    },
    spotlight: {
      borderRadius: '12px'
    }
  };

  const joyrideLocale = {
    back: 'Back',
    close: 'Close',
    last: 'Done',
    next: 'Next',
    skip: 'Skip Tour'
  };

  return (
    <OnboardingContext.Provider value={{ 
      isOnboardingComplete, 
      isFleetOnboardingComplete,
      startTour, 
      startFleetTour,
      resetTour, 
      resetFleetTour,
      skipTour 
    }}>
      {children}
      <Joyride
        steps={navigationTourSteps}
        run={runTour && !isFleetPage}
        continuous
        showProgress
        showSkipButton
        scrollToFirstStep
        disableOverlayClose
        spotlightClicks
        callback={handleJoyrideCallback}
        locale={joyrideLocale}
        styles={joyrideStyles}
      />
      <Joyride
        steps={fleetTourSteps}
        run={runFleetTour && isFleetPage}
        continuous
        showProgress
        showSkipButton
        scrollToFirstStep
        disableOverlayClose
        spotlightClicks
        callback={handleFleetJoyrideCallback}
        locale={joyrideLocale}
        styles={joyrideStyles}
      />
    </OnboardingContext.Provider>
  );
}

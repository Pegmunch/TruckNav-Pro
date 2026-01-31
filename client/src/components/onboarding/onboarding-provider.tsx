import { createContext, useContext, useState, useCallback, useEffect, ReactNode, useMemo } from 'react';
import Joyride, { Step, CallBackProps, STATUS, EVENTS, ACTIONS } from 'react-joyride';
import { useIsMobile } from '@/hooks/use-mobile';

const ONBOARDING_STORAGE_KEY = 'trucknav_onboarding_v3_completed';
const FLEET_ONBOARDING_STORAGE_KEY = 'trucknav_fleet_onboarding_v2_completed';

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
      target: 'body',
      content: '🚛 Welcome to TruckNav Pro! Your professional truck navigation companion with intelligent routing, real-time traffic, and fleet management.',
      placement: 'center',
      disableBeacon: true,
      title: '👋 Welcome to TruckNav Pro!'
    },
    {
      target: '[data-tour-id="menu-button"]',
      content: 'Tap here to access route planning, recent destinations, vehicle profiles, and app settings. Everything you need is one tap away!',
      placement: 'right',
      title: '📍 Main Menu'
    },
    {
      target: '[data-tour-id="header-settings"]',
      content: 'Quick access to change your vehicle profile (Class 1 Truck or Car mode), language, and light/dark theme.',
      placement: 'bottom',
      title: '⚙️ Quick Settings'
    },
    {
      target: '[data-tour-id="right-controls"]',
      content: 'Map controls for zoom, 3D view toggle (cycles through 3 tilt positions!), live traffic overlay, satellite view, and incident alerts.',
      placement: 'left',
      title: '🗺️ Map Controls'
    },
    {
      target: '[data-testid="button-toggle-3d"]',
      content: 'NEW! 3-State Tilt Control: Press to cycle between Tilted (3D perspective), Overhead (flat heading-up), and Normal (2D north-up) views.',
      placement: 'left',
      title: '🎮 3D View Toggle'
    },
    {
      target: '[data-testid="button-toggle-traffic"]',
      content: 'Show real-time traffic conditions on the map. Colors indicate flow: Blue = Free, Green = Light, Yellow = Moderate, Orange = Heavy, Red = Standstill.',
      placement: 'left',
      title: '🚦 Live Traffic'
    },
    {
      target: '[data-tour-id="speedometer"]',
      content: 'Professional speedometer showing current speed, speed limit, and road name. Alerts you when exceeding the limit!',
      placement: 'top',
      title: '⏱️ Speed Display'
    },
    {
      target: '[data-tour-id="nav-button"]',
      content: 'Recenter the map on your current GPS position. During navigation, keeps you centered on the route.',
      placement: 'right',
      title: '📌 Recenter Button'
    },
    {
      target: '[data-tour-id="voice-button"]',
      content: 'Hands-free voice commands! Say "report traffic", "report accident", or "report hazard" while driving to contribute to live traffic data.',
      placement: 'right',
      title: '🎤 Voice Commands'
    },
    {
      target: '[data-tour-id="incident-button"]',
      content: 'Report traffic incidents to help fellow drivers. The more reports, the better the live data! Long-press for quick reporting.',
      placement: 'right',
      title: '⚠️ Traffic Reporting'
    },
    {
      target: 'body',
      content: '✨ NEW FEATURES:\n\n🚦 Smart Traffic Lights - Green wave optimization shows optimal speed to catch green lights!\n\n🔄 Auto-Reroute - Automatically recalculates if you deviate from route\n\n🗣️ Voice Navigation - Turn-by-turn guidance in 17 languages',
      placement: 'center',
      title: '🆕 What\'s New'
    },
    ...(!isMobile ? [{
      target: '[data-tour-id="desktop-fleet-link"]',
      content: 'Enterprise Fleet Management: Vehicle registry, driver management, service records, fuel tracking, compliance monitoring, and real-time fleet GPS tracking.',
      placement: 'bottom' as const,
      title: '🏢 Fleet Management'
    }] : []),
    {
      target: 'body',
      content: 'You\'re all set! Start by entering a destination in the menu. Safe travels! 🛣️',
      placement: 'center',
      title: '✅ Ready to Navigate!'
    }
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

  // Auto-start tour for first-time users - shows welcome tour after brief delay
  useEffect(() => {
    if (isFleetPage && !isFleetOnboardingComplete && isReady) {
      const timer = setTimeout(() => {
        setRunFleetTour(true);
      }, 1500);
      return () => clearTimeout(timer);
    } else if (!isFleetPage && !isOnboardingComplete && isReady) {
      const timer = setTimeout(() => {
        setRunTour(true);
      }, 2000); // 2 second delay to let map fully load
      return () => clearTimeout(timer);
    }
  }, [isReady, isOnboardingComplete, isFleetOnboardingComplete, isFleetPage]);

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
      primaryColor: '#2563eb',
      zIndex: 10000,
      arrowColor: '#1e293b',
      backgroundColor: '#1e293b',
      textColor: '#f8fafc',
      overlayColor: 'rgba(0, 0, 0, 0.75)'
    },
    buttonNext: {
      backgroundColor: '#3b82f6',
      borderRadius: '10px',
      padding: '10px 20px',
      fontWeight: 600,
      fontSize: '14px',
      boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
      border: 'none'
    },
    buttonBack: {
      color: '#94a3b8',
      marginRight: '12px',
      fontWeight: 500
    },
    buttonSkip: {
      color: '#64748b',
      fontWeight: 500
    },
    buttonClose: {
      color: '#94a3b8'
    },
    tooltip: {
      borderRadius: '16px',
      padding: '20px 24px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      maxWidth: '380px'
    },
    tooltipTitle: {
      fontSize: '20px',
      fontWeight: 700,
      marginBottom: '12px',
      color: '#f8fafc',
      letterSpacing: '-0.02em'
    },
    tooltipContent: {
      fontSize: '15px',
      lineHeight: 1.7,
      color: '#cbd5e1',
      whiteSpace: 'pre-line' as const
    },
    tooltipFooter: {
      marginTop: '16px'
    },
    spotlight: {
      borderRadius: '16px',
      boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.4)'
    },
    beacon: {
      display: 'none'
    },
    beaconInner: {
      backgroundColor: '#3b82f6'
    },
    beaconOuter: {
      backgroundColor: 'rgba(59, 130, 246, 0.3)',
      border: '2px solid #3b82f6'
    }
  };

  const joyrideLocale = {
    back: '← Back',
    close: '✕',
    last: 'Get Started! 🚀',
    next: 'Next →',
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

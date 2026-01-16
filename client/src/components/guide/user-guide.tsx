import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Truck, Map, Navigation2, Volume2, Vibrate, Camera, Gauge, 
  Route, Building, Zap, Mic, Radio, Bell, Shield, Users,
  Fuel, FileText, MapPin, Compass, Clock, Settings, Menu,
  Eye, Layers, AlertTriangle, Car, Smartphone
} from 'lucide-react';

export default function UserGuide() {
  const { t } = useTranslation();

  return (
    <ScrollArea className="h-full max-h-[75vh]">
      <div className="space-y-6 p-4 text-sm">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-primary mb-2">{t('userGuide.title', 'TruckNav Pro User Guide')}</h2>
          <p className="text-muted-foreground">{t('userGuide.subtitle', 'Complete guide to all features and how to use them')}</p>
        </div>

        <section className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
            <Navigation2 className="h-5 w-5" />
            {t('userGuide.gettingStarted.title', 'Getting Started')}
          </h3>
          <div className="space-y-3 pl-4">
            <div>
              <p className="font-bold">{t('userGuide.gettingStarted.planMode', 'Plan Mode')}</p>
              <p className="text-muted-foreground">{t('userGuide.gettingStarted.planModeDesc', 'Tap the menu button (☰) in the top-left corner to open the route planner. Enter your destination using the search bar. The app will find truck-safe routes avoiding low bridges and weight restrictions.')}</p>
            </div>
            <div>
              <p className="font-bold">{t('userGuide.gettingStarted.previewMode', 'Preview Mode')}</p>
              <p className="text-muted-foreground">{t('userGuide.gettingStarted.previewModeDesc', 'After planning, review your route on the map. Yellow warning icons show restrictions along your route. Tap any restriction to see details about height, weight, or width limits.')}</p>
            </div>
            <div>
              <p className="font-bold">{t('userGuide.gettingStarted.navigateMode', 'Navigate Mode')}</p>
              <p className="text-muted-foreground">{t('userGuide.gettingStarted.navigateModeDesc', 'Tap "Start Navigation" to begin turn-by-turn guidance. The map automatically follows your position and shows upcoming maneuvers.')}</p>
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
            <Truck className="h-5 w-5" />
            {t('userGuide.vehicleSetup.title', 'Vehicle Setup')}
          </h3>
          <div className="space-y-3 pl-4">
            <div>
              <p className="font-bold">{t('userGuide.vehicleSetup.profiles', 'Vehicle Profiles')}</p>
              <p className="text-muted-foreground">{t('userGuide.vehicleSetup.profilesDesc', 'Access via Menu → Vehicle tab. Create profiles for each vehicle with dimensions (height, width, length), weight, and axle count. The app uses these to avoid unsuitable routes.')}</p>
            </div>
            <div>
              <p className="font-bold">{t('userGuide.vehicleSetup.hazmat', 'Hazmat Settings')}</p>
              <p className="text-muted-foreground">{t('userGuide.vehicleSetup.hazmatDesc', 'Toggle hazmat options for ADR-compliant routing. The app will avoid tunnels and routes prohibited for dangerous goods.')}</p>
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
            <Map className="h-5 w-5" />
            {t('userGuide.mapControls.title', 'Map Controls')}
          </h3>
          <div className="space-y-3 pl-4">
            <div>
              <p className="font-bold">{t('userGuide.mapControls.compass', 'Compass Button')}</p>
              <p className="text-muted-foreground">{t('userGuide.mapControls.compassDesc', 'Located on the right side of the map. Tap to reset map rotation to north. During navigation, the map rotates to match your heading.')}</p>
            </div>
            <div>
              <p className="font-bold">{t('userGuide.mapControls.recenter', 'Recenter Button')}</p>
              <p className="text-muted-foreground">{t('userGuide.mapControls.recenterDesc', 'Tap to snap the map back to your current GPS position. The GPS lock icon indicates when position tracking is active.')}</p>
            </div>
            <div>
              <p className="font-bold">{t('userGuide.mapControls.3dMode', '3D Mode')}</p>
              <p className="text-muted-foreground">{t('userGuide.mapControls.3dModeDesc', 'Tap the 3D button to tilt the map for a perspective view. At zoom level 14+, buildings appear in 3D. Best for urban navigation.')}</p>
            </div>
            <div>
              <p className="font-bold">{t('userGuide.mapControls.satellite', 'Satellite View')}</p>
              <p className="text-muted-foreground">{t('userGuide.mapControls.satelliteDesc', 'Switch between road map and satellite imagery. Useful for identifying truck stops and parking areas from aerial view.')}</p>
            </div>
            <div>
              <p className="font-bold">{t('userGuide.mapControls.traffic', 'Traffic Layer')}</p>
              <p className="text-muted-foreground">{t('userGuide.mapControls.trafficDesc', 'Toggle live traffic visualization. Roads are color-coded: green (flowing), yellow (slow), red (congested). Updated in real-time.')}</p>
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
            <AlertTriangle className="h-5 w-5" />
            {t('userGuide.restrictions.title', 'Restriction Warnings')}
          </h3>
          <div className="space-y-3 pl-4">
            <div>
              <p className="font-bold">{t('userGuide.restrictions.panel', 'Restriction Panel')}</p>
              <p className="text-muted-foreground">{t('userGuide.restrictions.panelDesc', 'During preview mode, a panel shows all restrictions on your route. Critical violations (red) must be avoided. High (orange) and medium (yellow) require attention.')}</p>
            </div>
            <div>
              <p className="font-bold">{t('userGuide.restrictions.markers', 'Map Markers')}</p>
              <p className="text-muted-foreground">{t('userGuide.restrictions.markersDesc', 'Yellow triangle icons on the map show restriction locations. Tap any marker to see details including the specific dimension that violates your vehicle profile.')}</p>
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
            <Zap className="h-5 w-5" />
            {t('userGuide.dynamicRoutes.title', 'Dynamic Route Suggestions')}
          </h3>
          <div className="space-y-3 pl-4">
            <div>
              <p className="font-bold">{t('userGuide.dynamicRoutes.alternative', 'Alternative Routes')}</p>
              <p className="text-muted-foreground">{t('userGuide.dynamicRoutes.alternativeDesc', 'During navigation, the app checks every 5 minutes for faster routes. When a quicker option is found, a green banner appears showing time savings. Tap "Switch Route" to accept.')}</p>
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
            <Mic className="h-5 w-5" />
            {t('userGuide.voiceCommands.title', 'Voice Commands')}
          </h3>
          <div className="space-y-3 pl-4">
            <div>
              <p className="font-bold">{t('userGuide.voiceCommands.reporting', 'Incident Reporting')}</p>
              <p className="text-muted-foreground">{t('userGuide.voiceCommands.reportingDesc', 'During navigation, tap the microphone button on the left side. Say commands like "report traffic", "report accident", "road hazard", "police ahead", or "speed camera" to alert other drivers.')}</p>
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
            <Volume2 className="h-5 w-5" />
            {t('userGuide.alertSounds.title', 'Customizable Alert Sounds')}
          </h3>
          <div className="space-y-3 pl-4">
            <div>
              <p className="font-bold">{t('userGuide.alertSounds.settings', 'Sound Settings')}</p>
              <p className="text-muted-foreground">{t('userGuide.alertSounds.settingsDesc', 'Access via Menu → Settings → Alert Sounds. Choose different sounds for speed warnings, traffic alerts, and break reminders. Adjust volume for each alert type independently.')}</p>
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
            <Vibrate className="h-5 w-5" />
            {t('userGuide.hapticFeedback.title', 'Haptic Feedback')}
          </h3>
          <div className="space-y-3 pl-4">
            <div>
              <p className="font-bold">{t('userGuide.hapticFeedback.vibration', 'Vibration Alerts')}</p>
              <p className="text-muted-foreground">{t('userGuide.hapticFeedback.vibrationDesc', 'Your device vibrates when pressing buttons and during navigation events. Different patterns indicate different actions: light tap for buttons, strong pulse for warnings, and success pattern when arriving.')}</p>
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
            <Building className="h-5 w-5" />
            {t('userGuide.3dBuildings.title', '3D Buildings')}
          </h3>
          <div className="space-y-3 pl-4">
            <div>
              <p className="font-bold">{t('userGuide.3dBuildings.viewing', 'Viewing 3D Buildings')}</p>
              <p className="text-muted-foreground">{t('userGuide.3dBuildings.viewingDesc', 'Enable 3D mode and zoom to level 14 or closer. Buildings appear as 3D extrusions with height variations. Taller buildings appear darker. Helps visualize urban areas and locate landmarks.')}</p>
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
            <Camera className="h-5 w-5" />
            {t('userGuide.arOverlay.title', 'AR Navigation Overlay')}
          </h3>
          <div className="space-y-3 pl-4">
            <div>
              <p className="font-bold">{t('userGuide.arOverlay.camera', 'Camera View')}</p>
              <p className="text-muted-foreground">{t('userGuide.arOverlay.cameraDesc', 'Access the AR overlay during navigation for a camera-based view with navigation overlays. Shows your current speed, speed limit, next maneuver, and ETA overlaid on the live camera feed. Requires camera permission.')}</p>
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
            <Gauge className="h-5 w-5" />
            {t('userGuide.dashboardWidgets.title', 'Dashboard Widgets')}
          </h3>
          <div className="space-y-3 pl-4">
            <div>
              <p className="font-bold">{t('userGuide.dashboardWidgets.customizing', 'Customizing Your Dashboard')}</p>
              <p className="text-muted-foreground">{t('userGuide.dashboardWidgets.customizingDesc', 'Tap the settings icon in the widget bar to customize which data appears. Available widgets include speed, ETA, distance remaining, compass heading, altitude, fuel estimate, weather, and traffic delay.')}</p>
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
            <Radio className="h-5 w-5" />
            {t('userGuide.entertainment.title', 'Entertainment System')}
          </h3>
          <div className="space-y-3 pl-4">
            <div>
              <p className="font-bold">{t('userGuide.entertainment.radio', 'Internet Radio')}</p>
              <p className="text-muted-foreground">{t('userGuide.entertainment.radioDesc', 'Access via the radio button during navigation. Stream trucker-friendly radio stations. Control playback with the mini player at the bottom of the screen.')}</p>
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
            <MapPin className="h-5 w-5" />
            {t('userGuide.facilities.title', 'Facility Search')}
          </h3>
          <div className="space-y-3 pl-4">
            <div>
              <p className="font-bold">{t('userGuide.facilities.finding', 'Finding Truck Stops')}</p>
              <p className="text-muted-foreground">{t('userGuide.facilities.findingDesc', 'Use the POI search in the menu to find nearby truck stops, fuel stations, parking, restaurants, and rest areas. Results are filtered for truck-accessible locations.')}</p>
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
            <Users className="h-5 w-5" />
            {t('userGuide.fleetManagement.title', 'Fleet Management (Desktop)')}
          </h3>
          <div className="space-y-3 pl-4">
            <div>
              <p className="font-bold">{t('userGuide.fleetManagement.access', 'Accessing Fleet Tools')}</p>
              <p className="text-muted-foreground">{t('userGuide.fleetManagement.accessDesc', 'Fleet management is available on desktop only. Access via the top navigation bar. Manage vehicles, drivers, service records, fuel logs, compliance tracking, and customer billing.')}</p>
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
            <Smartphone className="h-5 w-5" />
            {t('userGuide.pwa.title', 'Mobile App Installation')}
          </h3>
          <div className="space-y-3 pl-4">
            <div>
              <p className="font-bold">{t('userGuide.pwa.installing', 'Installing on Your Device')}</p>
              <p className="text-muted-foreground">{t('userGuide.pwa.installingDesc', 'On iOS: Tap Share → Add to Home Screen. On Android: Tap the menu → Install App. This creates a full-screen app experience with offline support for cached routes.')}</p>
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
            <Settings className="h-5 w-5" />
            {t('userGuide.settings.title', 'Settings & Preferences')}
          </h3>
          <div className="space-y-3 pl-4">
            <div>
              <p className="font-bold">{t('userGuide.settings.language', 'Language Settings')}</p>
              <p className="text-muted-foreground">{t('userGuide.settings.languageDesc', 'Access via Menu → Settings. Choose your preferred language. The entire app interface, voice guidance, and this user guide will update to your selected language.')}</p>
            </div>
            <div>
              <p className="font-bold">{t('userGuide.settings.units', 'Unit Preferences')}</p>
              <p className="text-muted-foreground">{t('userGuide.settings.unitsDesc', 'Toggle between metric (kilometers, meters) and imperial (miles, feet) measurements. Speed limits and distances will display in your preferred units.')}</p>
            </div>
          </div>
        </section>

        <div className="mt-8 p-4 bg-muted rounded-lg text-center">
          <p className="text-xs text-muted-foreground">
            {t('userGuide.footer', '© 2025 Bespoke Marketing.Ai Ltd - TruckNav Pro')}
          </p>
        </div>
      </div>
    </ScrollArea>
  );
}

import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export default function UserGuide() {
  const { t } = useTranslation();

  return (
    <ScrollArea className="h-full max-h-[75vh] bg-white">
      <div className="space-y-6 p-4 text-sm bg-white text-gray-900">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-blue-600 mb-2">{t('userGuide.title', 'TruckNav Pro User Guide')}</h2>
          <p className="text-gray-600">{t('userGuide.subtitle', 'Complete guide to all features')}</p>
        </div>

        {/* Getting Started */}
        <section className="space-y-3">
          <h3 className="text-lg font-bold text-blue-600">{t('userGuide.gettingStarted.title', 'Getting Started')}</h3>
          <ul className="space-y-2 pl-4">
            <li><span className="font-bold">{t('userGuide.gettingStarted.planMode', 'Plan Mode')}</span> - {t('userGuide.gettingStarted.planModeDesc', 'Tap menu (☰) to open route planner. Enter destination to find truck-safe routes.')}</li>
            <li><span className="font-bold">{t('userGuide.gettingStarted.previewMode', 'Preview Mode')}</span> - {t('userGuide.gettingStarted.previewModeDesc', 'Review your route before starting. Yellow icons show restrictions.')}</li>
            <li><span className="font-bold">{t('userGuide.gettingStarted.navigateMode', 'Navigate Mode')}</span> - {t('userGuide.gettingStarted.navigateModeDesc', 'Tap "Start Navigation" for turn-by-turn guidance.')}</li>
          </ul>
        </section>

        <Separator />

        {/* Preview & Flyby */}
        <section className="space-y-3">
          <h3 className="text-lg font-bold text-blue-600">{t('userGuide.previewFlyby.title', 'Preview & Flyby Mode')}</h3>
          <ul className="space-y-2 pl-4">
            <li><span className="font-bold">{t('userGuide.previewFlyby.routePreview', 'Route Preview')}</span> - {t('userGuide.previewFlyby.routePreviewDesc', 'After planning, view entire route on map with all waypoints and restrictions visible.')}</li>
            <li><span className="font-bold">{t('userGuide.previewFlyby.flybyAnimation', 'Flyby Animation')}</span> - {t('userGuide.previewFlyby.flybyAnimationDesc', 'Animated camera follows your planned route from start to destination in 3D view.')}</li>
            <li><span className="font-bold">{t('userGuide.previewFlyby.etaDisplay', 'ETA Display')}</span> - {t('userGuide.previewFlyby.etaDisplayDesc', 'Shows estimated arrival time, total distance, and expected travel duration.')}</li>
            <li><span className="font-bold">{t('userGuide.previewFlyby.noAutoStart', 'Manual Start Only')}</span> - {t('userGuide.previewFlyby.noAutoStartDesc', 'Navigation never starts automatically. You must tap Start Navigation when ready.')}</li>
          </ul>
        </section>

        <Separator />

        {/* ETA & Trip Information */}
        <section className="space-y-3">
          <h3 className="text-lg font-bold text-blue-600">{t('userGuide.etaInfo.title', 'ETA & Trip Information')}</h3>
          <ul className="space-y-2 pl-4">
            <li><span className="font-bold">{t('userGuide.etaInfo.arrivalTime', 'Arrival Time')}</span> - {t('userGuide.etaInfo.arrivalTimeDesc', 'Shows expected arrival time based on current traffic and route conditions.')}</li>
            <li><span className="font-bold">{t('userGuide.etaInfo.remainingDistance', 'Remaining Distance')}</span> - {t('userGuide.etaInfo.remainingDistanceDesc', 'Distance left to destination in your preferred units (km or miles).')}</li>
            <li><span className="font-bold">{t('userGuide.etaInfo.remainingTime', 'Remaining Time')}</span> - {t('userGuide.etaInfo.remainingTimeDesc', 'Estimated driving time left, updated in real-time based on traffic.')}</li>
            <li><span className="font-bold">{t('userGuide.etaInfo.tripStrip', 'Trip Strip')}</span> - {t('userGuide.etaInfo.tripStripDesc', 'Compact bar at bottom shows ETA, distance, and time at a glance.')}</li>
          </ul>
        </section>

        <Separator />

        {/* Control Buttons */}
        <section className="space-y-3">
          <h3 className="text-lg font-bold text-blue-600">{t('userGuide.controlButtons.title', 'Map Control Buttons')}</h3>
          <ul className="space-y-2 pl-4">
            <li><span className="font-bold">{t('userGuide.controlButtons.compass', 'Compass')}</span> - {t('userGuide.controlButtons.compassDesc', 'Reset map rotation to north. Shows current heading during navigation.')}</li>
            <li><span className="font-bold">{t('userGuide.controlButtons.recenter', 'Recenter/GPS Lock')}</span> - {t('userGuide.controlButtons.recenterDesc', 'Snap map to current GPS position. Blue glow indicates GPS lock active.')}</li>
            <li><span className="font-bold">{t('userGuide.controlButtons.3dButton', '3D Mode Button')}</span> - {t('userGuide.controlButtons.3dButtonDesc', 'Toggle between flat 2D and tilted 3D perspective view.')}</li>
            <li><span className="font-bold">{t('userGuide.controlButtons.satellite', 'Satellite Toggle')}</span> - {t('userGuide.controlButtons.satelliteDesc', 'Switch between road map and satellite/aerial imagery.')}</li>
            <li><span className="font-bold">{t('userGuide.controlButtons.traffic', 'Traffic Toggle')}</span> - {t('userGuide.controlButtons.trafficDesc', 'Show/hide live traffic flow. Green=clear, Yellow=slow, Red=congested.')}</li>
            <li><span className="font-bold">{t('userGuide.controlButtons.zoomIn', 'Zoom In (+)')}</span> - {t('userGuide.controlButtons.zoomInDesc', 'Zoom into map for more detail. Buildings appear at zoom 14+.')}</li>
            <li><span className="font-bold">{t('userGuide.controlButtons.zoomOut', 'Zoom Out (-)')}</span> - {t('userGuide.controlButtons.zoomOutDesc', 'Zoom out to see wider area and full route overview.')}</li>
            <li><span className="font-bold">{t('userGuide.controlButtons.layers', 'Map Layers')}</span> - {t('userGuide.controlButtons.layersDesc', 'Access different map styles: Roads, Satellite, Terrain, Dark mode.')}</li>
          </ul>
        </section>

        <Separator />

        {/* 3D Map & Hills */}
        <section className="space-y-3">
          <h3 className="text-lg font-bold text-blue-600">{t('userGuide.3dMap.title', '3D Map & Terrain')}</h3>
          <ul className="space-y-2 pl-4">
            <li><span className="font-bold">{t('userGuide.3dMap.tiltedView', 'Tilted 3D View')}</span> - {t('userGuide.3dMap.tiltedViewDesc', 'Perspective view shows road ahead. Better spatial awareness for navigation.')}</li>
            <li><span className="font-bold">{t('userGuide.3dMap.buildings', '3D Buildings')}</span> - {t('userGuide.3dMap.buildingsDesc', 'Buildings appear as 3D shapes at zoom level 14+. Helps identify landmarks.')}</li>
            <li><span className="font-bold">{t('userGuide.3dMap.hillShading', 'Hill Shading')}</span> - {t('userGuide.3dMap.hillShadingDesc', 'Terrain elevation shown with shading. Helps visualize steep hills and valleys.')}</li>
            <li><span className="font-bold">{t('userGuide.3dMap.rotation', 'Map Rotation')}</span> - {t('userGuide.3dMap.rotationDesc', 'Map rotates to match your heading during navigation. North-up when stopped.')}</li>
          </ul>
        </section>

        <Separator />

        {/* Incident Reporting */}
        <section className="space-y-3">
          <h3 className="text-lg font-bold text-blue-600">{t('userGuide.incidentReporting.title', 'Incident Reporting')}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('userGuide.incidentReporting.intro', 'The more users report traffic incidents, the more accurate live data becomes for everyone. Your reports help fellow drivers avoid delays and hazards.')}
          </p>
          <ul className="space-y-2 pl-4">
            <li><span className="font-bold">{t('userGuide.incidentReporting.manualReport', 'Manual Reporting')}</span> - {t('userGuide.incidentReporting.manualReportDesc', 'Traffic reporting can only be done in Preview mode, preferably while stationary. To report: Cancel your current route, use Recent Destinations to re-enter your destination, press Preview (orange button), then use the Report Incident button in the top right stack. Press Go to continue your route.')}</li>
            <li><span className="font-bold">{t('userGuide.incidentReporting.voiceReport', 'Voice Reporting')}</span> - {t('userGuide.incidentReporting.voiceReportDesc', 'Tap microphone and speak: "report traffic", "report accident", "road hazard".')}</li>
            <li><span className="font-bold">{t('userGuide.incidentReporting.trafficJam', 'Traffic Jam')}</span> - {t('userGuide.incidentReporting.trafficJamDesc', 'Report heavy traffic or standstill. Helps other drivers find alternate routes.')}</li>
            <li><span className="font-bold">{t('userGuide.incidentReporting.accident', 'Accident Report')}</span> - {t('userGuide.incidentReporting.accidentDesc', 'Report accidents ahead. Critical for safety and route recalculation.')}</li>
            <li><span className="font-bold">{t('userGuide.incidentReporting.roadHazard', 'Road Hazard')}</span> - {t('userGuide.incidentReporting.roadHazardDesc', 'Report debris, potholes, or objects on road. Warns following drivers.')}</li>
            <li><span className="font-bold">{t('userGuide.incidentReporting.policeSpeedCamera', 'Police/Speed Camera')}</span> - {t('userGuide.incidentReporting.policeSpeedCameraDesc', 'Report police or speed cameras. Helps drivers maintain safe speeds.')}</li>
            <li><span className="font-bold">{t('userGuide.incidentReporting.roadClosure', 'Road Closure')}</span> - {t('userGuide.incidentReporting.roadClosureDesc', 'Report closed roads or diversions. Prevents drivers from heading that way.')}</li>
          </ul>
        </section>

        <Separator />

        {/* Vehicle Setup */}
        <section className="space-y-3">
          <h3 className="text-lg font-bold text-blue-600">{t('userGuide.vehicleSetup.title', 'Vehicle Setup')}</h3>
          <ul className="space-y-2 pl-4">
            <li><span className="font-bold">{t('userGuide.vehicleSetup.profiles', 'Vehicle Profiles')}</span> - {t('userGuide.vehicleSetup.profilesDesc', 'Create profiles with height, width, length, weight, and axle count.')}</li>
            <li><span className="font-bold">{t('userGuide.vehicleSetup.hazmat', 'Hazmat Settings')}</span> - {t('userGuide.vehicleSetup.hazmatDesc', 'Enable for ADR routing. Avoids prohibited tunnels and restricted zones.')}</li>
            <li><span className="font-bold">{t('userGuide.vehicleSetup.trailerType', 'Trailer Type')}</span> - {t('userGuide.vehicleSetup.trailerTypeDesc', 'Set trailer configuration for accurate turning radius calculations.')}</li>
          </ul>
        </section>

        <Separator />

        {/* Restriction Warnings */}
        <section className="space-y-3">
          <h3 className="text-lg font-bold text-blue-600">{t('userGuide.restrictions.title', 'Restriction Warnings')}</h3>
          <ul className="space-y-2 pl-4">
            <li><span className="font-bold">{t('userGuide.restrictions.panel', 'Restriction Panel')}</span> - {t('userGuide.restrictions.panelDesc', 'Shows all restrictions on route. Red=critical, Orange=high, Yellow=caution.')}</li>
            <li><span className="font-bold">{t('userGuide.restrictions.markers', 'Map Markers')}</span> - {t('userGuide.restrictions.markersDesc', 'Yellow triangles show restriction locations. Tap for details.')}</li>
            <li><span className="font-bold">{t('userGuide.restrictions.heightLimit', 'Height Limits')}</span> - {t('userGuide.restrictions.heightLimitDesc', 'Low bridges and tunnels flagged based on your vehicle height.')}</li>
            <li><span className="font-bold">{t('userGuide.restrictions.weightLimit', 'Weight Limits')}</span> - {t('userGuide.restrictions.weightLimitDesc', 'Bridge weight limits and road restrictions shown for your gross weight.')}</li>
          </ul>
        </section>

        <Separator />

        {/* Dynamic Routes */}
        <section className="space-y-3">
          <h3 className="text-lg font-bold text-blue-600">{t('userGuide.dynamicRoutes.title', 'Dynamic Route Suggestions')}</h3>
          <ul className="space-y-2 pl-4">
            <li><span className="font-bold">{t('userGuide.dynamicRoutes.alternative', 'Alternative Routes')}</span> - {t('userGuide.dynamicRoutes.alternativeDesc', 'App checks for faster routes every 5 minutes. Green banner shows time savings.')}</li>
            <li><span className="font-bold">{t('userGuide.dynamicRoutes.oneTouch', 'One-Touch Switch')}</span> - {t('userGuide.dynamicRoutes.oneTouchDesc', 'Tap "Switch Route" to accept the faster alternative immediately.')}</li>
          </ul>
        </section>

        <Separator />

        {/* Voice Features */}
        <section className="space-y-3">
          <h3 className="text-lg font-bold text-blue-600">{t('userGuide.voiceFeatures.title', 'Voice Features')}</h3>
          <ul className="space-y-2 pl-4">
            <li><span className="font-bold">{t('userGuide.voiceFeatures.guidance', 'Voice Guidance')}</span> - {t('userGuide.voiceFeatures.guidanceDesc', 'Turn-by-turn voice instructions in your selected language.')}</li>
            <li><span className="font-bold">{t('userGuide.voiceFeatures.dictation', 'Address Dictation')}</span> - {t('userGuide.voiceFeatures.dictationDesc', 'Tap microphone in search to speak your destination.')}</li>
            <li><span className="font-bold">{t('userGuide.voiceFeatures.commands', 'Voice Commands')}</span> - {t('userGuide.voiceFeatures.commandsDesc', 'Hands-free commands during navigation. Works in 40+ languages.')}</li>
            <li><span className="font-bold">{t('userGuide.voiceFeatures.languageSync', 'Language Sync')}</span> - {t('userGuide.voiceFeatures.languageSyncDesc', 'Voice features automatically match your app language setting.')}</li>
          </ul>
        </section>

        <Separator />

        {/* Alert Sounds & Haptics */}
        <section className="space-y-3">
          <h3 className="text-lg font-bold text-blue-600">{t('userGuide.alertsHaptics.title', 'Alerts & Haptic Feedback')}</h3>
          <ul className="space-y-2 pl-4">
            <li><span className="font-bold">{t('userGuide.alertsHaptics.speedWarning', 'Speed Warning')}</span> - {t('userGuide.alertsHaptics.speedWarningDesc', 'Audio alert when exceeding speed limit. Configurable sounds.')}</li>
            <li><span className="font-bold">{t('userGuide.alertsHaptics.hapticFeedback', 'Haptic Feedback')}</span> - {t('userGuide.alertsHaptics.hapticFeedbackDesc', 'Vibration on button press and navigation events.')}</li>
            <li><span className="font-bold">{t('userGuide.alertsHaptics.fatigueAlert', 'Fatigue Alerts')}</span> - {t('userGuide.alertsHaptics.fatigueAlertDesc', 'Break reminders after long driving periods.')}</li>
          </ul>
        </section>

        <Separator />

        {/* AR Navigation */}
        <section className="space-y-3">
          <h3 className="text-lg font-bold text-blue-600">{t('userGuide.arNavigation.title', 'AR Navigation Overlay')}</h3>
          <ul className="space-y-2 pl-4">
            <li><span className="font-bold">{t('userGuide.arNavigation.cameraView', 'Camera View')}</span> - {t('userGuide.arNavigation.cameraViewDesc', 'Live camera with navigation overlay. Shows speed, limit, and next turn.')}</li>
            <li><span className="font-bold">{t('userGuide.arNavigation.maneuverOverlay', 'Maneuver Overlay')}</span> - {t('userGuide.arNavigation.maneuverOverlayDesc', 'Arrows and instructions overlaid on camera view.')}</li>
            <li><span className="font-bold">{t('userGuide.arNavigation.speedDisplay', 'Speed Display')}</span> - {t('userGuide.arNavigation.speedDisplayDesc', 'Current speed and speed limit shown prominently in AR view.')}</li>
          </ul>
        </section>

        <Separator />

        {/* Dashboard Widgets */}
        <section className="space-y-3">
          <h3 className="text-lg font-bold text-blue-600">{t('userGuide.widgets.title', 'Dashboard Widgets')}</h3>
          <ul className="space-y-2 pl-4">
            <li><span className="font-bold">{t('userGuide.widgets.speed', 'Speed Widget')}</span> - {t('userGuide.widgets.speedDesc', 'Shows current speed and speed limit side by side.')}</li>
            <li><span className="font-bold">{t('userGuide.widgets.eta', 'ETA Widget')}</span> - {t('userGuide.widgets.etaDesc', 'Arrival time with real-time traffic updates.')}</li>
            <li><span className="font-bold">{t('userGuide.widgets.distance', 'Distance Widget')}</span> - {t('userGuide.widgets.distanceDesc', 'Remaining distance to destination.')}</li>
            <li><span className="font-bold">{t('userGuide.widgets.compass', 'Compass Widget')}</span> - {t('userGuide.widgets.compassDesc', 'Current heading in degrees and cardinal direction.')}</li>
            <li><span className="font-bold">{t('userGuide.widgets.customize', 'Customize')}</span> - {t('userGuide.widgets.customizeDesc', 'Tap settings icon to choose which widgets to display.')}</li>
          </ul>
        </section>

        <Separator />

        {/* Facility Search */}
        <section className="space-y-3">
          <h3 className="text-lg font-bold text-blue-600">{t('userGuide.facilities.title', 'Facility Search')}</h3>
          <ul className="space-y-2 pl-4">
            <li><span className="font-bold">{t('userGuide.facilities.truckStops', 'Truck Stops')}</span> - {t('userGuide.facilities.truckStopsDesc', 'Find truck stops with parking, showers, and services.')}</li>
            <li><span className="font-bold">{t('userGuide.facilities.fuel', 'Fuel Stations')}</span> - {t('userGuide.facilities.fuelDesc', 'Diesel stations with truck access and HGV lanes.')}</li>
            <li><span className="font-bold">{t('userGuide.facilities.parking', 'Truck Parking')}</span> - {t('userGuide.facilities.parkingDesc', 'Secure overnight parking and rest areas.')}</li>
            <li><span className="font-bold">{t('userGuide.facilities.restaurants', 'Restaurants')}</span> - {t('userGuide.facilities.restaurantsDesc', 'Truck-accessible restaurants and diners.')}</li>
          </ul>
        </section>

        <Separator />

        {/* Settings */}
        <section className="space-y-3">
          <h3 className="text-lg font-bold text-blue-600">{t('userGuide.settings.title', 'Settings & Preferences')}</h3>
          <ul className="space-y-2 pl-4">
            <li><span className="font-bold">{t('userGuide.settings.language', 'Language')}</span> - {t('userGuide.settings.languageDesc', 'Choose from 17+ languages. Updates interface and voice.')}</li>
            <li><span className="font-bold">{t('userGuide.settings.units', 'Units')}</span> - {t('userGuide.settings.unitsDesc', 'Toggle between metric (km) and imperial (miles).')}</li>
            <li><span className="font-bold">{t('userGuide.settings.theme', 'Theme')}</span> - {t('userGuide.settings.themeDesc', 'Light, dark, or automatic based on time of day.')}</li>
          </ul>
        </section>

        <Separator />

        {/* PWA Installation */}
        <section className="space-y-3">
          <h3 className="text-lg font-bold text-blue-600">{t('userGuide.pwa.title', 'Install as App')}</h3>
          <ul className="space-y-2 pl-4">
            <li><span className="font-bold">{t('userGuide.pwa.ios', 'iOS')}</span> - {t('userGuide.pwa.iosDesc', 'Tap Share → Add to Home Screen for full-screen app.')}</li>
            <li><span className="font-bold">{t('userGuide.pwa.android', 'Android')}</span> - {t('userGuide.pwa.androidDesc', 'Tap Menu → Install App or Add to Home Screen.')}</li>
            <li><span className="font-bold">{t('userGuide.pwa.offline', 'Offline Support')}</span> - {t('userGuide.pwa.offlineDesc', 'Cached routes work without internet connection.')}</li>
          </ul>
        </section>

        <Separator />

        {/* Fleet Management */}
        <section className="space-y-3">
          <h3 className="text-lg font-bold text-blue-600">{t('userGuide.fleet.title', 'Fleet Management (Desktop)')}</h3>
          <ul className="space-y-2 pl-4">
            <li><span className="font-bold">{t('userGuide.fleet.vehicles', 'Vehicle Registry')}</span> - {t('userGuide.fleet.vehiclesDesc', 'Manage all fleet vehicles with details and documents.')}</li>
            <li><span className="font-bold">{t('userGuide.fleet.drivers', 'Driver Management')}</span> - {t('userGuide.fleet.driversDesc', 'Track drivers, licenses, and assignments.')}</li>
            <li><span className="font-bold">{t('userGuide.fleet.service', 'Service Records')}</span> - {t('userGuide.fleet.serviceDesc', 'Log maintenance, repairs, and inspections.')}</li>
            <li><span className="font-bold">{t('userGuide.fleet.fuel', 'Fuel Tracking')}</span> - {t('userGuide.fleet.fuelDesc', 'Monitor fuel consumption and costs per vehicle.')}</li>
            <li><span className="font-bold">{t('userGuide.fleet.compliance', 'Compliance')}</span> - {t('userGuide.fleet.complianceDesc', 'Track regulatory requirements and HoS compliance.')}</li>
          </ul>
        </section>

        <div className="mt-8 p-4 bg-gray-100 rounded-lg text-center">
          <p className="text-xs text-gray-600">
            {t('userGuide.footer', '© 2025 Bespoke Marketing. Ai Ltd - TruckNav Pro')}
          </p>
        </div>
      </div>
    </ScrollArea>
  );
}

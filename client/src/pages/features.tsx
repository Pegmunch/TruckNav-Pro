import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Truck,
  Map,
  Navigation,
  Volume2,
  Settings,
  Shield,
  Smartphone,
  Globe,
  Gauge,
  Bell,
  Palette,
  Radio,
  MapPin,
  Route,
  Eye,
  Mic,
  Wifi,
  WifiOff,
  Users,
  BarChart3,
  FileText,
  Fuel,
  Clock,
  Layers,
  Compass,
  Star,
  Zap,
  ChevronRight,
  Check,
  Sparkles,
} from "lucide-react";

interface FeatureCategory {
  icon: React.ReactNode;
  title: string;
  tagline: string;
  color: string;
  features: { name: string; detail: string }[];
}

const featureCategories: FeatureCategory[] = [
  {
    icon: <Navigation className="h-6 w-6" />,
    title: "Smart Truck Routing",
    tagline: "Routes built for your vehicle, not just any vehicle",
    color: "text-blue-500",
    features: [
      { name: "Dimension-Aware Routing", detail: "Height, width, weight & length restrictions automatically avoided" },
      { name: "Dual Routing Engine", detail: "TomTom Truck Routing primary with GraphHopper intelligent fallback" },
      { name: "3 Vehicle Profiles", detail: "Class 1 Double Decker, Class 1 Standard Trailer, or Car mode" },
      { name: "Critical Violation Detection", detail: "Real-time alerts for bridge heights, weight limits & road restrictions" },
      { name: "Automatic Rerouting", detail: "Instant off-route detection with smart recalculation" },
      { name: "Dynamic Alternative Routes", detail: "Live alternative route suggestions during active navigation" },
    ],
  },
  {
    icon: <Map className="h-6 w-6" />,
    title: "Interactive 3D Mapping",
    tagline: "GPU-accelerated maps with real-time traffic intelligence",
    color: "text-emerald-500",
    features: [
      { name: "MapLibre GL JS Engine", detail: "GPU-accelerated vector maps with smooth 60fps rendering" },
      { name: "3D Building Extrusions", detail: "Interactive 3D buildings visible at zoom level 14+" },
      { name: "3-Layer Traffic Visualization", detail: "Base route, real-time traffic overlay & incident icons combined" },
      { name: "Multiple Tile Sources", detail: "Google Maps, OpenStreetMap & Esri satellite imagery with multi-CDN" },
      { name: "Staggered Zoom System", detail: "Smooth zoom animations with lock mechanism during navigation" },
      { name: "Smart Traffic Light Integration", detail: "Green wave optimization with signal phase prediction" },
    ],
  },
  {
    icon: <Volume2 className="h-6 w-6" />,
    title: "Voice Navigation System",
    tagline: "17-language voice guidance with hands-free controls",
    color: "text-purple-500",
    features: [
      { name: "Unified Voice Engine", detail: "Single consolidated system for all navigation announcements" },
      { name: "Voice Wheel Picker", detail: "Scroll-snap voice selection with live preview and instant switching" },
      { name: "6 Independent Volume Sliders", detail: "Master, voice, speed limit, traffic, turn & fatigue alert volumes" },
      { name: "17 Language Support", detail: "Dynamic language switching synced with app interface" },
      { name: "Motorway & Junction Modes", detail: "Motorway-only, junction guidance, or emergency-only voice modes" },
      { name: "Voice Incident Reporting", detail: "Hands-free voice commands for reporting traffic incidents" },
    ],
  },
  {
    icon: <Settings className="h-6 w-6" />,
    title: "25+ Precision Controls",
    tagline: "Every setting wired, tested and persisted automatically",
    color: "text-orange-500",
    features: [
      { name: "Map View Mode Selector", detail: "Switch between 2D, 3D, satellite & hybrid views instantly" },
      { name: "POI Search Radius Control", detail: "Adjustable discovery radius for truck-friendly facilities" },
      { name: "Region & Speed Limit Selector", detail: "UK circular, USA rectangular, or European speed limit signs" },
      { name: "Measurement Unit System", detail: "Toggle between metric (km/h) and imperial (mph) with one tap" },
      { name: "Theme Color Spectrum", detail: "Full HSL color customization with grayscale override option" },
      { name: "Fleet Vehicle Registration Input", detail: "Smart matching against fleet registry with operator linking" },
    ],
  },
  {
    icon: <Bell className="h-6 w-6" />,
    title: "Customizable Alerts",
    tagline: "Audio, haptic and visual alerts tailored to your preferences",
    color: "text-red-500",
    features: [
      { name: "Web Audio API Sound Engine", detail: "Personalized alert tones for speed, traffic & fatigue warnings" },
      { name: "Haptic Feedback Integration", detail: "Vibration API tactile feedback for critical navigation events" },
      { name: "Do Not Disturb Mode", detail: "One-tap mute all alerts with persistent state memory" },
      { name: "Priority-Based Notifications", detail: "Critical, important & info levels with smart sorting" },
      { name: "Break & Fatigue Reminders", detail: "Configurable driving time alerts with volume control" },
      { name: "Speed Limit Warnings", detail: "Visual and audio alerts with regional sign style display" },
    ],
  },
  {
    icon: <Palette className="h-6 w-6" />,
    title: "Adaptive Theme Engine",
    tagline: "Day, night and auto themes with full color customization",
    color: "text-pink-500",
    features: [
      { name: "3 Theme Modes", detail: "Day, Night & Auto with smooth transitions between modes" },
      { name: "Auto Theme Intelligence", detail: "Sunrise/sunset detection for automatic day-night switching" },
      { name: "Color Spectrum Picker", detail: "Full HSL color wheel with preset palettes for brand matching" },
      { name: "Grayscale Override", detail: "Accessibility-focused grayscale mode for reduced eye strain" },
      { name: "Mobile Day Enforcement", detail: "Automatic day theme on mobile for optimal outdoor visibility" },
      { name: "Dark Mode Support", detail: "Complete dark mode with explicit light/dark CSS variables" },
    ],
  },
  {
    icon: <Globe className="h-6 w-6" />,
    title: "Worldwide Coverage",
    tagline: "40+ languages with region-aware preferences",
    color: "text-cyan-500",
    features: [
      { name: "Country-Language Selector", detail: "Native picker on mobile, searchable Command palette on desktop" },
      { name: "40+ Language Codes", detail: "All voice features dynamically use selected i18n language" },
      { name: "Visual Flag Icons", detail: "Country flags with favorites, recents & trucking market groups" },
      { name: "Region-Aware Settings", detail: "Speed signs, measurement units & map style auto-configured" },
      { name: "Right-to-Left Support", detail: "Full RTL layout support for Arabic, Hebrew & other RTL languages" },
      { name: "In-App User Guide", detail: "Comprehensive documentation translated into 17 languages" },
    ],
  },
  {
    icon: <Radio className="h-6 w-6" />,
    title: "Vehicle Connectivity",
    tagline: "Bluetooth, CarPlay and Android Auto audio integration",
    color: "text-indigo-500",
    features: [
      { name: "Bluetooth Audio Bridge", detail: "Silent audio warmup and AudioContext resumption for BT speakers" },
      { name: "CarPlay & Android Auto", detail: "Comprehensive audio initialization for vehicle head units" },
      { name: "Audio Ducking", detail: "Auto-reduces music/podcast volume during voice announcements" },
      { name: "Media Button Control", detail: "Hardware volume buttons control navigation audio" },
      { name: "Visibility Reinitialization", detail: "Automatic audio recovery when app returns to foreground" },
      { name: "Speech Synthesis Priming", detail: "Pre-warmed TTS engine for zero-latency first announcement" },
    ],
  },
  {
    icon: <Smartphone className="h-6 w-6" />,
    title: "Progressive Web App",
    tagline: "Install once, works everywhere - even offline",
    color: "text-teal-500",
    features: [
      { name: "Offline Navigation", detail: "Cached routes, restrictions & facility data work without signal" },
      { name: "iOS Enhancements", detail: "Native-feel experience with safe area support and gestures" },
      { name: "Automatic Updates", detail: "Silent background updates with service worker management" },
      { name: "Install Prompt", detail: "Smart PWA install banner with platform-specific instructions" },
      { name: "Mobile-First Design", detail: "CSS clamp() density tokens with professional touch targets" },
      { name: "MobileFAB Navigation", detail: "One-handed floating action button for quick access" },
    ],
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "Enterprise Fleet Management",
    tagline: "14-tab command center for fleet operations",
    color: "text-amber-500",
    features: [
      { name: "Vehicle Registry", detail: "Complete fleet inventory with registration and dimension tracking" },
      { name: "Operator Management", detail: "Driver profiles, assignments and license compliance" },
      { name: "Service Records & Fuel Logs", detail: "Maintenance scheduling with fuel consumption analytics" },
      { name: "Real-Time Fleet Tracking", detail: "Live GPS positions of all fleet vehicles on a single map" },
      { name: "Geofencing & Compliance", detail: "Zone-based alerts with hours of service (HoS) tracking" },
      { name: "Driver Behavior Analytics", detail: "Performance scoring with shift check-in/check-out system" },
    ],
  },
  {
    icon: <Eye className="h-6 w-6" />,
    title: "AR Navigation Overlay",
    tagline: "Camera-based augmented reality turn guidance",
    color: "text-rose-500",
    features: [
      { name: "Camera AR View", detail: "Real-time camera feed with navigation arrows overlaid" },
      { name: "Device Orientation", detail: "DeviceOrientationEvent integration for accurate AR positioning" },
      { name: "Turn-by-Turn AR Arrows", detail: "Visual direction indicators projected onto the camera view" },
      { name: "Dashboard Widgets", detail: "Modular real-time navigation data panels for your cockpit" },
      { name: "Turn Indicator System", detail: "True perpendicular projection with GPS heading validation" },
      { name: "Navigation HUD", detail: "Professional heads-up display with enhanced speed limit system" },
    ],
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "Safety & Compliance",
    tagline: "Built for professional drivers who take safety seriously",
    color: "text-green-500",
    features: [
      { name: "Restriction Warning System", detail: "Comprehensive bridge height, weight limit & width alerts" },
      { name: "Spatial Validation", detail: "Turf.js powered dimensional checking along entire route" },
      { name: "Incident Logging", detail: "Document and report road incidents with photo evidence" },
      { name: "Document Management", detail: "Digital storage for licenses, permits & compliance papers" },
      { name: "Cost Analytics", detail: "Trip cost tracking with fuel, toll and maintenance breakdown" },
      { name: "Customer Billing Portal", detail: "Stripe-powered subscription management with access control" },
    ],
  },
];

const stats = [
  { value: "25+", label: "Precision Controls" },
  { value: "17", label: "Voice Languages" },
  { value: "40+", label: "App Languages" },
  { value: "14", label: "Fleet Tabs" },
  { value: "3", label: "Vehicle Profiles" },
  { value: "6", label: "Volume Channels" },
];

export default function FeaturesPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 mb-8">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Badge variant="outline" className="border-blue-500/50 text-blue-400 text-xs">
              App Store USP
            </Badge>
          </div>
        </div>

        <div className="text-center mb-16 pt-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
            <Truck className="h-4 w-4" />
            Professional Truck Navigation
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              TruckNav Pro
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            The most comprehensive truck navigation and fleet management platform.
            Every control precision-wired. Every feature battle-tested.
          </p>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 mb-16">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm text-slate-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        <Separator className="bg-white/10 mb-16" />

        <div className="space-y-12">
          {featureCategories.map((category, index) => (
            <Card
              key={category.title}
              className="bg-white/[0.03] border-white/10 overflow-hidden hover:border-white/20 transition-colors"
            >
              <CardContent className="p-0">
                <div className="p-6 sm:p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className={`p-3 rounded-xl bg-white/5 ${category.color}`}>
                      {category.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-xl sm:text-2xl font-bold text-white">
                          {category.title}
                        </h2>
                        <Badge variant="outline" className="border-white/20 text-slate-400 text-[10px] hidden sm:inline-flex">
                          {category.features.length} features
                        </Badge>
                      </div>
                      <p className="text-sm sm:text-base text-slate-400">{category.tagline}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {category.features.map((feature) => (
                      <div
                        key={feature.name}
                        className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
                      >
                        <Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-sm font-medium text-white/90">{feature.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{feature.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator className="bg-white/10 my-16" />

        <div className="text-center space-y-6 mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            Complete Control Inventory
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            25+ Controls. Zero Dead Switches.
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Every wheel picker, dropdown, slider, toggle and input across all settings panels
            has been individually verified — wired to its handler, persisted to storage,
            and synced with its service.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
          <ControlCard
            title="Radix Select Dropdowns"
            count={5}
            items={["Map View Mode", "POI Search Radius", "Region Selector", "Measurement Units", "Route Preference"]}
          />
          <ControlCard
            title="Volume Sliders"
            count={6}
            items={["Master Volume", "Voice Navigation", "Speed Limit Alerts", "Traffic Alerts", "Turn Guidance", "Fatigue Reminders"]}
          />
          <ControlCard
            title="Scroll Wheel Pickers"
            count={1}
            items={["Voice Selection Wheel — scroll-snap with live preview and instant voice switching"]}
          />
          <ControlCard
            title="Smart Text Inputs"
            count={2}
            items={["Fleet Vehicle Registration — fuzzy match against fleet registry", "Operator Name — auto-links driver profile"]}
          />
          <ControlCard
            title="Toggle Switches"
            count={8}
            items={["Traffic Overlay", "Incident Icons", "Truck Routes", "Persist Routes", "DND Mode", "Voice Announcements", "3D Buildings", "Green Wave"]}
          />
          <ControlCard
            title="Interactive Selectors"
            count={5}
            items={["Theme Mode Toggle", "Color Spectrum Picker", "Country + Language", "Vehicle Profile Cards", "Grayscale Override"]}
          />
        </div>

        <div className="rounded-2xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-white/10 p-8 sm:p-12 text-center">
          <Truck className="h-12 w-12 text-blue-400 mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Built for Professional Drivers
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto mb-8">
            TruckNav Pro is designed from the ground up for heavy goods vehicle operators.
            Every feature serves a purpose. Every control does exactly what it says.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              onClick={() => setLocation("/pricing")}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              View Plans
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setLocation("/navigation")}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Try Navigation
            </Button>
          </div>
        </div>

        <div className="mt-16 text-center text-xs text-slate-600">
          <p>TruckNav Pro — Patent-protected by Bespoke Marketing. Ai Ltd</p>
          <p className="mt-1">All features verified and production-ready</p>
        </div>
      </div>
    </div>
  );
}

function ControlCard({ title, count, items }: { title: string; count: number; items: string[] }) {
  return (
    <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px]">
          {count}x
        </Badge>
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-xs text-slate-400">
            <Check className="h-3 w-3 text-emerald-500 mt-0.5 flex-shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

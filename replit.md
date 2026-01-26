# Overview

This project is a specialized web application for truck navigation, providing safe and efficient routing for Heavy Goods Vehicles (HGVs). Its primary purpose is to help truck drivers plan routes that avoid restrictions based on vehicle dimensions (height, width, weight, length) and to locate truck-friendly facilities. The system aims to enhance safety and efficiency for professional drivers through intelligent route planning, real-time information, and a mobile-first design.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Decisions
The frontend uses React with TypeScript and Vite, leveraging Shadcn/ui (Radix UI, Tailwind CSS) for a mobile-first design. It features a 3-mode workflow (Plan → Preview → Navigate), a full-screen route planner, compact trip strip, MobileFAB for one-handed operation, and professional touch targets (44px+). A Day theme is enforced on mobile, and responsive design uses CSS clamp() density tokens.

## Technical Implementations
- **Frontend**: Wouter for client-side routing, TanStack React Query for server state, React Context for local UI state, and React Hook Form with Zod for form management.
- **Backend**: Node.js with Express.js and TypeScript, using Drizzle ORM with PostgreSQL.
- **Authentication**: Replit Auth (OIDC) with Express sessions.
- **Subscription System**: Stripe-powered subscription management with access control.
- **Data Storage**: PostgreSQL with Neon serverless driver, Drizzle Kit for schema migrations, and PostgreSQL for session storage.
- **Core Data Models**: Users, Subscriptions, Vehicle Profiles, Restrictions, Facilities, Routes, Region Preferences, Fleet Vehicles, Operators, Service Records, Fuel Logs, and Vehicle Assignments.
- **Smart Route Planning**: Utilizes TomTom Truck Routing API as the primary engine with GraphHopper as a fallback. It includes intelligent restriction avoidance, spatial validation (Turf.js), critical violation detection, and dimensional checking, with automatic off-route rerouting and a comprehensive restriction warning system.
- **Facility Discovery**: Allows searching for truck-friendly facilities by type and location.
- **Interactive Mapping**: Uses MapLibre GL JS (primary, GPU-accelerated, 3D) and Leaflet (fallback), featuring persistent tile sources, a professional navigation HUD with an enhanced speed limit system, 3D navigation mode, turn-by-turn indicator, and real-time traffic visualization.
- **3-Layer Route Traffic Visualization**: Displays a base route line, traffic color overlay with real-time data, and incident icons along the route from both TomTom Incidents API and crowdsourced reports.
- **Address Autocomplete & POI Search**: Uses TomTom Search API for worldwide address autocomplete and truck-specific POI search with fuzzy matching and a bulletproof geocoding system.
- **Mobile Menu**: Full-screen UI with a tabbed interface for route planning, recent destinations, vehicle selection, theme settings, and tools.
- **Mobile Compatibility & PWA**: Progressive Web App with offline support, iOS enhancements, automatic update detection, and offline features for cached routes, restrictions, and facilities.
- **Voice Commands for Incident Reporting**: Hands-free voice command system using Web Speech API for reporting traffic incidents during navigation, with dynamic language switching.
- **Unified Voice Navigation System v2.0**: Single consolidated voice system for all navigation announcements.
  - **Motorway-Only Mode**: Voice announcements only active on motorways/trunk roads
  - **Junction & Lane Guidance Only**: On motorways, only announces junction exits and lane choices
  - **Emergency Traffic Notifications**: Traffic incidents and delays ALWAYS announced regardless of road type
  - **Female Voice Preference**: Automatically selects female voice in user's language at 0.8 speech rate
  - **Language Support**: Native female voices for all 17 supported languages
  - **Consolidated Architecture**: All voice sources (notifications, navigation, alerts) route through single NavigationVoice singleton
  - **Road Type Detection**: setRoadType() method for filtering based on current road classification
- **Multilingual Voice System**: All voice features dynamically use the user's selected language from i18n settings, supporting 40+ language codes.
- **Bluetooth/CarPlay/Android Auto Audio System**: Comprehensive audio initialization for vehicle connectivity:
  - **Silent Audio Warmup**: HTML5 audio priming on first user interaction to establish audio session
  - **AudioContext Resumption**: Shared AudioContext for alert sounds and audio effects
  - **Speech Synthesis Priming**: Pre-warms Web Speech API for immediate voice response
  - **Automatic Reinitialize**: Handles visibility changes and screen unlock events
  - **Volume Control**: Device media buttons control all audio output via platform media APIs
- **User Guide**: Comprehensive in-app documentation translated into 17 languages.
- **Customizable Alert Sounds**: Personalized audio alerts using Web Audio API for speed limit warnings, traffic incidents, and fatigue/break reminders.
- **Haptic Feedback System**: Vibration API integration for tactile feedback.
- **3D Buildings Layer**: Interactive 3D building extrusions visible at zoom level 14+ when 3D mode is active.
- **Dynamic Route Suggestions**: Intelligent alternative route detection during navigation using TomTom Truck Routing API.
- **AR Navigation Overlay**: Camera-based augmented reality navigation view using device camera and DeviceOrientationEvent.
- **Customizable Dashboard Widgets**: Modular widget system for real-time navigation data.
- **Fleet Management System (Desktop-Only)**: Enterprise-grade system with 14 integrated tabs for advanced analytics, compliance tracking, and enterprise capabilities, including Vehicle Registry, Operator Management, Service Records, Fuel Consumption, Document Management, Cost Analytics, Incident Logging, Trip Tracking, Compliance & Regulatory Tracking, Real-Time Fleet Tracking, Geofencing, Driver Behavior Analytics, Hours of Service (HoS) Compliance, and Customer Billing Portal.

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting.
- **Drizzle ORM**: Type-safe database queries and schema management.

## UI and Styling
- **Radix UI**: Accessible component primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.

## Routing and Navigation Services
- **Wouter**: Lightweight client-side routing.
- **Geolocation APIs**: Browser-based location services.

## TomTom API Integration Suite
- **TomTom Search API**: For address autocomplete and POI search.
- **TomTom Truck Routing API**: Primary routing engine.
- **TomTom Traffic Flow API**: For real-time traffic visualization.
- **TomTom Traffic Incidents API**: For real-time verified incident data.
- **TomTom POI Search API**: For location-aware truck-specific POI search.

## Mapping Libraries
- **MapLibre GL JS**: Primary vector map engine.
- **Leaflet**: Fallback map rendering library.
- **React-Leaflet**: React bindings for Leaflet.
- **Tile Sources**: Google Maps (4 CDN servers), OpenStreetMap, Esri satellite imagery (2 CDN servers).
- **Satellite Performance Optimization (v3.4.34)**: Multi-CDN tile sources for faster satellite imagery loading with fallback redundancy.

## Form and Data Validation
- **Zod**: Runtime type validation and schema definition.
- **React Hook Form**: Forms management.

## State Management
- **TanStack React Query**: Server state management.

## Traffic API Fallback
- **HERE Traffic API**: For traffic flow data when TomTom Traffic Flow fails.
  - **Caching System**: In-memory cache with 2-minute TTL reduces API calls by 50-80%
  - **Spatial Grouping**: Coordinates rounded to 3 decimal places for efficient cache hits
  - **Max Cache Size**: 500 entries with automatic cleanup every 5 minutes
  - **Stats Endpoint**: `/api/here/cache-stats` for monitoring cache performance

## Route Traffic Overlay (v3.4.34)
- **Visibility**: Route-specific traffic overlay remains visible in satellite mode (only generic flow layer is hidden)
- **Layer Ordering**: Traffic overlay automatically moved to top after satellite/label layer changes
- **Fallback Architecture**: TomTom Traffic Flow API primary, HERE Traffic API fallback

## Fleet Broadcast Messaging (v3.4.38)
- **Purpose**: Fleet managers can send broadcast messages to all drivers in their fleet
- **Database Tables**: fleet_broadcasts, fleet_broadcast_reads (read receipts tracking)
- **Priority Levels**: Critical (red), Important (orange), Info (blue)
- **Categories**: General, Safety, Traffic, Operations, Emergency
- **Features**:
  - Priority-based sorting (critical shown first)
  - Read receipt tracking with count
  - Optional message expiration
  - Broadcast history management
- **UI Components**:
  - FleetBroadcastsTab: Manager interface for creating/viewing broadcasts
  - BroadcastNotificationPopup: Driver notification popup (auto-opens for critical messages)
- **API Endpoints**: `/api/fleet/broadcasts/*` with Zod validation

## Mute All Alerts Button (v3.4.39)
- **Purpose**: Quick access button for quiet driving - mutes all voice and audio alerts with one tap
- **Location**: Left action stack (visible during navigation)
- **Visual States**: Gray speaker icon (unmuted) / Red muted icon (muted)
- **Persistence**: Mute state saved to localStorage (`trucknav_mute_all_alerts`)
- **Integration**: Controls NavigationVoice system via `setEnabled()` method

# Fleet Shift Management System (v3.4.32)

## Database Tables
- shift_checkins, shift_handovers, driver_performance_scores, vehicle_health_scores

## Fleet Data Tracking Logic

| Data Type | Follows Vehicle | Follows Driver |
|-----------|-----------------|----------------|
| Service Records | ✅ | ❌ |
| Fuel Logs | ✅ | ✅ (who filled up) |
| Trips | ✅ | ✅ |
| Driver Behavior | ❌ | ✅ |
| Hours of Service | ❌ | ✅ |
| Incidents | ✅ | ✅ (optional) |
| Compliance | ✅ or ✅ | (supports both) |

## Fleet Shift Management Features

### 1. Daily Check-In/Check-Out Tab
- Start of shift: Select vehicle, odometer reading, pre-trip inspection
- End of shift: Odometer reading, fuel level, any issues noted

### 2. Assignment History View
- Quick view of "Who drove this vehicle?" for any date range
- Quick view of "What vehicles did this driver use?" for any date range

### 3. Split Analytics Formulas
- **Driver Performance Score**: Based on behavior data, HoS compliance, incidents - follows the DRIVER
  - Categories: Safety (25%), Efficiency (20%), Compliance (20%), Punctuality (20%), Vehicle Care (15%)
- **Vehicle Health Score**: Based on service history, fuel efficiency, age, mileage - follows the VEHICLE
  - Categories: Mechanical (25%), Safety Systems (25%), Tires (20%), Fluids (15%), Body (15%)
- **Combined Trip Metrics**: Links both for profitability analysis

### 4. Shift Handover Notes
- When one driver ends and another starts the same vehicle, capture handover notes about vehicle condition
- Vehicle condition assessment (excellent/good/fair/poor/critical)
- Urgent issues and recommended actions
- Acknowledgment tracking for incoming drivers

## Implementation Status
- **Type Safety**: All tabs use shared schema types from @shared/schema with display interfaces
- **Status**: UI components complete with demo data for development testing
- **Production Note**: Backend storage CRUD implementation pending for production deployment

# Turn Indicator System (v3.4.36)

## Core Algorithm
The turn indicator analyzes the route path geometry to detect upcoming turns and displays direction arrows consistent with the blue route line.

## Key Features
- **True Perpendicular Projection**: Uses vector math (dot product) to find closest point on any route segment
- **Route Progress Tracking**: Maintains progress ref to prevent backwards snapping in hairpins/parallel roads
- **GPS Heading Validation**: Uses smoothedHeading from GPS to validate segment selection and prefer travel-aligned segments
- **Cumulative Distance**: Precomputes distances along route for O(1) distance lookups
- **Constrained Search Window**: Only searches from (progress - 2) to (progress + 20) segments ahead

## Turn Detection Logic
1. Find closest segment using perpendicular projection within search window
2. Validate segment alignment with GPS heading (prefer heading-aligned segments)
3. Update route progress (only moves forward, never backwards by >2)
4. Scan ahead for next significant turn (>25° angle change)
5. Calculate distance to turn using cumulative route distances
6. Map turn angle to direction: 25-50° = slight, 50-115° = regular, >115° = sharp

## Progress Reset Points
- Route recalculation (reroute)
- Journey load from storage
- New route calculation
- Alternative route selection
- Navigation activation
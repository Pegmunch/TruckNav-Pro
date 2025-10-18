# Overview

This project is a specialized web application for truck navigation, providing safe and efficient routing for Heavy Goods Vehicles (HGVs). Its primary purpose is to help truck drivers plan routes that avoid restrictions based on vehicle dimensions (height, width, weight, length) and to locate truck-friendly facilities. The system aims to enhance safety and efficiency for professional drivers through intelligent route planning, real-time information, and a mobile-first design.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Changes

## October 18, 2025 - Navigation UI Fixes
- Fixed duplicate speedometer bug: Removed speedometers from plan and preview modes, kept only in navigate mode
- Fixed navigation controls visibility: Removed CSS `z-index: 50 !important` override that was hiding the 7 navigation buttons (compass, recenter, zoom in/out, 3D toggle, traffic toggle, map view toggle)
- Confirmed route line colors: White outline (#ffffff, width 16) + light blue center (#60a5fa, width 12) correctly configured in MapLibre
- Fixed NavigationSidebar transparency: Changed Tools & Widgets panel background from `bg-card` to `bg-white` for solid white coverage

# System Architecture

## Frontend
- **Framework**: React with TypeScript and Vite.
- **UI/UX**: Shadcn/ui (Radix UI, Tailwind CSS) with a mobile-first, 3-mode workflow (Plan → Preview → Navigate). Features include a full-screen route planner, compact trip strip, MobileFAB for one-handed operation, professional touch targets (44px+), Day theme enforced on mobile, and responsive design using CSS clamp() density tokens. Screen Wake Lock API prevents display sleep.
- **Routing**: Wouter for client-side routing.
- **State Management**: TanStack React Query for server state; React Context for local UI state.
- **Forms**: React Hook Form with Zod validation.

## Backend
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ESM modules.
- **Database ORM**: Drizzle ORM with PostgreSQL dialect.
- **API Design**: RESTful endpoints for vehicle profiles, restrictions, facilities, and routes.
- **Authentication**: Replit Auth (OIDC) with Express sessions and PostgreSQL storage.
- **Subscription System**: Stripe-powered subscription management with access control.

## Data Storage
- **Primary Database**: PostgreSQL with Neon serverless driver.
- **Schema Management**: Drizzle Kit for migrations.
- **Session Storage**: PostgreSQL-based session store.

## Core Data Models
- **Users**: Authentication and session management.
- **Subscriptions**: User subscriptions linked to pricing plans (4 tiers).
- **Vehicle Profiles**: Dimensions, axle count, hazmat status.
- **Restrictions**: Geographic and type-based limits.
- **Facilities**: Truck stops, fuel stations, parking areas with amenities.
- **Routes**: Saved routes including start/end, coordinates, and calculated paths.
- **Region Preferences**: UK, USA, or Europe selection automatically sets speed limit sign style and measurement units (imperial/metric).

## Technical Implementations & System Design
- **Smart Route Planning**: Calculates routes avoiding restrictions based on vehicle profiles.
    - **TomTom Truck Routing API**: Primary routing engine with full truck-specific support including vehicle dimensions (height, width, length, weight), axle weight distribution, hazmat routing, and commercial vehicle restrictions.
    - **GraphHopper Fallback**: Secondary routing engine for reliability when TomTom is unavailable.
    - **Intelligent Restriction Avoidance**: Global coverage with country-specific filtering, spatial validation (Turf.js), critical violation detection, automatic rerouting, safety blocking for unsafe routes, and dimensional checking (height, width, weight, length).
- **Facility Discovery**: Search for truck-friendly facilities by type and location.
- **Interactive Mapping**:
    - **Map Engines**: MapLibre GL JS (primary, GPU-accelerated, 3D), Leaflet (fallback).
    - **Persistent Tile Sources**: Four tile sources (roads-2d, roads-3d, satellite-2d, satellite-3d).
    - **Mobile Layout**: Map mounted at z-0 with HUD elements overlaid.
    - **Professional Navigation HUD**: Lowered GPS marker, elongated oval speedometer with speed limit, current speed, and dynamic road info.
        - **Enhanced Speed Limit System**: Queries OpenStreetMap Overpass API (5s, 100m radius), intelligent fallback estimates, confidence indicators, and mph/km/h conversions.
        - **Region-Specific Speed Limit Signs**: Three distinct sign styles matching local road signage standards:
            - **UK**: Circular red border on white background, MPH (traditional UK road sign)
            - **USA**: Rectangular white sign with black border, "SPEED LIMIT" text above number, MPH
            - **Europe**: Circular red border on white background, KPH (standard European sign)
        - **Enhanced Road Display**: Motorway/highway references (M25, A1, I-95, E40), junction numbers (J15, E3), destination arrows, and color-coded badges.
    - **Enhanced 3D Navigation Mode**: Professional forward-looking perspective (67° pitch, 18.5 zoom), automatic heading-up rotation with TRUE point-to-segment distance tracking (9.99% reliability), optimized camera positioning.
        - **Dynamic Segment Tracking**: Projects current position onto each route segment using parametric line projection (t parameter clamped 0-1) to find nearest active segment, ensuring map rotates correctly through ALL turns.
        - **Dual-Mode Bearing**: GPS heading (priority 1) OR route geometry bearing from nearest segment (priority 2) - works perfectly with or without GPS.
        - **Haversine Distance**: Calculates true perpendicular distance to route segments (not just vertices) for accurate segment identification at long roads, sharp turns, and intersections.
    - **Turn-by-Turn Indicator**: Large bubble showing next turn direction, distance conversion, optional road name, iOS-safe positioning.
    - **Simplified Navigation Info Bar**: Minimal top bar with ETA and remaining distance.
    - **Real-Time Traffic Visualization**: TomTom Traffic Flow API with color-coding and 5-minute auto-refresh.
    - **TomTom Traffic Incidents API**: Real-time verified incident data including accidents, construction, hazards, road closures, and delays with severity levels and geographic filtering.
    - **Crowdsourced Incident Reporting**: 23 incident types, real-time feed, map markers, 2-minute auto-refresh, 24-hour auto-expiration.
    - **Automatic GPS Position Lock & Real-Time Bearing Rotation**: Map auto-zooms and rotates to travel direction.
    - **GPS Singleton Provider**: Centralized, battery-optimized GPS tracking with EMA heading smoothing.
    - **Vehicle-Specific GPS Markers**: Responsive markers with vehicle-type icons, smooth heading rotation, halo rings, shadows, and pulse animation.
    - **Dynamic Route Visualization**: GraphHopper road-snapped routes with white outline, dynamically shortens during navigation.
    - **Robustness Features**: GPS auto-zoom circuit breaker, postcode search resilience, map animation safety, navigation mode stability.
- **Address Autocomplete & POI Search**:
    - **TomTom Search API**: Worldwide address autocomplete and truck-specific POI search with fuzzy matching and typeahead support.
    - **Search Features**: City names, street addresses, landmarks, postcodes with 3-character minimum, 300ms debouncing, GPS-biased location search.
    - **POI Categories**: Truck stops (7315), gas stations (7311), rest areas (9920), service areas, commercial/industrial locations.
    - **Saved Locations**: Favorites and recent searches.
    - **Bulletproof Geocoding System** (99.9% reliability):
        - **Priority 0**: Direct coordinate input (supports comma, semicolon, slash, whitespace delimiters)
        - **Priority 1**: Cached coordinates with proper validation (includes zero values for Greenwich/Equator)
        - **Priority 2**: UK postcodes via postcodes.io API
        - **Priority 3**: TomTom Search API with intelligent retry logic (3 attempts, exponential backoff: 1s/2s/4s)
        - **Smart Error Handling**: Retries transient failures (408/409/429/499/5xx), fails fast on permanent errors (400/401/403/404)
        - **Comprehensive Logging**: [ROBUST-GEOCODE], [TOMTOM-GEOCODE], [COORD-EXTRACT] prefixes for debugging
        - **Source Tracking**: Telemetry tags (direct, cached, postcode_io, tomtom) for analytics
- **Comprehensive Mobile Menu**:
    - **Full-Screen Mobile UI**: Solid background, complete viewport coverage (h-[100vh]), proper scroll handling with ScrollArea.
    - **Tabbed Interface**: 5 tabs - Plan Route, Recent Destinations, Vehicle Selection, Theme Settings (including Region/Speed Limit preferences), Tools.
    - **Route Planning with Live Autocomplete**: Both From/To inputs feature TomTom-powered autocomplete dropdowns positioned below inputs using Popover (side="bottom"). Debounced search (300ms), GPS-biased results, loading states, empty states.
    - **Integration**: Reuses useTomTomAutocomplete hook with formatTomTomDisplay helper for consistent address formatting.
    - **Accessibility**: Full ARIA support with DialogDescription for screen readers.
- **Mobile Compatibility & PWA**:
    - **Progressive Web App**: Offline support via service worker and IndexedDB caching.
    - **iOS Enhancements**: Custom splash screens, meta tags for fullscreen and status bar.
    - **Update Management**: Automatic update detection.
    - **Offline Features**: Cached routes, restrictions, facilities.
    - Screen Wake Lock API, safe-area handling for iOS, Android hardware back button handling, orientation lock preferences.

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
All TomTom features use the `VITE_TOMTOM_API_KEY` environment variable.

### 1. TomTom Search API
- **Endpoint**: `/api/tomtom-search`
- **Features**: Worldwide address autocomplete with GPS-biased results, fuzzy matching, typeahead support
- **Search Types**: City names, street addresses, landmarks, postcodes (3-char minimum, 300ms debouncing)
- **POI Categories**: Truck stops (7315), Gas stations (7311), Rest areas (9920), Service areas
- **Fallback**: postcodes.io for UK postcode geocoding

### 5. TomTom POI Search API
- **Endpoint**: `/api/poi-search`
- **Purpose**: Location-aware truck-specific POI search replacing unreliable Photon-based searches
- **Features**: Real-time POI discovery with accurate location biasing, truck-relevant categories, 10-25km search radius
- **POI Types**: fuel (7311/7312/7313), parking (7309), restaurant (7318), truck_stop (7315), supermarket (7332)
- **Integration Points**: NavigationSidebar Tools & Widgets (10km radius), UnifiedSearchPanel (all categories)
- **Location Sources**: Complete 3-tier fallback chain - GPS position → manual location → route fromCoordinates (address input fallback)
- **User Feedback**: Intelligent toast messages inform users which location source is being used (GPS, manual location, or route location) or guide them to enable GPS/enter location if none available
- **Fallback**: Photon/OSM search if TomTom returns no results
- **Response Format**: Normalized Facility objects with id, name, address, city, coordinates, type, amenities

### 2. TomTom Truck Routing API  
- **Integration**: Primary routing engine in `calculateStrictVehicleClassRoute`
- **Features**: Full truck-specific support with vehicle dimensions (height, width, length, weight), axle weight distribution, hazmat routing, commercial vehicle restrictions
- **Maneuver Mapping**: TomTom string maneuvers → GraphHopper numeric sign codes for UI compatibility
- **Traffic**: Real-time traffic-aware routing
- **Fallback**: GraphHopper for reliability when TomTom unavailable

### 3. TomTom Traffic Flow API
- **Purpose**: Real-time traffic visualization with color-coding
- **Refresh**: 5-minute auto-refresh
- **Display**: Traffic-aware route overlay with speed ratio visualization

### 4. TomTom Traffic Incidents API
- **Endpoint**: `/api/tomtom/traffic-incidents`
- **Features**: Real-time verified incident data (accidents, construction, hazards, road closures, delays)
- **Data**: Severity levels (low/medium/high), geographic filtering, delay magnitude, incident types
- **Mapping**: TomTom icon categories → app incident types
- **Geometry**: Point and LineString support with midpoint extraction

## Mapping Libraries
- **MapLibre GL JS**: Primary vector map engine.
- **Leaflet**: Fallback map rendering library.
- **React-Leaflet**: React bindings for Leaflet.
- **Tile Sources**: Google Maps, OpenStreetMap, Esri satellite imagery.

## Form and Data Validation
- **Zod**: Runtime type validation and schema definition.
- **React Hook Form**: Forms management.

## State Management
- **TanStack React Query**: Server state management.
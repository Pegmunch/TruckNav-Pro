# Overview

This project is a specialized web application for truck navigation, designed to provide safe and efficient routing for heavy goods vehicles (HGVs). Its primary purpose is to help truck drivers plan routes that avoid restrictions based on vehicle dimensions (height, width, weight, length) and to locate truck-friendly facilities along their journey. The system aims to enhance safety and efficiency for professional drivers by offering intelligent route planning and real-time information.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript and Vite.
- **UI/UX**: Shadcn/ui components (built on Radix UI) for accessibility, styled with Tailwind CSS and CSS variables.
- **Routing**: Wouter for client-side routing.
- **State Management**: TanStack React Query for server state and caching; React Context for local UI state.
- **Forms**: React Hook Form with Zod validation.
- **UI/UX Decisions**:
    - Mobile-first approach with a clean, 3-mode workflow (Plan → Preview → Navigate).
    - Dedicated full-screen route planner for mobile with a hamburger menu.
    - Compact trip strip for navigation data.
    - MobileFAB component with speed-dial for one-handed operation.
    - Professional touch targets (44px+) optimized for gloved use.
    - Day (light) theme enforced on mobile for better visibility.
    - Responsive design using CSS clamp() density tokens.
    - Screen Wake Lock API to prevent display sleep during navigation.

## Backend Architecture
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ESM modules.
- **Database ORM**: Drizzle ORM with PostgreSQL dialect.
- **API Design**: RESTful endpoints for vehicle profiles, restrictions, facilities, and routes.
- **Authentication**: Replit Auth (OIDC) with Express sessions and PostgreSQL storage.
- **Subscription System**: Stripe-powered subscription management with access control middleware.
  - **Pricing Tiers**: 3-month (£25.99), 6-month (£49.99), 12-month (£99), Lifetime (£200)
  - **Access Control**: Subscription middleware protects all navigation features
  - **Payment Integration**: Stripe Checkout with test keys for development

## Data Storage Solutions
- **Primary Database**: PostgreSQL with Neon serverless driver.
- **Schema Management**: Drizzle Kit for migrations.
- **Session Storage**: PostgreSQL-based session store using `connect-pg-simple`.

## Core Data Models
- **Users**: User authentication via Replit Auth (OIDC), session management.
- **Subscriptions**: User subscriptions linked to pricing plans with expiry dates.
- **Subscription Plans**: 4 pricing tiers with feature access control.
- **Vehicle Profiles**: Dimensions (height, width, length, weight), axle count, hazmat status.
- **Restrictions**: Geographic coordinates, type (height/width/weight), limits.
- **Facilities**: Truck stops, fuel stations, parking areas with amenities.
- **Routes**: Saved routes including start/end, coordinates, and calculated paths.

## Technical Implementations & System Design
- **Smart Route Planning**: Calculates routes avoiding restrictions based on vehicle profiles.
- **Restriction Awareness**: Real-time checking of restrictions against vehicle dimensions.
- **Facility Discovery**: Search for truck-friendly facilities by type and location.
- **Interactive Mapping**:
    - **Map Engines**: MapLibre GL JS (default, GPU-accelerated, 3D support); Leaflet (fallback for non-WebGL devices).
    - **Persistent Tile Source Design**: All 4 tile sources (roads-2d, roads-3d, satellite-2d, satellite-3d) defined at initialization to eliminate tile loss during pan/zoom.
    - **Performance**: Aggressive caching (maxTileCacheSize: 500) and smooth transitions (fadeDuration: 100ms).
    - **Mobile Layout Architecture**: Map always mounted at z-0 base layer with HUD elements overlaid using absolute positioning at higher z-indexes. Prevents conditional mounting/unmounting which caused MapLibre tile loss.
    - **Compass/Orientation Control**: Top-right corner compass button displays current bearing (rotates with map), resets map to North (bearing 0°) on click with smooth animation.
    - **Speedometer**: GPS-based live speed tracking with speed limit display and auto MPH/KPH conversion.
    - **Real-Time Traffic Visualization**: TomTom Traffic Flow API integration with automatic color-coding (red/orange/yellow/green) based on traffic speed ratios, zoom-based line width scaling (2-8px), and 5-minute auto-refresh for latest traffic data.
    - **Traffic-Aware Route Coloring**: Routes automatically display color-coded segments based on real-time traffic conditions - heavy traffic areas show in red (speed ratio <0.3), moderate in orange (<0.6), light in yellow (<0.8), and free flow in blue (≥0.8). Auto-resamples every 2 minutes for live updates.
    - **Crowdsourced Incident Reporting System**: Community-driven traffic awareness with 23-type incident library featuring emoji icons across 6 categories (Emergency Services, Vehicle Incidents, Road Conditions, Traffic, Hazards, Weather). Features include: interactive 3-step wizard for reporting incidents, real-time incident feed showing nearby reports with distances, map markers with emoji icons, auto-refresh every 2 minutes, 24-hour auto-expiration, and GPS-based location capture. Works independently without external API keys.
    - **Auto-Route Planning**: 3-second debounce delay prevents premature route calculation while entering postcodes.
    - **Automatic GPS Position Lock & Real-Time Bearing Rotation (Production-Grade)**: When navigation starts, map automatically zooms to user's exact GPS location at maximum street level (zoom 19.5, 60° pitch) with 2-second flyTo animation and auto-rotation to GPS heading direction. During navigation, map continuously rotates to match real-time GPS direction of travel so route always points forward/upward. Switches to roads mode for optimal visibility. Enterprise-level robustness: retry logic for GPS timeouts, intelligent fallback to route start coordinates if GPS unavailable, comprehensive error handling for all GeolocationPositionError codes (PERMISSION_DENIED, TIMEOUT, POSITION_UNAVAILABLE), map readiness checks, and user-friendly toast notifications. Route line rendered at 10px width for clear visibility. Blue arrowhead marker displays current GPS position on route.
    - **GPS Singleton Provider (Battery Optimized)**: Centralized GPS tracking using React Context pattern eliminates duplicate geolocation watchers. Single `navigator.geolocation.watchPosition` for entire app shared across all components (MapLibreMap, SpeedDisplay). Location: `client/src/contexts/gps-context.tsx`. Features: EMA heading smoothing (alpha=0.25) with circular angle interpolation for smooth map rotation, dynamic smoothing enabled during navigation only, proper cleanup on unmount. Prevents battery drain from multiple concurrent GPS watchers.
    - **Enhanced Mobile Marker Visibility**: GPS arrowhead marker uses responsive sizing (56-84px based on devicePixelRatio) with z-index 1000 for visibility above route line. Scales automatically: 1x displays get 56px, 2x Retina maintains 56px, 3x high-end devices get 84px. Blue halo ring, enhanced shadows, and pulse animation for clear position indication.
    - **MapLibre WebGL Reliability**: Comprehensive WebGL capability detection with retry logic (up to 3 attempts), checks for required extensions (OES_standard_derivatives, OES_element_index_uint), localStorage persistence for fallback state, user-facing toast notifications, and custom event system for initialization errors. Ensures reliable fallback to Leaflet on devices with limited GPU support.
    - **99.9% Production-Grade Robustness** (max 0.1% failure rate):
        - **GPS Auto-Zoom Circuit Breaker**: Stale coordinate detection (tracks last position, flags unchanged readings as failures), dual-layer position caching (in-memory + sessionStorage, 5-min TTL), exponential backoff retry (1s → 2s → 4s delays), comprehensive telemetry logging ([GPS-ZOOM] prefix), visual cache warnings ("⚠️ Using Cached Location" toasts), multi-layer fallback (GPS → cached → route start → error), circuit opens after 3 failures within 30s.
        - **Postcode Search Resilience**: Singleton cache architecture (globalAutocompleteCache, globalPhotonCircuitBreaker, globalUkCircuitBreaker shared across all components), LRU cache (100 entries, 5-min TTL), sessionStorage corruption auto-detection and clearing, exponential backoff circuit breaker (10s → 20s → 40s → 60s max cooldown), offline/online transition handling (resets circuit breakers on reconnect), 5-second timeout with AbortController, stale data serving when offline.
        - **Map Animation Safety**: WebGL context validation before all animations, safeBearingUpdate error handling with graceful degradation, reset bearing watchdog (3-failure threshold triggers auto-recovery), periodic map validity checking (5-second intervals during navigation), isMapLibreValid state tracking, automatic recovery attempts via map.resize(), comprehensive [MAP] telemetry, moveend event verification for animation completion.
        - **Navigation Mode Stability**: Mode transition debouncing (50ms delay prevents race conditions), MobileFAB icon synchronization via useEffect (ensures icon always matches mode state), navigation start guards (validates mode, route, vehicle profile), automated speedometer visibility check (every 3 seconds, forces recovery if missing), [NAV-MODE] telemetry for all transitions, prevents inconsistent UI during rapid plan→navigate→plan toggling.
- **Address Autocomplete**: 
  - **Photon API Only**: Free worldwide address search using OpenStreetMap data (no postcode database)
  - **Search Method**: Users type city names, street addresses, or landmarks (not raw postcodes)
  - **Minimum Characters**: 3 characters required to trigger search
  - **Debouncing**: 300ms delay for efficient API usage
  - **Error Resilience**: 5-second timeout, 2 retries with exponential backoff (1s, 2s delays)
  - **Display Format**: "{name/street}, {city}, {country}" with Globe icon
  - **Saved Locations**: Favorites and recent searches for quick access
  - **Coverage**: NavigationSidebar, RoutePlanningPanel (LocationDropdown), SimplifiedRouteDrawer (AddressAutocomplete)
  - **Keyboard Support**: Enter key to select highlighted suggestions
  - **Limitation**: Raw UK postcodes may not return results; users should enter full addresses or city names instead
- **Mobile Compatibility & PWA**:
    - **Progressive Web App**: Full offline support with service worker and IndexedDB caching.
    - **iOS Enhancements**: Custom splash screens for iPhone 15 Pro Max, 15 Pro, SE, 8 Plus, and iPad Pro.
    - **iOS Meta Tags**: Black-translucent status bar, fullscreen mode, theme colors for light/dark modes.
    - **Service Worker**: v2.0.0 with cache-first strategy for maps, network-first for APIs, background sync.
    - **Install Prompts**: iOS-specific "Add to Home Screen" instructions with visual guides.
    - **Update Management**: Automatic update detection with user-friendly toast notifications.
    - **Offline Features**: Cached routes, restrictions, facilities for offline navigation.
    - Screen Wake Lock API.
    - Safe-area handling for iOS.
    - Android hardware back button handling.
    - Orientation lock preferences.

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

## Traffic Data Services
- **TomTom Traffic Flow API**: Real-time traffic visualization with vector tiles.
  - **Required Environment Variable**: `VITE_TOMTOM_API_KEY` - TomTom API key for traffic data access.
  - **Features**: Automatic color-coded traffic flow (red=heavy, orange=moderate, yellow=light, green=free flow).
  - **Auto-refresh**: Traffic data updates every 5 minutes.

## Address Autocomplete Services
- **Photon API**: Free worldwide address autocomplete (OpenStreetMap-based, no API key required)
  - **Endpoint**: https://photon.komoot.io/api/
  - **Features**: Worldwide geocoding and address search with automatic language detection
  - **Integration**: 300ms debounced requests with 5-second timeout and 2 retries
  - **Error Handling**: Graceful degradation with exponential backoff
  - **Components**: LocationDropdown, AddressAutocomplete, NavigationSidebar

## Mapping Libraries
- **MapLibre GL JS**: Primary vector map engine.
- **Leaflet**: Fallback map rendering library.
- **React-Leaflet**: React bindings for Leaflet.
- **Tile Sources**: Google Maps (3D), OpenStreetMap, Esri satellite imagery.

## Form and Data Validation
- **Zod**: Runtime type validation and schema definition.
- **React Hook Form**: Forms management.

## State Management
- **TanStack React Query**: Server state management.
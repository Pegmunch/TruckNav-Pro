# Overview

This project is a specialized web application for truck navigation, providing safe and efficient routing for Heavy Goods Vehicles (HGVs). Its primary purpose is to help truck drivers plan routes that avoid restrictions based on vehicle dimensions (height, width, weight, length) and to locate truck-friendly facilities. The system aims to enhance safety and efficiency for professional drivers through intelligent route planning, real-time information, and a mobile-first design.

# User Preferences

Preferred communication style: Simple, everyday language.

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
        - **Enhanced Road Display**: Motorway/highway references (M25, A1, I-95, E40), junction numbers (J15, E3), destination arrows, and color-coded badges.
    - **Enhanced 3D Navigation Mode**: Professional forward-looking perspective (67° pitch, 18.5 zoom), automatic heading-up rotation, optimized camera positioning.
    - **Turn-by-Turn Indicator**: Large bubble showing next turn direction, distance conversion, optional road name, iOS-safe positioning.
    - **Simplified Navigation Info Bar**: Minimal top bar with ETA and remaining distance.
    - **Real-Time Traffic Visualization**: TomTom Traffic Flow API with color-coding and 5-minute auto-refresh.
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
    - **UK Postcode Fallback**: postcodes.io integration for accurate UK postcode geocoding.
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

## Traffic Data Services
- **TomTom Traffic Flow API**: Real-time traffic visualization.
  - **Required Environment Variable**: `VITE_TOMTOM_API_KEY`

## Address Autocomplete Services
- **TomTom Search API**: Worldwide address autocomplete and truck-specific POI search.
  - **Required Environment Variable**: `VITE_TOMTOM_API_KEY`
  - **Endpoints**: Fuzzy Search, POI Search with category filtering
- **postcodes.io**: UK postcode fallback geocoding service.

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
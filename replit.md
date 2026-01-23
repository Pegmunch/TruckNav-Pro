# Overview

This project is a specialized web application for truck navigation, providing safe and efficient routing for Heavy Goods Vehicles (HGVs). Its primary purpose is to help truck drivers plan routes that avoid restrictions based on vehicle dimensions (height, width, weight, length) and to locate truck-friendly facilities. The system aims to enhance safety and efficiency for professional drivers through intelligent route planning, real-time information, and a mobile-first design.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Decisions
The frontend uses React with TypeScript and Vite, leveraging Shadcn/ui (Radix UI, Tailwind CSS) for a mobile-first design. It features a 3-mode workflow (Plan → Preview → Navigate), a full-screen route planner, compact trip strip, MobileFAB for one-handed operation, and professional touch targets (44px+). A Day theme is enforced on mobile, and responsive design uses CSS clamp() density tokens. The Screen Wake Lock API prevents display sleep.

## Technical Implementations
- **Frontend**: Wouter for client-side routing, TanStack React Query for server state, React Context for local UI state, and React Hook Form with Zod for form management.
- **Backend**: Node.js with Express.js and TypeScript, using Drizzle ORM with PostgreSQL.
- **Authentication**: Replit Auth (OIDC) with Express sessions.
- **Subscription System**: Stripe-powered subscription management with access control.
- **Data Storage**: PostgreSQL with Neon serverless driver, Drizzle Kit for schema migrations, and PostgreSQL for session storage.
- **Core Data Models**: Users, Subscriptions, Vehicle Profiles, Restrictions, Facilities, Routes, Region Preferences, Fleet Vehicles, Operators, Service Records, Fuel Logs, and Vehicle Assignments.
- **Smart Route Planning**: Utilizes TomTom Truck Routing API as the primary engine with GraphHopper as a fallback. It includes intelligent restriction avoidance, spatial validation (Turf.js), critical violation detection, and dimensional checking. Features automatic off-route rerouting, a comprehensive restriction warning system with interactive map markers, and warnings that hide during navigation.
- **Facility Discovery**: Allows searching for truck-friendly facilities by type and location.
- **Interactive Mapping**: Uses MapLibre GL JS (primary, GPU-accelerated, 3D) and Leaflet (fallback). Features persistent tile sources, a professional navigation HUD with an enhanced speed limit system, 3D navigation mode, turn-by-turn indicator, CompactTripStrip, 8-button navigation control stack, real-time traffic visualization, and crowdsourced incident reporting. Automatic GPS position lock, real-time bearing rotation, and vehicle-specific GPS markers are also implemented.
- **3-Layer Route Traffic Visualization**: During navigation, displays three stacked layers on the route line: (1) Base blue route line, (2) Traffic color overlay with real-time TomTom Flow API data (green/yellow/orange/red segments based on congestion), (3) Incident icons along route from both TomTom Incidents API and crowdsourced reports. Layers refresh every 2 minutes with proper polyline distance filtering for incidents.
- **Address Autocomplete & POI Search**: Uses TomTom Search API for worldwide address autocomplete and truck-specific POI search with fuzzy matching. Features a bulletproof geocoding system with priority-based lookups.
- **Mobile Menu**: Full-screen UI with a tabbed interface for route planning, recent destinations, vehicle selection, theme settings, and tools.
- **Mobile Compatibility & PWA**: Progressive Web App with offline support, iOS enhancements, automatic update detection, and offline features for cached routes, restrictions, and facilities.
- **Voice Commands for Incident Reporting**: Hands-free voice command system using Web Speech API for reporting traffic incidents during navigation. Supports dynamic language switching based on user's selected i18n language.
- **Multilingual Voice System**: All voice features (dictation, navigation voice, TTS) dynamically use the user's selected language from i18n settings, with support for 40+ language codes including regional variants (en-US, en-GB, en-CA, en-AU, es-ES, es-MX, fr-FR, fr-CA, de-DE, it-IT, pt-BR, pt-PT, nl-NL, pl-PL, ro-RO, ru-RU, tr-TR, ar-SA, hi-IN, zh-CN, zh-TW, ja-JP, ko-KR, and more).
- **User Guide**: Comprehensive in-app documentation accessible from map interface, translated into 17 languages with detailed feature explanations for all app capabilities.
- **Customizable Alert Sounds**: Personalized audio alerts using Web Audio API for speed limit warnings, traffic incidents, and fatigue/break reminders, with configurable sound options, volume control, and toggles.
- **Haptic Feedback System**: Vibration API integration for tactile feedback on button presses and navigation events with multiple patterns and user preferences.
- **3D Buildings Layer**: Interactive 3D building extrusions using Protomaps vector tiles, visible at zoom level 14+ when 3D mode is active.
- **Dynamic Route Suggestions**: Intelligent alternative route detection during navigation using TomTom Truck Routing API, displaying time savings and allowing one-tap route switching.
- **AR Navigation Overlay**: Camera-based augmented reality navigation view using device camera and DeviceOrientationEvent, featuring real-time speed, speed limit warnings, maneuver overlays, and ETA/distance display.
- **Customizable Dashboard Widgets**: Modular widget system showing real-time navigation data with drag-and-drop configuration and persistent settings.
- **Fleet Management System (Desktop-Only)**: Enterprise-grade comprehensive fleet management system for office/back-end use with 14 integrated tabs for advanced analytics, compliance tracking, and enterprise capabilities, including: Vehicle Registry, Operator Management, Service Records, Fuel Consumption, Document Management, Cost Analytics Dashboard, Incident Logging, Trip Tracking & Profitability Analysis, Compliance & Regulatory Tracking, Real-Time Fleet Tracking, Geofencing System, Driver Behavior Analytics, Hours of Service (HoS) Compliance, and Customer Billing Portal. Includes a dedicated desktop navigation for switching between interfaces.

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
- **Tile Sources**: Google Maps, OpenStreetMap, Esri satellite imagery.

## Form and Data Validation
- **Zod**: Runtime type validation and schema definition.
- **React Hook Form**: Forms management.

## State Management
- **TanStack React Query**: Server state management.

# Version Checkpoints

## STABLE RELEASE: TruckNav Pro v3.4.25
- **Date**: January 22, 2026
- **Git Commit**: fc039a23ef66b5554ce061cb3c41de0ac0990635
- **Status**: PUBLISHED - Stable Production Release
- **Key Features**: 
  - Bulletproof coordinate validation for all Turf.js operations
  - Recent origins and destinations saving
  - Auto-GPS "from" field population
  - Fixed turn direction using TomTom sign codes
  - Blue route line always visible during navigation
- **Rollback Note**: Use this checkpoint to restore a known working version of TruckNav Pro

## v3.4.30 - Route Traffic Visualization
- **Date**: January 23, 2026
- **Key Features**:
  - 3-layer traffic visualization system on route line during navigation
  - Layer 1: Base blue route line (always visible)
  - Layer 2: TomTom Traffic Flow API color overlay (green/yellow/orange/red segments)
  - Layer 3: Route incident icons (TomTom + crowdsourced) with proper polyline distance filtering
  - 2-minute auto-refresh for traffic data and incidents
  - Neutral gray color for segments with unknown traffic data (API errors)
  - Voice-activated incident reporting with purple microphone button
  - iOS-friendly touch handling for orange incident button
  - Traffic status indicator and legend during navigation
  - Graceful error handling with gray/unknown color for API failures

## HERE Traffic API Integration (v3.4.31)
- **Date**: January 23, 2026
- **Key Features**:
  - HERE Traffic Flow API v7 integrated as automatic fallback when TomTom Traffic Flow fails
  - Server-side endpoint at `/api/here/traffic-flow` proxies requests securely
  - Seamless failover: TomTom tried first, HERE used if TomTom returns 403/error
  - Speed data converted from m/s to mph for consistency
  - 250,000 free queries/month from HERE

## Alternative Traffic Data Sources (for reference)
- **HERE Traffic API**: 250,000 queries/month free tier (NOW INTEGRATED as fallback)
- **Azure Maps Traffic API**: Free tier with Azure account
- **Netherlands NDW Open Data**: Free government data for Europe (Datex-II format)
- **TomTom Truck Routing API**: Works with current key (includes traffic delay estimates in route calculation)
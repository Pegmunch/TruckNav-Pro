# Overview

This project is a specialized web application for truck navigation, designed to provide safe and efficient routing for Heavy Goods Vehicles (HGVs). It helps truck drivers plan routes that avoid restrictions based on vehicle dimensions (height, width, weight, length) and facilitates the discovery of truck-friendly facilities. The system aims to enhance safety and efficiency for professional drivers through intelligent route planning, real-time information, and a mobile-first design.

# User Preferences

Preferred communication style: Simple, everyday language.

## Design Decisions (DO NOT CHANGE)
- **Traffic Color Scheme**: Normal/Free flow traffic uses BLUE (#0067FF, #3B82F6), NOT green. The traffic legend shows: Blue = Normal Flow, Green = Light, Yellow = Moderate, Orange = Heavy, Red = Standstill.
- **Theme Default**: Auto theme (not Day theme) should be default on first app entry.
- **Vehicle Profiles**: Simplified to two options - Class 1 Truck (truck restrictions) and Car (fastest route).
- **Voice Navigation**: Female English voice as default, announce ALL turns and lane selections (motorwayOnlyMode: false).

# System Architecture

## UI/UX Decisions
The frontend uses React with TypeScript and Vite, employing Shadcn/ui (Radix UI, Tailwind CSS) for a mobile-first design. Key features include a 3-mode workflow (Plan → Preview → Navigate), a full-screen route planner, compact trip strip, MobileFAB for one-handed operation, and professional touch targets. A Day theme is enforced on mobile, and responsive design utilizes CSS clamp() density tokens.

## Technical Implementations
- **Frontend**: Wouter for client-side routing, TanStack React Query for server state, React Context for local UI state, and React Hook Form with Zod for form management.
- **Backend**: Node.js with Express.js and TypeScript, using Drizzle ORM with PostgreSQL.
- **Authentication**: Replit Auth (OIDC) with Express sessions.
- **Subscription System**: Stripe-powered subscription management with access control.
- **Data Storage**: PostgreSQL with Neon serverless driver, Drizzle Kit for schema migrations, and PostgreSQL for session storage.
- **Core Data Models**: Includes Users, Subscriptions, Vehicle Profiles, Restrictions, Facilities, Routes, Region Preferences, Fleet Vehicles, Operators, Service Records, Fuel Logs, and Vehicle Assignments.
- **Smart Route Planning**: Utilizes TomTom Truck Routing API as the primary engine with GraphHopper as a fallback. It incorporates intelligent restriction avoidance, spatial validation (Turf.js), critical violation detection, dimensional checking, automatic off-route rerouting, and a comprehensive restriction warning system.
- **Facility Discovery**: Enables searching for truck-friendly facilities by type and location.
- **Interactive Mapping**: Uses MapLibre GL JS (primary, GPU-accelerated, 3D) and Leaflet (fallback). Features include persistent tile sources, a professional navigation HUD with an enhanced speed limit system, 3D navigation mode, turn-by-turn indicator, and real-time traffic visualization.
- **3-Layer Route Traffic Visualization**: Displays a base route line, traffic color overlay with real-time data, and incident icons along the route from TomTom Incidents API and crowdsourced reports.
- **Address Autocomplete & POI Search**: Utilizes TomTom Search API for worldwide address autocomplete and truck-specific POI search with fuzzy matching and robust geocoding.
- **Mobile Menu**: Full-screen UI with a tabbed interface for route planning, recent destinations, vehicle selection, theme settings, and tools.
- **Mobile Compatibility & PWA**: Progressive Web App with offline support, iOS enhancements, automatic update detection, and offline features for cached routes, restrictions, and facilities.
- **Voice Commands for Incident Reporting**: Hands-free voice command system using Web Speech API for reporting traffic incidents during navigation, with dynamic language switching.
- **Unified Voice Navigation System**: A single consolidated voice system for all navigation announcements, offering modes like Motorway-Only, Junction & Lane Guidance Only, and Emergency Traffic Notifications. It defaults to a female voice preference in the user's language and supports 17 languages. All voice sources route through a single `NavigationVoice` singleton.
- **Multilingual Voice System**: All voice features dynamically use the user's selected language from i18n settings, supporting over 40 language codes.
- **Bluetooth/CarPlay/Android Auto Audio System**: Comprehensive audio initialization for vehicle connectivity, including silent audio warmup, AudioContext resumption, speech synthesis priming, automatic reinitialization on visibility changes, and volume control via device media buttons.
- **User Guide**: Comprehensive in-app documentation translated into 17 languages.
- **Customizable Alert Sounds**: Personalized audio alerts using Web Audio API for speed limits, traffic incidents, and fatigue/break reminders.
- **Haptic Feedback System**: Vibration API integration for tactile feedback.
- **3D Buildings Layer**: Interactive 3D building extrusions visible at zoom level 14+ when 3D mode is active.
- **Dynamic Route Suggestions**: Intelligent alternative route detection during navigation using TomTom Truck Routing API.
- **AR Navigation Overlay**: Camera-based augmented reality navigation view using device camera and DeviceOrientationEvent.
- **Customizable Dashboard Widgets**: Modular widget system for real-time navigation data.
- **Fleet Management System (Desktop-Only)**: An enterprise-grade system with 14 integrated tabs for advanced analytics, compliance tracking, and enterprise capabilities, including Vehicle Registry, Operator Management, Service Records, Fuel Consumption, Document Management, Cost Analytics, Incident Logging, Trip Tracking, Compliance & Regulatory Tracking, Real-Time Fleet Tracking, Geofencing, Driver Behavior Analytics, Hours of Service (HoS) Compliance, and Customer Billing Portal.
- **Fleet Shift Management System**: Features daily check-in/check-out, assignment history, split analytics (Driver Performance Score, Vehicle Health Score), and shift handover notes. Data tracking differentiates between vehicle-centric and driver-centric data.
- **Turn Indicator System**: Analyzes route path geometry for upcoming turns using true perpendicular projection, route progress tracking, GPS heading validation, cumulative distance precomputation, and a constrained search window. It detects turns based on angle changes and maps them to direction types (slight, regular, sharp).
- **Fleet Broadcast Messaging**: Allows fleet managers to send broadcast messages with priority levels (Critical, Important, Info) and categories (General, Safety, Traffic, Operations, Emergency). Features include priority sorting, read receipt tracking, optional message expiration, and broadcast history.
- **Mute All Alerts Button**: Provides a quick access button to mute all voice and audio alerts during navigation, with state persistence and integration with the `NavigationVoice` system.
- **Staggered Zoom System**: Enhances zoom controls during navigation with smooth, staggered animations, a zoom lock mechanism after user input, and protection layers to prevent unintended zoom resets.

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
- **Tile Sources**: Google Maps, OpenStreetMap, Esri satellite imagery (with multi-CDN optimization).

## Form and Data Validation
- **Zod**: Runtime type validation and schema definition.
- **React Hook Form**: Forms management.

## State Management
- **TanStack React Query**: Server state management.

## Traffic API Fallback
- **HERE Traffic API**: Provides traffic flow data as a fallback when TomTom Traffic Flow fails, utilizing an in-memory caching system for efficiency.
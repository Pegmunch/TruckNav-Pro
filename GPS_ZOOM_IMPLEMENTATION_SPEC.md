# GPS Auto-Zoom Implementation Specification

## Executive Summary
This document specifies the implementation for automatically zooming the map to the user's exact GPS location in street mode when the Start Navigation button is pressed, creating a professional "lock-on" effect.

---

## 1. Feature Requirements Analysis

### Current State
- GPS tracking starts **after** navigation becomes active (via `useEffect` when `isNavigating` changes)
- Map centers on user with `easeTo()` at zoom 16 during continuous tracking
- No immediate "lock on" to user position when Start Navigation is clicked
- Street/satellite mode toggle exists but not enforced during navigation start

### Desired State
- **Immediate GPS Lock**: Map zooms to user's exact position the moment navigation activates
- **Street Mode Enforcement**: Automatically switch to 'roads' view for optimal navigation
- **Dramatic Zoom Effect**: Use `flyTo()` for engaging "locking on" animation
- **Higher Initial Zoom**: Zoom 17-18 for close street-level view with slight 3D tilt

---

## 2. When to Trigger - Timing Analysis

### ✅ Recommended: After Navigation Activation Success

**Location:** `activateJourneyMutation.onSuccess` callback (navigation.tsx, line 408)

**Rationale:**
- Navigation state is confirmed active (journey activated in database)
- UI is already in navigation mode (sidebar collapsed, overlays closed)
- Prevents zoom if activation fails (better error handling)
- Clean separation: activation → success → zoom → GPS tracking

**Flow:**
```
User clicks "Start Navigation"
  ↓
handleStartNavigation() executes
  ↓
Journey activation mutation succeeds
  ↓
activateJourneyMutation.onSuccess() callback
  ↓
Call mapRef.current?.zoomToUserLocation() ← NEW
  ↓
GPS watchPosition starts (existing useEffect)
```

### ❌ Not Recommended Alternatives:
- **Before activation:** GPS might fail, but navigation still starts
- **In handleStartNavigation directly:** Couples GPS to navigation logic
- **In GPS useEffect:** Too late, continuous tracking already started

---

## 3. Map State Coordination

### GPS Acquisition Strategy

**Two-Phase Approach:**

#### Phase 1: One-Time GPS Lock (NEW)
```typescript
// In MapLibreMapRef.zoomToUserLocation()
navigator.geolocation.getCurrentPosition(
  (position) => {
    // Immediate zoom to precise location
    const { latitude, longitude, heading } = position.coords;
    
    map.flyTo({
      center: [longitude, latitude],
      zoom: 17.5,              // Close street view
      pitch: 45,               // 3D tilt for depth
      bearing: heading ?? 0,   // Align with user direction
      duration: 2000,          // 2 second dramatic fly
      essential: true          // Cannot be interrupted
    });
  },
  (error) => {
    // Fallback: Zoom to route start
  },
  {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0
  }
);
```

#### Phase 2: Continuous GPS Tracking (EXISTING)
- Existing `watchPosition` in navigation useEffect continues unchanged
- Updates position marker and keeps map centered at zoom 16
- Runs independently after initial lock completes

### Accessing Map Instance

**Already Available:**
```typescript
// navigation.tsx line 123
const mapRef = useRef<MapLibreMapRef>(null);

// In activateJourneyMutation.onSuccess:
mapRef.current?.zoomToUserLocation();
```

### GPS Permission Handling

**Scenarios:**

1. **Permission Granted:** Execute zoom immediately
2. **Permission Denied:** 
   - Show toast: "GPS access denied - centering on route start"
   - Fallback to route.startCoordinates
3. **Permission Prompt:** Wait for user decision (5s timeout)
4. **GPS Unavailable:** Graceful degradation to route centering

---

## 4. Zoom Level & Animation Parameters

### Optimal Settings for Truck Navigation

#### Initial "Lock On" Zoom (NEW)
```typescript
{
  zoom: 17.5,           // Sweet spot: street detail visible, not too close
  pitch: 45,            // 3D tilt shows road context and buildings
  bearing: heading ?? 0,// Align map north with user's direction
  duration: 2000,       // 2s dramatic fly feels responsive yet smooth
  essential: true       // Prevent interruption by user panning
}
```

**Zoom Level Analysis:**
- **17.5**: Shows street names, building details, lane markings
- **Higher than 18**: Too close, loses context (claustrophobic)
- **Lower than 17**: Not "locked on" enough (feels distant)
- **Current tracking zoom (16)**: Good for continuous tracking, too far for initial lock

#### Animation Method: `flyTo()` vs `easeTo()`

**✅ Use `flyTo()` for Initial Lock**
- **Dramatic arc trajectory** creates "locking onto target" feel
- **Zoom out → move → zoom in** pattern is visually engaging
- **2 second duration** feels purposeful (not jarring, not sluggish)
- **Essential flag** prevents user interference during critical lock

**✅ Keep `easeTo()` for Continuous Tracking**
- **Linear interpolation** is smooth for frequent updates
- **300ms duration** (existing) is perfect for GPS position changes
- **Non-essential** allows user to pan around while tracking

---

## 5. Implementation Architecture

### 5.1 New MapLibreMapRef Method

**Add to interface (maplibre-map.tsx, line 12):**

```typescript
export interface MapLibreMapRef {
  getMap: () => maplibregl.Map | null;
  getBearing: () => number;
  resetBearing: () => void;
  toggle3DMode: () => void;
  is3DMode: () => boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  toggleMapView: () => void;
  getMapViewMode: () => 'roads' | 'satellite';
  
  // NEW: Zoom to user's GPS location with street mode enforcement
  zoomToUserLocation: (options?: {
    forceStreetMode?: boolean;  // Default: true
    zoom?: number;              // Default: 17.5
    pitch?: number;             // Default: 45
    duration?: number;          // Default: 2000
    onSuccess?: (location: { lat: number; lng: number }) => void;
    onError?: (error: GeolocationPositionError) => void;
  }) => void;
}
```

### 5.2 Implementation in MapLibreMap Component

**Add to useImperativeHandle (maplibre-map.tsx, line 110):**

```typescript
useImperativeHandle(ref, () => ({
  // ... existing methods ...
  
  zoomToUserLocation: (options = {}) => {
    if (!map.current) {
      options.onError?.(new Error('Map not initialized') as any);
      return;
    }
    
    const {
      forceStreetMode = true,
      zoom = 17.5,
      pitch = 45,
      duration = 2000,
      onSuccess,
      onError
    } = options;
    
    // Force street mode if requested
    if (forceStreetMode && preferences.mapViewMode !== 'roads') {
      const newPrefs: MapPreferences = { ...preferences, mapViewMode: 'roads' };
      setPreferences(newPrefs);
      saveMapPreferences(newPrefs);
    }
    
    // Request one-time GPS position for precise lock
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, heading } = position.coords;
          
          // Dramatic flyTo animation for "lock on" effect
          map.current?.flyTo({
            center: [longitude, latitude],
            zoom,
            pitch,
            bearing: heading ?? 0,
            duration,
            essential: true  // Cannot be interrupted
          });
          
          // Notify success
          onSuccess?.({ lat: latitude, lng: longitude });
        },
        (error) => {
          console.error('GPS lock failed:', error);
          
          // Fallback: Don't zoom, let continuous tracking handle it
          // (watchPosition will activate once navigation starts)
          
          // Notify error
          onError?.(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0  // Force fresh GPS reading
        }
      );
    } else {
      const error = new Error('Geolocation not supported') as any;
      error.code = 0;
      onError?.(error);
    }
  }
}), [bearing, is3DMode, preferences]);
```

### 5.3 Integration in handleStartNavigation

**Modify activateJourneyMutation.onSuccess (navigation.tsx, line 408):**

```typescript
const activateJourneyMutation = useMutation({
  mutationFn: async ({ journeyId, idempotencyKey }: { journeyId: number; idempotencyKey: string }) => {
    const response = await apiRequest("PATCH", `/api/journeys/${journeyId}/activate`, {}, { idempotencyKey });
    return response.json();
  },
  onSuccess: (journey) => {
    setActiveJourney(journey);
    setIsNavigating(true);
    localStorage.setItem('activeJourneyId', journey.id.toString());
    queryClient.invalidateQueries({ queryKey: ["/api/journeys"] });
    refetchCurrentJourney();
    
    // NEW: Automatic GPS lock on navigation start
    mapRef.current?.zoomToUserLocation({
      forceStreetMode: true,
      zoom: 17.5,
      pitch: 45,
      duration: 2000,
      onSuccess: (location) => {
        toast({
          title: "📍 Position Locked",
          description: `Tracking from ${location.lat.toFixed(4)}°, ${location.lng.toFixed(4)}°`,
        });
      },
      onError: (error) => {
        // Graceful degradation: Show warning but continue navigation
        const message = error.code === 1 
          ? "GPS permission denied - enable location access for best experience"
          : "GPS unavailable - will center on route when signal acquired";
        
        toast({
          title: "Location Limited",
          description: message,
          variant: "destructive",
        });
        
        // Fallback: Center on route start if available
        if (currentRoute?.startCoordinates) {
          mapRef.current?.getMap()?.flyTo({
            center: [currentRoute.startCoordinates.lng, currentRoute.startCoordinates.lat],
            zoom: 15,
            duration: 1500
          });
        }
      }
    });
  },
  onError: (error) => {
    console.error('Failed to activate journey:', error);
    setIsNavigating(false);
    recoverUIOnError();
    toast({
      title: "Failed to start navigation",
      description: "Unable to activate journey. Please try again.",
      variant: "destructive",
    });
  },
});
```

---

## 6. Street Mode Enforcement

### Strategy: Automatic with User Override

**Default Behavior:**
- **Always switch to 'roads' mode** when navigation starts (forceStreetMode: true)
- User can manually toggle back to satellite if desired during navigation
- Preference is NOT persisted (next navigation starts in roads again)

**Rationale:**
- Street view shows road names, lane markings, turn restrictions
- Satellite view better for orientation, less useful for turn-by-turn
- Professional truck navigation apps (Sygic, CoPilot) enforce street mode
- Users who prefer satellite can easily toggle back

**Implementation:**
```typescript
// In zoomToUserLocation method
if (forceStreetMode && preferences.mapViewMode !== 'roads') {
  const newPrefs: MapPreferences = { ...preferences, mapViewMode: 'roads' };
  setPreferences(newPrefs);
  saveMapPreferences(newPrefs);
  // Layer visibility will update automatically via existing useEffect
}
```

---

## 7. Error Handling & Fallbacks

### Error Scenarios & Recovery

| Scenario | Detection | Fallback Behavior |
|----------|-----------|-------------------|
| **GPS Permission Denied** | `error.code === 1` | Center on route.startCoordinates, show permission prompt toast |
| **GPS Timeout (5s)** | `error.code === 3` | Let watchPosition handle it, show "acquiring signal" toast |
| **GPS Unavailable** | `error.code === 2` | Center on route start, continue navigation without GPS |
| **Map Not Initialized** | `!map.current` | Log error, skip zoom, continue navigation |
| **No Route Start Coords** | `!currentRoute?.startCoordinates` | Use map center (current view), no zoom change |

### User Communication

**Success Case:**
```
✅ Toast: "📍 Position Locked"
   "Tracking from 51.5074°, -0.1278°"
   Duration: 2s
```

**Permission Denied:**
```
⚠️ Toast: "Location Limited"
   "GPS permission denied - enable location access for best experience"
   Variant: destructive
   Duration: 5s
```

**GPS Unavailable:**
```
⚠️ Toast: "Location Limited"
   "GPS unavailable - will center on route when signal acquired"
   Variant: destructive
   Duration: 4s
```

---

## 8. Code Changes Summary

### Files to Modify

#### 1. `client/src/components/map/maplibre-map.tsx`

**Line 12-22: Update MapLibreMapRef interface**
- Add `zoomToUserLocation()` method signature

**Line 110-145: Update useImperativeHandle**
- Implement `zoomToUserLocation()` method
- GPS acquisition with getCurrentPosition
- flyTo animation with parameters
- Street mode enforcement
- Error handling with callbacks

#### 2. `client/src/pages/navigation.tsx`

**Line 408-428: Modify activateJourneyMutation.onSuccess**
- Add call to `mapRef.current?.zoomToUserLocation()`
- Include onSuccess callback for success toast
- Include onError callback with fallback logic
- Handle GPS permission denied case
- Fallback to route start coordinates

**Line 785-892: No changes to handleStartNavigation**
- Existing flow remains unchanged
- Zoom happens in mutation success callback

---

## 9. Testing Checklist

### Manual Testing Scenarios

- [ ] **Happy Path**: GPS enabled, permission granted
  - Map flies to user location at zoom 17.5
  - Switches to roads mode if in satellite
  - Shows "Position Locked" toast
  - Continuous tracking starts after lock

- [ ] **Permission Denied**: 
  - Shows "GPS permission denied" toast
  - Falls back to route start coordinates
  - Navigation continues without GPS lock

- [ ] **GPS Timeout**:
  - Shows "GPS unavailable" toast after 5s
  - Centers on route start
  - watchPosition continues attempting

- [ ] **Satellite Mode Active**:
  - Automatically switches to roads mode
  - Zoom animation executes
  - User can toggle back to satellite

- [ ] **No GPS Hardware**:
  - Detects geolocation unavailable
  - Shows error toast
  - Centers on route start

- [ ] **Map Not Ready**:
  - Handles null map gracefully
  - Logs error, skips zoom
  - Navigation continues

### Performance Validation

- [ ] GPS acquisition completes within 5s (high accuracy)
- [ ] flyTo animation is smooth at 60fps
- [ ] No map flicker during street mode switch
- [ ] Continuous tracking starts immediately after lock
- [ ] No race conditions between getCurrentPosition and watchPosition

---

## 10. Alternative Approaches Considered

### ❌ Option 1: Pre-fetch GPS before navigation
**Rejected:** Adds delay to "Start Navigation" button response

### ❌ Option 2: Use watchPosition for initial lock
**Rejected:** First position update can take 3-5 seconds

### ❌ Option 3: Zoom in handleStartNavigation directly
**Rejected:** Couples GPS logic to navigation logic, harder to test

### ❌ Option 4: Always use easeTo() for consistency
**Rejected:** Less engaging, doesn't convey "locking on" action

### ✅ Selected: getCurrentPosition + flyTo in mutation success
**Advantages:**
- Immediate GPS reading (faster than watchPosition)
- Dramatic flyTo conveys intentional action
- Clean separation of concerns
- Graceful error handling
- User sees navigation start, then "lock on"

---

## 11. Future Enhancements

### Phase 2 Improvements
1. **Smart Zoom Based on Speed**
   - Higher zoom when stationary (17.5)
   - Lower zoom when moving fast (16)

2. **Bearing Alignment**
   - Rotate map to match user's heading
   - "Forward-up" mode for easier orientation

3. **GPS Quality Indicator**
   - Show GPS accuracy on map (circle radius)
   - Warn if accuracy > 50m

4. **Offline GPS Support**
   - Cache last known position
   - Use as fallback when GPS unavailable

---

## 12. Implementation Priority

### Critical Path (MVP)
1. ✅ Add `zoomToUserLocation()` to MapLibreMapRef
2. ✅ Implement method in maplibre-map.tsx
3. ✅ Call from activateJourneyMutation.onSuccess
4. ✅ Add error handling and fallbacks
5. ✅ Test on real device with GPS

### Nice to Have
- GPS accuracy indicator
- Bearing alignment animation
- Speed-based zoom adjustment

---

## Appendix: Animation Parameters Reference

### flyTo() Parameters (Initial Lock)
```typescript
{
  center: [lng, lat],        // GPS coordinates
  zoom: 17.5,               // Close street view
  pitch: 45,                // 3D tilt (0-60 range)
  bearing: heading ?? 0,    // Map rotation (0-359)
  duration: 2000,           // 2 seconds
  essential: true,          // Cannot be interrupted
  easing: (t) => t         // Linear (default is easeInOut)
}
```

### easeTo() Parameters (Continuous Tracking - Existing)
```typescript
{
  center: [lng, lat],        // GPS coordinates  
  zoom: 16,                 // Wider view for context
  duration: 300,            // 300ms for smooth updates
  essential: false          // Can be interrupted
}
```

### Zoom Level Reference
- **15**: City block level
- **16**: Street level (current continuous tracking)
- **17**: Close street view
- **17.5**: Optimal truck navigation (NEW)
- **18**: Very close (lane-level detail)
- **19**: Too close (loses context)

---

## Summary

This specification provides a production-ready implementation for automatic GPS zoom on navigation start:

- **Timing**: After navigation activation succeeds
- **Method**: `zoomToUserLocation()` in MapLibreMapRef
- **Animation**: flyTo() at zoom 17.5 with 45° pitch
- **GPS**: getCurrentPosition for immediate lock
- **Fallback**: Route start coordinates if GPS fails
- **Street Mode**: Forced, user can override
- **Error Handling**: Comprehensive with user feedback

**Estimated Implementation Time:** 2-3 hours
**Testing Time:** 1-2 hours
**Risk Level:** Low (isolated changes, graceful fallbacks)

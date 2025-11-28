# TruckNav Pro - PWA Mobile UI Issue Log

## Current Version
- **Commit Hash**: 7ea6b1c (HEAD)
- **App Version**: 3.4.4
- **Date**: November 28, 2025

## Last Known Working Commits (for rollback reference)
- `a51ce59` - "Confirm all navigation features are working correctly on the PWA"
- `e58856f` - "Improve visibility of plan and preview mode navigation buttons"
- `0bca3dd` - "Add hamburger button to toggle route planning overlay"

## Current Issues in PWA Standalone Mode

### Issue 1: Mobile UI Not Rendering
**Symptom**: In iOS PWA standalone mode, only a bare map appears. No header, no hamburger button, no settings gear, no navigation controls.

**Root Cause**: The `isMobile` detection hook returns `false` in PWA standalone mode because iOS Safari reports full viewport width (~1024px), causing the app to render the desktop layout instead of mobile layout.

**Affected Code**: `client/src/hooks/use-mobile.tsx` - The `useIsMobile` hook needs to detect PWA standalone as mobile.

### Issue 2: Auto-Zoom Not Working
**Symptom**: Map doesn't auto-zoom to user location on page load. Console shows: `[AUTO-ZOOM] Waiting for map style to load...`

**Root Cause**: The `zoomToUserLocation` method in MapLibre has an internal style-ready check that blocks execution.

**Affected Code**: `client/src/components/map/maplibre-map.tsx`

### Issue 3: GPS Fallback
**Symptom**: When GPS permission is denied, the app should zoom to UK center (51.5074, -0.1278) as fallback, but this doesn't happen.

**Related to**: Issue 2 - auto-zoom blocking

## For Replit Support
The core issue is that the mobile detection fails in iOS PWA standalone mode, causing the entire mobile UI to not render. This is a hook-level issue, not individual component issues.

## Recommended Fix
1. Update `useIsMobile` hook to detect `navigator.standalone` or touch devices with width <= 1024px as mobile
2. Remove or bypass the style-loaded check in auto-zoom
3. Ensure fallback coordinates work when GPS is unavailable

## Test Environment
- Device: iPhone (iOS 18.7)
- Mode: PWA Standalone (added to home screen)
- GPS: Permission denied (requires fallback)

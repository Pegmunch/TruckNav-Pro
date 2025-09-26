# Google Street View API Configuration

To enable Street View functionality in the truck navigation app, you need to configure the Google Street View API key.

## Setup Instructions

1. **Get a Google Street View API Key:**
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the "Street View Static API" and "Maps JavaScript API"
   - Create credentials (API key)
   - Restrict the API key to your domain for security

2. **Configure the Environment Variable:**
   - Add the API key to your environment variables:
   ```bash
   VITE_GOOGLE_STREET_VIEW_API_KEY=your_api_key_here
   ```

3. **Restart the Application:**
   - After setting the environment variable, restart the development server

## Features Implemented

✅ **Street View Component** (`client/src/components/map/street-view.tsx`)
- Google Street View integration with professional styling
- Mobile-responsive controls with 44px minimum touch targets
- Accessibility features with proper ARIA labels
- Fallback messaging when Street View is not available
- Full-screen mode support

✅ **Map Integration** (`client/src/components/map/interactive-map.tsx`) 
- Street View toggle button in map controls
- Position synchronization between map and Street View
- Automatic dimming of map when Street View is active
- Seamless integration with existing satellite/roads view modes

✅ **Mobile & Accessibility Support**
- Touch-optimized controls for mobile devices
- Keyboard navigation support
- Screen reader friendly with proper ARIA labels
- Responsive design that works on all screen sizes

✅ **Error Handling**
- API key validation and error messaging
- Street View availability detection
- Graceful fallbacks when Street View is not available
- Loading states and user feedback

## Usage

1. Click the "Street" button in the map layer controls
2. The Street View will overlay the map showing the current map center location
3. Use the rotation and zoom controls to navigate the Street View
4. Click "Exit Street View" or the "Street" button again to return to map view
5. Use "Sync Location" to update Street View to current map center

## Testing

The implementation handles various edge cases:
- No API key configured (shows informative error message)
- Street View not available for location (shows fallback message with retry option)
- API loading failures (graceful error handling)
- Mobile touch interactions (optimized for touch devices)

## Cost Considerations

Street View API calls are charged per request. Consider implementing:
- Request throttling for frequent location changes
- Caching for recently viewed locations
- User confirmation before loading Street View in high-cost scenarios
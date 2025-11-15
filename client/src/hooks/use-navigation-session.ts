import { useQuery, useIsMutating } from '@tanstack/react-query';
import { useRef } from 'react';

export type NavigationState = 'idle' | 'starting' | 'active' | 'completing';

interface NavigationSession {
  state: NavigationState;
  journeyId: number | null;
  routeId: string | null;
  isNavigating: boolean; // Convenience flag for backwards compatibility
  canStart: boolean; // Can show Start Navigation button
  shouldShowHUD: boolean; // Should show navigation UI elements
}

/**
 * Single source of truth for navigation session state.
 * Derives all navigation state from the journey query to prevent race conditions.
 */
export function useNavigationSession(): NavigationSession {
  const lastKnownStateRef = useRef<NavigationState>('idle');
  
  // Query for active journey - ALWAYS fetch from server (PWA-compatible)
  const { data: currentJourney, isLoading } = useQuery<any>({
    queryKey: ['/api/journeys/active'],
    queryFn: async () => {
      console.log('[NAV-SESSION] Fetching active journey from server...');
      
      // ALWAYS fetch from server API (PWA contexts can't rely on localStorage)
      const response = await fetch('/api/journeys/active');
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('[NAV-SESSION] No active journey found on server');
          // Clear localStorage cache if API says no active journey
          localStorage.removeItem('activeJourneyId');
          return null;
        }
        // Other errors (500, etc.)
        console.warn(`[NAV-SESSION] API error: ${response.status}`);
        throw new Error(`Failed to fetch active journey: ${response.statusText}`);
      }
      
      const journey = await response.json();
      console.log(`[NAV-SESSION] ✅ Found ${journey.status} journey ${journey.id} from server`);
      
      // Sync localStorage as a cache for next page load
      if (journey.id) {
        localStorage.setItem('activeJourneyId', journey.id.toString());
      }
      
      return journey;
    },
    placeholderData: (previousData: any) => previousData, // Keep previous data during refetch
    refetchInterval: 2000,
    staleTime: 1000,
    retry: 1, // Only retry once to avoid hammering server
  });
  
  // Track journey mutation state to implement 'starting' and 'completing' states
  const isActivatingJourney = useIsMutating({ mutationKey: ['activateJourney'] }) > 0;
  const isCompletingJourney = useIsMutating({ mutationKey: ['completeJourney'] }) > 0;

  // Derive state from journey status and mutation state
  let state: NavigationState = 'idle';
  
  // CRITICAL: Check mutation state FIRST to implement 'starting' and 'completing'
  if (isCompletingJourney) {
    // Journey is being completed - show completing state
    state = 'completing';
  } else if (isActivatingJourney) {
    // Journey is being activated - show starting state
    state = 'starting';
  } else if (isLoading && !currentJourney) {
    // Initial load - use last known state
    state = lastKnownStateRef.current;
  } else if (!currentJourney) {
    // No journey exists
    state = 'idle';
  } else {
    // Derive state directly from journey status (no staleness check)
    if (currentJourney.status === 'active') {
      state = 'active';
    } else if (currentJourney.status === 'planned') {
      state = 'idle'; // Planned journeys show Start button
    } else if (currentJourney.status === 'completed') {
      state = 'idle';
    }
  }
  
  // Update last known state
  lastKnownStateRef.current = state;
  
  // Derive boolean flags for convenience
  const isNavigating = state === 'active' || state === 'starting';
  const canStart = state === 'idle';
  const shouldShowHUD = state === 'active' || state === 'starting';
  
  return {
    state,
    journeyId: currentJourney?.id ?? null,
    routeId: currentJourney?.routeId ?? null,
    isNavigating,
    canStart,
    shouldShowHUD,
  };
}

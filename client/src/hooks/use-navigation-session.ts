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
  
  // Query for active journey with keepPreviousData to prevent null flicker during refetch
  const { data: currentJourney, isLoading } = useQuery<any>({
    queryKey: ['/api/journeys/active'],
    queryFn: async () => {
      // Check localStorage for active journey ID
      const storedJourneyId = localStorage.getItem('activeJourneyId');
      if (!storedJourneyId) {
        return null;
      }
      
      // Fetch the journey
      const response = await fetch(`/api/journeys/${storedJourneyId}`);
      if (!response.ok) {
        // Any error (404, 500, etc.) means journey is not accessible - clear localStorage
        console.warn(`[NAV-SESSION] Journey ${storedJourneyId} fetch failed (${response.status}), clearing localStorage`);
        localStorage.removeItem('activeJourneyId');
        return null;
      }
      
      const journey = await response.json();
      
      // Only return active or planned journeys
      if (journey.status === 'active' || journey.status === 'planned') {
        return journey;
      }
      
      // Journey is completed/cancelled/invalid - clear localStorage
      console.log(`[NAV-SESSION] Journey ${storedJourneyId} has status ${journey.status}, clearing localStorage`);
      localStorage.removeItem('activeJourneyId');
      return null;
    },
    placeholderData: (previousData: any) => previousData, // Keep previous data during refetch
    refetchInterval: 2000,
    staleTime: 1000,
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
    // Check journey staleness using database timestamp
    const journeyStartTime = currentJourney.startedAt 
      ? new Date(currentJourney.startedAt).getTime()
      : 0;
    const ageInMinutes = journeyStartTime 
      ? (Date.now() - journeyStartTime) / (1000 * 60)
      : 0;
    const isStale = ageInMinutes > 30;
    
    if (isStale && currentJourney.status === 'active') {
      // Stale journey should be completed
      state = 'idle';
    } else if (currentJourney.status === 'active') {
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

import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { pauseCacheBusterDuringOnboarding } from '@/lib/cache-buster';

/**
 * Interface for legal consent data structure
 */
export interface LegalConsentData {
  hasAcceptedTerms: boolean;
  consentVersion: string;
  consentTimestamp: string;
  completedCheckboxes?: {
    navigation?: boolean;
    liability?: boolean;
    responsibility?: boolean;
    privacy?: boolean;
    terms?: boolean;
  };
}

/**
 * Interface for the consent hook return value
 */
export interface UseLegalConsentReturn {
  // State values
  hasAcceptedTerms: boolean;
  consentVersion: string | null;
  consentTimestamp: string | null;
  isLoading: boolean;
  completedCheckboxes: LegalConsentData['completedCheckboxes'];
  
  // Methods
  setConsentAccepted: (checkboxStates?: LegalConsentData['completedCheckboxes']) => Promise<void>;
  syncConsentToServer: () => Promise<void>;
  clearConsent: () => void;
  isConsentValid: (requiredVersion?: string) => boolean;
  
  // Utility methods
  getConsentAge: () => number | null;
  hasValidConsent: () => boolean;
}

/**
 * Default consent data structure
 */
const DEFAULT_CONSENT_DATA: LegalConsentData = {
  hasAcceptedTerms: false,
  consentVersion: '1.0',
  consentTimestamp: '',
  completedCheckboxes: {
    navigation: false,
    liability: false,
    responsibility: false,
    privacy: false,
    terms: false,
  },
};

/**
 * localStorage key for storing consent data
 */
const CONSENT_STORAGE_KEY = 'trucknav_legal_consent';

/**
 * Current legal version - increment when legal terms change
 */
const CURRENT_LEGAL_VERSION = '1.0';

/**
 * Maximum age of consent in days (optional feature for future use)
 */
const MAX_CONSENT_AGE_DAYS = 365;

/**
 * Centralized hook for managing legal consent state
 * 
 * Provides reactive state management for legal agreement completion,
 * persists consent state to localStorage with version tracking,
 * and includes error handling for corrupted data.
 * 
 * @returns {UseLegalConsentReturn} Hook interface with state and methods
 */
export function useLegalConsent(): UseLegalConsentReturn {
  const [consentData, setConsentData] = useState<LegalConsentData>(DEFAULT_CONSENT_DATA);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Safely parse consent data from localStorage with error handling
   */
  const parseStoredConsent = useCallback((): LegalConsentData | null => {
    try {
      const storedData = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (!storedData) {
        return null;
      }

      const parsed = JSON.parse(storedData);
      
      // Validate required fields
      if (typeof parsed !== 'object' || parsed === null) {
        console.warn('Invalid consent data structure in localStorage');
        return null;
      }

      // Ensure we have all required fields with proper types
      const validatedData: LegalConsentData = {
        hasAcceptedTerms: Boolean(parsed.hasAcceptedTerms),
        consentVersion: typeof parsed.consentVersion === 'string' ? parsed.consentVersion : CURRENT_LEGAL_VERSION,
        consentTimestamp: typeof parsed.consentTimestamp === 'string' ? parsed.consentTimestamp : '',
        completedCheckboxes: {
          navigation: Boolean(parsed.completedCheckboxes?.navigation),
          liability: Boolean(parsed.completedCheckboxes?.liability),
          responsibility: Boolean(parsed.completedCheckboxes?.responsibility),
          privacy: Boolean(parsed.completedCheckboxes?.privacy),
          terms: Boolean(parsed.completedCheckboxes?.terms),
        },
      };

      return validatedData;
    } catch (error) {
      console.error('Failed to parse consent data from localStorage:', error);
      // Clear corrupted data
      localStorage.removeItem(CONSENT_STORAGE_KEY);
      return null;
    }
  }, []);

  /**
   * Safely save consent data to localStorage
   */
  const saveConsentData = useCallback((data: LegalConsentData): void => {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(data));
      // Also set the flag that cache buster checks
      if (data.hasAcceptedTerms) {
        localStorage.setItem('trucknav_legal_accepted', 'true');
      }
    } catch (error) {
      console.error('Failed to save consent data to localStorage:', error);
    }
  }, []);

  /**
   * Load consent data on hook initialization
   * CRITICAL: Must reliably read consent in PWA standalone mode
   */
  useEffect(() => {
    const storedConsent = parseStoredConsent();
    
    // Also check the simple flag as a backup
    const simpleFlag = localStorage.getItem('trucknav_legal_accepted');
    
    console.log('[LEGAL-CONSENT] Loading consent on mount:', {
      hasStoredConsent: !!storedConsent,
      storedConsentAccepted: storedConsent?.hasAcceptedTerms,
      simpleFlagExists: !!simpleFlag,
      simpleFlagValue: simpleFlag
    });
    
    if (storedConsent && storedConsent.hasAcceptedTerms) {
      console.log('[LEGAL-CONSENT] ✓ Valid consent found in localStorage');
      setConsentData(storedConsent);
    } else if (simpleFlag === 'true') {
      // Fallback: If main consent is missing but simple flag exists, reconstruct
      console.log('[LEGAL-CONSENT] ⚠️ Reconstructing consent from simple flag');
      const reconstructedConsent: LegalConsentData = {
        hasAcceptedTerms: true,
        consentVersion: CURRENT_LEGAL_VERSION,
        consentTimestamp: new Date().toISOString(),
        completedCheckboxes: {
          navigation: true,
          liability: true,
          responsibility: true,
          privacy: true,
          terms: true,
        },
      };
      setConsentData(reconstructedConsent);
      // Re-save the full consent data
      saveConsentData(reconstructedConsent);
    } else {
      // No consent found
      console.log('[LEGAL-CONSENT] ✗ No valid consent found');
      setConsentData(DEFAULT_CONSENT_DATA);
    }
    
    setIsLoading(false);
  }, [parseStoredConsent, saveConsentData]);

  /**
   * Mark consent as accepted with optional checkbox states
   * Also records consent server-side for authenticated users
   * CRITICAL: Must persist reliably in PWA standalone mode
   */
  const setConsentAccepted = useCallback(async (checkboxStates?: LegalConsentData['completedCheckboxes']): Promise<void> => {
    // CRITICAL: Pause cache-buster during acceptance to prevent localStorage wipe
    pauseCacheBusterDuringOnboarding(true);
    
    try {
      const newConsentData: LegalConsentData = {
        hasAcceptedTerms: true,
        consentVersion: CURRENT_LEGAL_VERSION,
        consentTimestamp: new Date().toISOString(),
        completedCheckboxes: checkboxStates || {
          navigation: true,
          liability: true,
          responsibility: true,
          privacy: true,
          terms: true,
        },
      };

      console.log('[LEGAL-CONSENT] Saving consent acceptance...');
      
      // Update React state first
      setConsentData(newConsentData);
      
      // Save to localStorage with multiple writes to ensure persistence
      saveConsentData(newConsentData);
      
      // Triple-write the simple flag for extra reliability in PWA mode
      try {
        // Write 1: Main consent data
        localStorage.setItem('trucknav_legal_consent', JSON.stringify(newConsentData));
        
        // Write 2: Simple flag
        localStorage.setItem('trucknav_legal_accepted', 'true');
        
        // Write 3: Backup flag
        localStorage.setItem('trucknav_terms_accepted', 'true');
        
        console.log('[LEGAL-CONSENT] ✓ Consent saved to localStorage (3 writes)');
        
        // Verify all writes were successful
        const verify1 = localStorage.getItem('trucknav_legal_accepted');
        const verify2 = localStorage.getItem('trucknav_legal_consent');
        const verify3 = localStorage.getItem('trucknav_terms_accepted');
        console.log('[LEGAL-CONSENT] Verification reads:', {
          flag1: verify1,
          flag2: verify3,
          hasData: !!verify2
        });
        
        if (!verify1 || !verify2 || !verify3) {
          throw new Error('localStorage writes failed - not all keys were persisted');
        }
      } catch (error) {
        console.error('[LEGAL-CONSENT] ✗ Failed to save consent:', error);
        throw error;
      }

      // Also save to backend (works for both authenticated and unauthenticated users)
      try {
        await apiRequest('POST', '/api/users/accept-terms', {});
        console.log('[LEGAL-CONSENT] ✓ Consent recorded on server');
      } catch (error) {
        // Network errors are logged but don't block the flow
        console.error('[LEGAL-CONSENT] Failed to record consent on server (non-blocking):', error);
      }
      
      // CRITICAL: Force page reload to ensure all components re-initialize with new consent
      // This prevents React state sync issues in PWA mode
      console.log('[LEGAL-CONSENT] ✓ Reloading page to persist consent...');
      setTimeout(() => {
        window.location.reload();
      }, 500);
      
    } catch (error) {
      console.error('[LEGAL-CONSENT] ✗ Fatal error during consent acceptance:', error);
      // Re-enable cache-buster on error
      pauseCacheBusterDuringOnboarding(false);
      throw error;
    }
  }, [saveConsentData]);

  /**
   * Sync localStorage consent to server after login
   * Should be called when user becomes authenticated
   */
  const syncConsentToServer = useCallback(async (): Promise<void> => {
    // Read consent directly from localStorage to avoid stale closure
    const storedConsent = parseStoredConsent();
    
    if (!storedConsent || !storedConsent.hasAcceptedTerms) {
      console.log('No consent to sync - user has not accepted terms yet');
      return;
    }

    try {
      const response = await apiRequest('POST', '/api/users/sync-consent', {});
      console.log('Consent synced to server:', response);
    } catch (error) {
      console.error('Failed to sync consent to server:', error);
      throw error;
    }
  }, [parseStoredConsent]);

  /**
   * Clear all consent state
   */
  const clearConsent = useCallback((): void => {
    const clearedData = { ...DEFAULT_CONSENT_DATA };
    setConsentData(clearedData);
    
    try {
      localStorage.removeItem(CONSENT_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear consent data from localStorage:', error);
    }
  }, []);

  /**
   * Check if current consent is valid for a specific version
   */
  const isConsentValid = useCallback((requiredVersion?: string): boolean => {
    if (!consentData.hasAcceptedTerms || !consentData.consentTimestamp) {
      return false;
    }

    // Check version compatibility
    const targetVersion = requiredVersion || CURRENT_LEGAL_VERSION;
    if (consentData.consentVersion !== targetVersion) {
      return false;
    }

    // Check if all required checkboxes were completed
    const checkboxes = consentData.completedCheckboxes;
    if (!checkboxes) {
      return false;
    }

    const requiredCheckboxes = ['navigation', 'liability', 'responsibility', 'privacy', 'terms'] as const;
    return requiredCheckboxes.every(checkbox => checkboxes[checkbox] === true);
  }, [consentData]);

  /**
   * Get the age of consent in days
   */
  const getConsentAge = useCallback((): number | null => {
    if (!consentData.consentTimestamp) {
      return null;
    }

    try {
      const consentDate = new Date(consentData.consentTimestamp);
      const now = new Date();
      const ageInMs = now.getTime() - consentDate.getTime();
      return Math.floor(ageInMs / (1000 * 60 * 60 * 24));
    } catch (error) {
      console.error('Failed to calculate consent age:', error);
      return null;
    }
  }, [consentData.consentTimestamp]);

  /**
   * Check if consent is valid and not expired
   */
  const hasValidConsent = useCallback((): boolean => {
    if (!isConsentValid()) {
      return false;
    }

    const age = getConsentAge();
    if (age === null) {
      return false;
    }

    // Optional: Check if consent is within valid age limit
    return age <= MAX_CONSENT_AGE_DAYS;
  }, [isConsentValid, getConsentAge]);

  return {
    // State values
    hasAcceptedTerms: consentData.hasAcceptedTerms,
    consentVersion: consentData.consentVersion || null,
    consentTimestamp: consentData.consentTimestamp || null,
    isLoading,
    completedCheckboxes: consentData.completedCheckboxes,
    
    // Methods
    setConsentAccepted,
    syncConsentToServer,
    clearConsent,
    isConsentValid,
    
    // Utility methods
    getConsentAge,
    hasValidConsent,
  };
}

/**
 * Utility function to check if consent exists without using the hook
 * Useful for conditional rendering or routing logic
 */
export function checkStoredConsent(): boolean {
  try {
    const storedData = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!storedData) {
      return false;
    }

    const parsed = JSON.parse(storedData);
    return Boolean(
      parsed.hasAcceptedTerms && 
      parsed.consentTimestamp && 
      parsed.consentVersion === CURRENT_LEGAL_VERSION
    );
  } catch {
    return false;
  }
}

/**
 * Utility function to migrate from old consent format if needed
 * This helps with backwards compatibility during transition
 */
export function migrateOldConsentData(): void {
  try {
    // Check for old format
    const oldConsentData = localStorage.getItem('trucknav_disclaimer_accepted');
    if (oldConsentData && !localStorage.getItem(CONSENT_STORAGE_KEY)) {
      const oldParsed = JSON.parse(oldConsentData);
      
      if (oldParsed.accepted && oldParsed.timestamp) {
        const migratedData: LegalConsentData = {
          hasAcceptedTerms: true,
          consentVersion: oldParsed.version || '1.0',
          consentTimestamp: oldParsed.timestamp,
          completedCheckboxes: {
            navigation: true,
            liability: true,
            responsibility: true,
            privacy: true,
            terms: true,
          },
        };
        
        localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(migratedData));
        console.log('Migrated old consent data to new format');
      }
    }
  } catch (error) {
    console.error('Failed to migrate old consent data:', error);
  }
}
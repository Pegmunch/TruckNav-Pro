import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Robust CSRF token management with expiration tracking and race condition prevention
interface CSRFTokenInfo {
  token: string;
  timestamp: number;
  maxAge: number; // in milliseconds
}

// Enhanced session management for cookie-resistant environments
interface SessionInfo {
  sessionId: string;
  timestamp: number;
  source: 'cookie' | 'header' | 'storage' | 'new';
  cookieWorking: boolean;
  fallbackActive: boolean;
}

let csrfTokenInfo: CSRFTokenInfo | null = null;
let tokenFetchPromise: Promise<string | null> | null = null;
let currentSession: SessionInfo | null = null;
const TOKEN_REFRESH_THRESHOLD = 30000; // Refresh if token expires within 30 seconds
const DEFAULT_TOKEN_MAX_AGE = 600000; // 10 minutes default (aligned with server expiry)
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS = [1000, 2000, 5000]; // Progressive delay in ms
const SESSION_STORAGE_KEY = 'trucknav_session_id';
const SESSION_COOKIE_STATUS_KEY = 'trucknav_cookie_status';

// Enhanced token and session extraction with comprehensive persistence
function extractCSRFToken(res: Response) {
  const token = res.headers.get('X-CSRF-Token');
  if (!token) return;
  
  // Parse max-age from Cache-Control or use default
  const cacheControl = res.headers.get('Cache-Control');
  let maxAge = DEFAULT_TOKEN_MAX_AGE;
  
  if (cacheControl) {
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
    if (maxAgeMatch) {
      maxAge = parseInt(maxAgeMatch[1]) * 1000; // Convert seconds to milliseconds
    }
  }
  
  const newTokenInfo = {
    token,
    timestamp: Date.now(),
    maxAge
  };
  
  if (!csrfTokenInfo || csrfTokenInfo.token !== token) {
    csrfTokenInfo = newTokenInfo;
  }
}

// Extract and persist session information from server responses
function extractAndPersistSession(res: Response) {
  const sessionId = res.headers.get('X-Session-ID');
  const cookieStatus = res.headers.get('X-Session-Cookie-Status');
  const sessionSource = res.headers.get('X-Session-Source');
  
  if (sessionId) {
    const sessionInfo: SessionInfo = {
      sessionId,
      timestamp: Date.now(),
      source: (sessionSource as any) || 'header',
      cookieWorking: cookieStatus === 'received',
      fallbackActive: cookieStatus !== 'received'
    };
    
    // Update current session
    currentSession = sessionInfo;
    
    // Persist session in multiple storage locations for maximum resilience
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
      localStorage.setItem(SESSION_COOKIE_STATUS_KEY, JSON.stringify({
        cookieWorking: sessionInfo.cookieWorking,
        timestamp: sessionInfo.timestamp,
        fallbackActive: sessionInfo.fallbackActive
      }));
      
      // Also store in sessionStorage as backup
      sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
      sessionStorage.setItem('trucknav_session_backup', JSON.stringify(sessionInfo));
      
      console.log(`[SESSION-CLIENT] Persisted session ${sessionId.substring(0, 8)}... (Cookie working: ${sessionInfo.cookieWorking}, Fallback: ${sessionInfo.fallbackActive})`);
    } catch (error) {
      console.warn('[SESSION-CLIENT] Failed to persist session to storage:', error);
    }
  }
}

// Get the best available session ID from multiple sources
function getBestSessionId(): string | null {
  // Priority: current session > localStorage > sessionStorage > cookie
  if (currentSession && isSessionValid(currentSession)) {
    return currentSession.sessionId;
  }
  
  try {
    // Try localStorage first
    const storedSessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    if (storedSessionId) {
      console.log(`[SESSION-CLIENT] Using stored session from localStorage: ${storedSessionId.substring(0, 8)}...`);
      return storedSessionId;
    }
    
    // Try sessionStorage as backup
    const sessionStorageId = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (sessionStorageId) {
      console.log(`[SESSION-CLIENT] Using session from sessionStorage: ${sessionStorageId.substring(0, 8)}...`);
      return sessionStorageId;
    }
    
    // Try extracting from document.cookie as last resort
    const cookieMatch = document.cookie.match(/trucknav_session=([^;]+)/);
    if (cookieMatch) {
      const cookieSessionId = decodeURIComponent(cookieMatch[1]).replace(/^s:/, '').split('.')[0];
      console.log(`[SESSION-CLIENT] Extracted session from cookie: ${cookieSessionId.substring(0, 8)}...`);
      return cookieSessionId;
    }
  } catch (error) {
    console.warn('[SESSION-CLIENT] Error accessing session storage:', error);
  }
  
  return null;
}

// Check if session is still valid (not too old)
function isSessionValid(session: SessionInfo): boolean {
  const SESSION_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
  return Date.now() - session.timestamp < SESSION_MAX_AGE;
}

// Get cookie working status from storage
function getCookieStatus(): { cookieWorking: boolean; fallbackActive: boolean } {
  try {
    const statusStr = localStorage.getItem(SESSION_COOKIE_STATUS_KEY);
    if (statusStr) {
      const status = JSON.parse(statusStr);
      return {
        cookieWorking: status.cookieWorking || false,
        fallbackActive: status.fallbackActive || true
      };
    }
  } catch (error) {
    console.warn('[SESSION-CLIENT] Error reading cookie status:', error);
  }
  
  return { cookieWorking: false, fallbackActive: true };
}

// Check if token is valid and not near expiration
function isTokenValid(): boolean {
  if (!csrfTokenInfo) return false;
  
  const now = Date.now();
  const age = now - csrfTokenInfo.timestamp;
  const timeUntilExpiry = csrfTokenInfo.maxAge - age;
  
  return timeUntilExpiry > TOKEN_REFRESH_THRESHOLD;
}

// Get current valid CSRF token
function getCSRFToken(): string | null {
  return isTokenValid() ? csrfTokenInfo?.token || null : null;
}

// Clear CSRF token and reset fetch promise
function clearCSRFToken() {
  csrfTokenInfo = null;
  tokenFetchPromise = null;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Robust CSRF token fetching with race condition prevention and retry logic
async function fetchCSRFToken(): Promise<string | null> {
  // Prevent concurrent token fetches
  if (tokenFetchPromise) {
    return await tokenFetchPromise;
  }
  
  tokenFetchPromise = performTokenFetch();
  
  try {
    const result = await tokenFetchPromise;
    return result;
  } finally {
    tokenFetchPromise = null;
  }
}

// Perform actual token fetch with comprehensive retry logic
async function performTokenFetch(): Promise<string | null> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      // Build headers with session persistence for token requests
      const tokenHeaders: Record<string, string> = {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      };
      
      // Add session persistence headers
      const bestSessionId = getBestSessionId();
      if (bestSessionId) {
        tokenHeaders['X-Session-ID'] = bestSessionId;
        tokenHeaders['X-Storage-Session'] = bestSessionId;
        console.log(`[CSRF] Using stored session for token request: ${bestSessionId.substring(0, 8)}...`);
      }
      
      const tokenResponse = await fetch('/api/csrf-token', {
        credentials: 'include',
        cache: 'no-cache',
        signal: controller.signal,
        headers: tokenHeaders
      });
      
      clearTimeout(timeoutId);
      
      if (tokenResponse.ok) {
        extractCSRFToken(tokenResponse);
        
        // Enhanced session monitoring and extraction
        extractAndPersistSession(tokenResponse);
        
        try {
          const responseData = await tokenResponse.json();
          console.log(`[CSRF] Token response from session: ${responseData.sessionId?.substring(0, 8)}..., cookieReceived: ${responseData.cookieReceived}`);
        } catch (e) {
          console.warn('[CSRF] Failed to parse token response for monitoring');
        }
        
        const token = getCSRFToken();
        if (token) {
          console.log(`[CSRF] Successfully fetched token: ${token.substring(0, 8)}...`);
          return token;
        } else {
          throw new Error('Token extracted but not valid');
        }
      } else if (tokenResponse.status === 429) {
        // Rate limited - handle Retry-After properly
        const retryAfter = tokenResponse.headers.get('Retry-After');
        let delay = RETRY_DELAYS[attempt] * 2;
        
        if (retryAfter) {
          const parsedSeconds = parseInt(retryAfter);
          if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
            // Retry-After in seconds
            delay = Math.min(parsedSeconds * 1000, 60000); // Cap at 60s
          } else {
            // Could be HTTP-date, fall back to exponential backoff
            const retryDate = new Date(retryAfter);
            if (retryDate.getTime() > Date.now()) {
              delay = Math.min(retryDate.getTime() - Date.now(), 60000);
            }
          }
        }
        
        // Add jitter to prevent thundering herd
        delay += Math.random() * 500;
        console.warn(`[CSRF] Rate limited, waiting ${Math.round(delay)}ms before retry`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      } else {
        throw new Error(`HTTP ${tokenResponse.status}: ${tokenResponse.statusText}`);
      }
    } catch (error) {
      lastError = error as Error;
      console.warn(`[CSRF] Token fetch attempt ${attempt + 1} failed:`, error);
      
      if (attempt < MAX_RETRY_ATTEMPTS - 1) {
        let delay = RETRY_DELAYS[attempt] || 5000;
        
        // Handle network errors with longer delays
        if (error instanceof TypeError && error.message.includes('fetch')) {
          delay = Math.min(delay * 2, 30000); // Double delay for network errors, cap at 30s
        }
        
        // Add jitter
        delay += Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error('[CSRF] All token fetch attempts failed:', lastError);
  return null;
}

// Ensure we have a valid token, fetching if necessary
async function ensureValidToken(): Promise<string | null> {
  if (isTokenValid()) {
    return getCSRFToken();
  }
  
  return await fetchCSRFToken();
}

// Export for use in initialization
export { fetchCSRFToken as initializeCSRFToken };

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: { idempotencyKey?: string; skipCSRF?: boolean; timeout?: number }
): Promise<Response> {
  const isStatefulRequest = method !== 'GET' && method !== 'OPTIONS' && method !== 'HEAD';
  const requestTimeout = options?.timeout || 30000; // 30s default timeout
  
  // Ensure we have a valid token for state-changing requests
  if (isStatefulRequest && !options?.skipCSRF) {
    const token = await ensureValidToken();
    if (!token) {
      throw new Error('Failed to obtain valid CSRF token after multiple attempts');
    }
  }

  return await performRequestWithRetry(method, url, data, options, requestTimeout, 0);
}

// Perform request with comprehensive retry logic
async function performRequestWithRetry(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: { idempotencyKey?: string; skipCSRF?: boolean; timeout?: number },
  timeout: number = 30000,
  retryCount: number = 0
): Promise<Response> {
  const isStatefulRequest = method !== 'GET' && method !== 'OPTIONS' && method !== 'HEAD';
  const maxRetries = isStatefulRequest ? 2 : 3; // More conservative for mutations
  
  // Build headers with current token and session information
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  };
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Add session persistence headers for maximum compatibility
  const bestSessionId = getBestSessionId();
  if (bestSessionId) {
    headers['X-Session-ID'] = bestSessionId;
    headers['X-Storage-Session'] = bestSessionId;
    console.log(`[SESSION-CLIENT] Adding session headers: ${bestSessionId.substring(0, 8)}...`);
  }
  
  // Add cookie status information
  const cookieStatus = getCookieStatus();
  headers['X-Client-Cookie-Status'] = cookieStatus.cookieWorking ? 'working' : 'failed';
  headers['X-Client-Fallback-Active'] = cookieStatus.fallbackActive ? 'true' : 'false';
  
  // Add CSRF token for stateful requests
  if (isStatefulRequest && !options?.skipCSRF) {
    const currentToken = getCSRFToken();
    if (currentToken) {
      headers["X-CSRF-Token"] = currentToken;
    } else {
      console.warn('[CSRF] No valid token available for stateful request!');
    }
    
    // Add idempotency key if provided
    if (options?.idempotencyKey) {
      headers["Idempotency-Key"] = options.idempotencyKey;
    }
  }

  // Setup request with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
    console.warn(`[API] Request timeout after ${timeout}ms: ${method} ${url}`);
  }, timeout);

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    
    // Always extract CSRF token and session information from response
    extractCSRFToken(res);
    extractAndPersistSession(res);

    // Handle specific error cases with retry logic
    if (!res.ok) {
      return await handleErrorResponse(res, method, url, data, options, timeout, retryCount, maxRetries);
    }

    return res;
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`[API] Request aborted: ${method} ${url}`);
      
      if (retryCount < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
        return await performRequestWithRetry(method, url, data, options, timeout, retryCount + 1);
      }
    }
    
    throw error;
  }
}

// Handle error responses with intelligent retry strategies
async function handleErrorResponse(
  res: Response,
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: { idempotencyKey?: string; skipCSRF?: boolean; timeout?: number },
  timeout: number = 30000,
  retryCount: number = 0,
  maxRetries: number = 2
): Promise<Response> {
  const isStatefulRequest = method !== 'GET' && method !== 'OPTIONS' && method !== 'HEAD';
  
  // Handle CSRF token issues (403, 419)
  if ((res.status === 403 || res.status === 419) && isStatefulRequest && !options?.skipCSRF) {
    
    if (retryCount < maxRetries) {
      try {
        // Clear current token and fetch fresh one
        clearCSRFToken();
        const newToken = await fetchCSRFToken();
        
        if (newToken) {
          return await performRequestWithRetry(method, url, data, options, timeout, retryCount + 1);
        } else {
          console.error('[CSRF] Failed to obtain fresh token for retry');
        }
      } catch (tokenError) {
        console.error('[CSRF] Token refresh failed:', tokenError);
      }
    } else {
      console.error(`[CSRF] Max retries reached for ${res.status} error`);
    }
  }
  
  // Handle rate limiting (429)
  if (res.status === 429 && retryCount < maxRetries) {
    const retryAfter = res.headers.get('Retry-After');
    let delay = Math.min(2000 * Math.pow(2, retryCount), 30000);
    
    if (retryAfter) {
      const parsedSeconds = parseInt(retryAfter);
      if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
        delay = Math.min(parsedSeconds * 1000, 60000);
      } else {
        // Could be HTTP-date
        const retryDate = new Date(retryAfter);
        if (retryDate.getTime() > Date.now()) {
          delay = Math.min(retryDate.getTime() - Date.now(), 60000);
        }
      }
    }
    
    // Add jitter
    delay += Math.random() * 500;
    await new Promise(resolve => setTimeout(resolve, delay));
    return await performRequestWithRetry(method, url, data, options, timeout, retryCount + 1);
  }
  
  // Handle server errors (5xx) with exponential backoff
  if (res.status >= 500 && res.status < 600 && retryCount < maxRetries) {
    const delay = Math.min(1000 * Math.pow(2, retryCount), 15000);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return await performRequestWithRetry(method, url, data, options, timeout, retryCount + 1);
  }
  
  // For all other errors, throw immediately
  await throwIfResNotOk(res);
  return res; // This line should never be reached
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Build headers with session persistence for GET requests
    const queryHeaders: Record<string, string> = {};
    
    // Add session persistence headers
    const bestSessionId = getBestSessionId();
    if (bestSessionId) {
      queryHeaders['X-Session-ID'] = bestSessionId;
      queryHeaders['X-Storage-Session'] = bestSessionId;
    }
    
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers: queryHeaders
    });

    // Extract CSRF token and session information from response headers (for GET requests)
    extractCSRFToken(res);
    extractAndPersistSession(res);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      // Optimized for mobile performance
      staleTime: 5 * 60 * 1000, // 5 minutes - balance between freshness and performance
      gcTime: 10 * 60 * 1000, // 10 minutes - prevent memory leaks on mobile
      retry: (failureCount, error) => {
        // Smart retry strategy for mobile networks
        if (failureCount >= 3) return false;
        if (error instanceof Error && error.message.includes('fetch')) {
          // Network errors - retry with exponential backoff
          return true;
        }
        return false;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff capped at 30s
      // Reduce network usage on mobile
      networkMode: 'online',
      // Prevent excessive background refetching on mobile
      refetchOnMount: false,
      refetchOnReconnect: true,
      refetchIntervalInBackground: false,
    },
    mutations: {
      retry: (failureCount, error) => {
        // Conservative retry for mutations with improved error detection
        if (failureCount >= 2) return false;
        if (error instanceof Error) {
          const msg = error.message.toLowerCase();
          // Retry on network errors, timeout, and connection issues
          return msg.includes('network') || msg.includes('fetch') || 
                 msg.includes('timeout') || msg.includes('connection') ||
                 error.name === 'AbortError' || error instanceof TypeError;
        }
        return false;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      // Ensure mutations work offline when possible
      networkMode: 'online',
    },
  },
});

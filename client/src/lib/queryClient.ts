import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Store CSRF token in memory only (no persistence to avoid session mismatches)
let csrfToken: string | null = null;

// Function to extract CSRF token from response headers
function extractCSRFToken(res: Response) {
  const token = res.headers.get('X-CSRF-Token');
  if (token && token !== csrfToken) {
    csrfToken = token;
    console.log('[CSRF] Token updated successfully');
  }
}

// Function to get current CSRF token
function getCSRFToken(): string | null {
  return csrfToken;
}

// Function to clear CSRF token
function clearCSRFToken() {
  csrfToken = null;
  console.log('[CSRF] Token cleared');
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Function to fetch fresh CSRF token
async function fetchCSRFToken(): Promise<string | null> {
  try {
    const tokenResponse = await fetch('/api/csrf-token', {
      credentials: 'include',
      cache: 'no-cache'
    });
    if (tokenResponse.ok) {
      extractCSRFToken(tokenResponse);
      const token = getCSRFToken();
      console.log('[CSRF] Fresh token fetched successfully');
      return token;
    } else {
      console.warn('[CSRF] Failed to fetch token, response not ok:', tokenResponse.status);
      return null;
    }
  } catch (error) {
    console.warn('[CSRF] Failed to fetch CSRF token:', error);
    return null;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: { idempotencyKey?: string }
): Promise<Response> {
  // Always fetch fresh CSRF token for state-changing requests
  if (method !== 'GET' && method !== 'OPTIONS') {
    await fetchCSRFToken();
  }

  // Build headers
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Include CSRF token and idempotency key for state-changing requests
  const currentToken = getCSRFToken();
  if (method !== 'GET' && method !== 'OPTIONS' && currentToken) {
    headers["X-CSRF-Token"] = currentToken; // Correct capitalization
    
    // Add idempotency key if provided
    if (options?.idempotencyKey) {
      headers["Idempotency-Key"] = options.idempotencyKey;
    }
  } else if (method !== 'GET' && method !== 'OPTIONS') {
    console.warn('[CSRF] No token available for state-changing request!');
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Extract CSRF token from response headers
  extractCSRFToken(res);

  // Handle CSRF token issues with retry
  if (res.status === 403 && method !== 'GET' && method !== 'OPTIONS') {
    console.log('[CSRF] Got 403, attempting retry with fresh token');
    try {
      // Clear current token and fetch fresh one
      clearCSRFToken();
      const newToken = await fetchCSRFToken();
      
      if (newToken) {
        // Rebuild headers with fresh token
        const retryHeaders: Record<string, string> = {};
        if (data) {
          retryHeaders["Content-Type"] = "application/json";
        }
        retryHeaders["X-CSRF-Token"] = newToken;
        if (options?.idempotencyKey) {
          retryHeaders["Idempotency-Key"] = options.idempotencyKey;
        }
        
        const retryRes = await fetch(url, {
          method,
          headers: retryHeaders,
          body: data ? JSON.stringify(data) : undefined,
          credentials: "include",
        });
        
        extractCSRFToken(retryRes);
        console.log('[CSRF] Retry completed with status:', retryRes.status);
        await throwIfResNotOk(retryRes);
        return retryRes;
      }
    } catch (retryError) {
      console.warn('[CSRF] Failed to retry with fresh token:', retryError);
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    // Extract CSRF token from response headers (for GET requests)
    extractCSRFToken(res);

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
        // Conservative retry for mutations on mobile
        if (failureCount >= 2) return false;
        if (error instanceof Error && error.message.includes('network')) {
          return true;
        }
        return false;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      // Ensure mutations work offline when possible
      networkMode: 'online',
    },
  },
});

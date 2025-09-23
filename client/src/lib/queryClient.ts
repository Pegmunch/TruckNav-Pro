import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Store CSRF token with persistence fallback
let csrfToken: string | null = null;

// Function to extract and persist CSRF token from response headers
function extractCSRFToken(res: Response) {
  const token = res.headers.get('X-CSRF-Token');
  if (token) {
    csrfToken = token;
    // Store in sessionStorage as backup
    try {
      sessionStorage.setItem('csrfToken', token);
    } catch (e) {
      // Ignore storage errors
    }
  }
}

// Function to get CSRF token from memory or fallback storage
function getCSRFToken(): string | null {
  if (csrfToken) return csrfToken;
  
  // Fallback to sessionStorage
  try {
    const stored = sessionStorage.getItem('csrfToken');
    if (stored) {
      csrfToken = stored;
      return stored;
    }
  } catch (e) {
    // Ignore storage errors
  }
  
  return null;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Always try to get fresh CSRF token for state-changing requests
  if (method !== 'GET' && method !== 'OPTIONS') {
    let token = getCSRFToken();
    
    // If no token or token might be stale, fetch fresh one
    if (!token) {
      try {
        const tokenResponse = await fetch('/api/csrf-token', {
          credentials: 'include',
          cache: 'no-cache'  // Ensure fresh token
        });
        if (tokenResponse.ok) {
          extractCSRFToken(tokenResponse);
          token = getCSRFToken();
        } else {
          console.warn('[CSRF] Failed to fetch token, response not ok:', tokenResponse.status);
        }
      } catch (error) {
        console.warn('[CSRF] Failed to fetch CSRF token:', error);
      }
    }
  }

  // Build headers
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Include CSRF token for state-changing requests
  const currentToken = getCSRFToken();
  if (method !== 'GET' && method !== 'OPTIONS' && currentToken) {
    headers["x-csrf-token"] = currentToken;
    console.log('[CSRF] Including token in request headers');
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

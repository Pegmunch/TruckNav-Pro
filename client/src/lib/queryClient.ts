import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Store CSRF token in memory
let csrfToken: string | null = null;

// Function to extract CSRF token from response headers
function extractCSRFToken(res: Response) {
  const token = res.headers.get('X-CSRF-Token');
  if (token) {
    csrfToken = token;
  }
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
  // Ensure we have a CSRF token for state-changing requests
  if (method !== 'GET' && method !== 'OPTIONS' && !csrfToken) {
    try {
      const tokenResponse = await fetch('/api/csrf-token', {
        credentials: 'include'
      });
      if (tokenResponse.ok) {
        extractCSRFToken(tokenResponse);
      }
    } catch (error) {
      console.warn('Failed to fetch CSRF token:', error);
    }
  }

  // Build headers
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Include CSRF token for state-changing requests
  if (method !== 'GET' && method !== 'OPTIONS' && csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
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

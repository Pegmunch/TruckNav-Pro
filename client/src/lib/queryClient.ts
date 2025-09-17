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
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

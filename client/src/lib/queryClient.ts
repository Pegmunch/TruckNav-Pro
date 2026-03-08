import { QueryClient, QueryFunction } from "@tanstack/react-query";

const offlineDefaults: Record<string, any> = {
  '/api/vehicle-profiles': [],
  '/api/journeys': [],
  '/api/journeys/active': null,
  '/api/traffic-incidents': [],
  '/api/traffic-conditions': [],
  '/api/restrictions': [],
  '/api/facilities': [],
  '/api/csrf-token': { token: 'offline' },
};

function getOfflineDefault(queryKey: readonly unknown[]): any {
  const key = queryKey[0] as string;
  for (const [pattern, val] of Object.entries(offlineDefaults)) {
    if (key.startsWith(pattern)) return val;
  }
  return [];
}

export async function apiRequest(method: string, url: string, body?: any): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T = unknown>(options: { on401: UnauthorizedBehavior }) => QueryFunction<T> =
  ({ on401 }) =>
  async ({ queryKey }) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(queryKey[0] as string, { credentials: "include", signal: controller.signal });
      clearTimeout(timeoutId);
      if (on401 === "returnNull" && res.status === 401) return null as any;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return getOfflineDefault(queryKey) as any;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      gcTime: Infinity,
      retry: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
    mutations: { retry: false },
  },
});

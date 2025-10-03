import { QueryClient, QueryFunction } from "@tanstack/react-query";

function buildUrlFromQueryKey(queryKey: readonly unknown[]): string {
  if (queryKey.length === 0) {
    throw new Error("queryKey must not be empty");
  }

  const [base, ...rest] = queryKey;
  if (typeof base !== "string") {
    throw new Error("First queryKey entry must be a string");
  }

  let url = base.replace(/\/*$/, "");
  const pathSegments: string[] = [];
  const searchParams = new URLSearchParams();

  for (const part of rest) {
    if (part === undefined || part === null || part === false) {
      continue;
    }

    if (typeof part === "string") {
      pathSegments.push(encodeURIComponent(part));
    } else if (typeof part === "object" && !Array.isArray(part)) {
      for (const [key, value] of Object.entries(part as Record<string, unknown>)) {
        if (value === undefined || value === null || value === "") continue;
        searchParams.set(key, String(value));
      }
    } else {
      throw new Error("Unsupported queryKey entry");
    }
  }

  if (pathSegments.length > 0) {
    url = `${url}/${pathSegments.join("/")}`;
  }

  const queryString = searchParams.toString();
  if (queryString) {
    url += url.includes("?") ? `&${queryString}` : `?${queryString}`;
  }

  return url || base;
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
  const isFormData = data instanceof FormData;
  
  const res = await fetch(url, {
    method,
    headers: data && !isFormData ? { "Content-Type": "application/json" } : {},
    body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = buildUrlFromQueryKey(queryKey);
    const res = await fetch(url, {
      credentials: "include",
    });

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

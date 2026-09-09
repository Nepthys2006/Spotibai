import { QueryClient } from "@tanstack/react-query";

/** Shared QueryClient. No fetch logic here — data hooks land in Phase 3. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

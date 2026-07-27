// 전역 TanStack Query 클라이언트. 대시보드는 WebSocket 대신 폴링(refetchInterval)으로
// 준실시간 처리하므로(SPEC §6 Out), staleTime을 짧게 유지한다.
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      retry: 1,
    },
  },
});

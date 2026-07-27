import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchSiteLogs } from "../sites";

const LOGS_PAGE_LIMIT = 25;

/** 원시 로그 스트림(F9). 커서 기반 무한 스크롤 — nextCursor가 null이면 더 없음. */
export function useSiteLogs(code: string | null) {
  return useInfiniteQuery({
    queryKey: ["site-logs", code],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      fetchSiteLogs(code as string, pageParam, LOGS_PAGE_LIMIT),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(code),
  });
}

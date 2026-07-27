import { useQuery } from "@tanstack/react-query";
import { fetchSiteDashboard } from "../sites";
import type { DashboardWindow } from "@/types/site.schema";

const POLL_INTERVAL_MS = 10_000;

/** 선택된 현장이 없으면(null) 쿼리를 비활성화한다 — 첫 렌더 시 현장 목록 로딩 대기용. */
export function useSiteDashboard(
  code: string | null,
  window: DashboardWindow = "24h",
) {
  return useQuery({
    queryKey: ["site-dashboard", code, window],
    queryFn: () => fetchSiteDashboard(code as string, window),
    enabled: Boolean(code),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

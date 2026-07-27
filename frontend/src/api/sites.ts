// 사람 경계 대시보드 API 호출(JWT 필요, apiClient 인터셉터가 자동 첨부). API.md §C 계약.
import { apiClient } from "./client";
import {
  siteSummaryListSchema,
  dashboardSnapshotSchema,
  logsPageSchema,
  type DashboardWindow,
} from "@/types/site.schema";

/** 현장 목록 + 수신 요약(F6). */
export async function fetchSites() {
  const { data } = await apiClient.get("/sites");
  return siteSummaryListSchema.parse(data);
}

/** 현장 대시보드 스냅샷(F7): KPI·추이·경보·최근 로그. */
export async function fetchSiteDashboard(
  code: string,
  window: DashboardWindow = "24h",
) {
  const { data } = await apiClient.get(`/sites/${code}/dashboard`, {
    params: { window },
  });
  return dashboardSnapshotSchema.parse(data);
}

/** 원시 로그 커서 페이지네이션(F9). cursor 없으면 최신 페이지부터. */
export async function fetchSiteLogs(
  code: string,
  cursor: string | undefined,
  limit: number,
) {
  const { data } = await apiClient.get(`/sites/${code}/logs`, {
    params: { cursor, limit },
  });
  return logsPageSchema.parse(data);
}

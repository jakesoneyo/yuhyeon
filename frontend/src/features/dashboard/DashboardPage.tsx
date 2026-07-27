// 현장 대시보드 메인 화면(F7). TopBar + SiteSidebar + KPI/추이/경보/지도/로그 그리드로 구성한다.
// DESIGN.md "B. 깔끔한 SaaS 관리자" 레이아웃: 상단바 -> KPI 그리드 -> 2단 그리드 x2.
import { useEffect } from "react";
import { useSites } from "@/api/hooks/useSites";
import { useSiteDashboard } from "@/api/hooks/useSiteDashboard";
import { useSiteSelectionStore } from "@/store/siteSelectionStore";
import { SiteMap } from "@/features/kakao/SiteMap";
import { AlertList } from "./components/AlertList";
import { KpiCard } from "./components/KpiCard";
import { LogStream } from "./components/LogStream";
import { SiteSidebar } from "./components/SiteSidebar";
import { TopBar } from "./components/TopBar";
import { TrendChart } from "./components/TrendChart";

export function DashboardPage() {
  const { data: sites = [], isLoading: sitesLoading } = useSites();
  const selectedCode = useSiteSelectionStore((state) => state.selectedSiteCode);
  const setSelectedSiteCode = useSiteSelectionStore(
    (state) => state.setSelectedSiteCode,
  );

  // 현장 목록이 로드된 뒤 아직 선택된 현장이 없으면 첫 번째 현장을 기본 선택한다.
  useEffect(() => {
    if (!selectedCode && sites.length > 0) {
      setSelectedSiteCode(sites[0].code);
    }
  }, [selectedCode, sites, setSelectedSiteCode]);

  const { data: dashboard, isLoading: dashboardLoading } =
    useSiteDashboard(selectedCode);

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <TopBar
        sites={sites}
        selectedCode={selectedCode}
        onSelect={setSelectedSiteCode}
      />

      <div className="flex flex-1">
        <SiteSidebar
          sites={sites}
          selectedCode={selectedCode}
          onSelect={setSelectedSiteCode}
        />

        <main className="flex-1 p-4">
          {sitesLoading && (
            <p className="text-sm text-muted">현장 목록을 불러오는 중...</p>
          )}
          {!sitesLoading && sites.length === 0 && (
            <p className="text-sm text-muted">
              등록된 현장이 없습니다. 관리자에게 문의하세요.
            </p>
          )}

          {selectedCode && (
            <div className="flex flex-col gap-4">
              {dashboard && (
                <p className="text-xs text-muted">
                  {dashboard.site.name} · 최근 업데이트{" "}
                  {dashboard.site.updatedAtLabel}
                </p>
              )}

              <section className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
                {dashboardLoading && !dashboard ? (
                  <p className="text-sm text-muted">KPI를 불러오는 중...</p>
                ) : (
                  dashboard?.kpis.map((kpi) => (
                    <KpiCard key={kpi.id} {...kpi} />
                  ))
                )}
              </section>

              <section className="grid grid-cols-1 gap-4 min-[900px]:grid-cols-2">
                <div className="rounded-card border border-border bg-surface p-4 shadow-sm">
                  <h2 className="mb-2 text-sm font-semibold text-text">
                    계측 추이
                  </h2>
                  <TrendChart series={dashboard?.series ?? []} />
                </div>
                <div className="rounded-card border border-border bg-surface shadow-sm">
                  <h2 className="px-4 pt-4 text-sm font-semibold text-text">
                    최근 경보
                  </h2>
                  <AlertList alerts={dashboard?.alerts ?? []} />
                </div>
              </section>

              <section className="grid grid-cols-1 gap-4 min-[900px]:grid-cols-2">
                <div className="h-72 rounded-card border border-border bg-surface p-2 shadow-sm">
                  <SiteMap
                    sites={sites}
                    selectedCode={selectedCode}
                    onSelect={setSelectedSiteCode}
                  />
                </div>
                <div className="rounded-card border border-border bg-surface shadow-sm">
                  <h2 className="px-4 pt-4 text-sm font-semibold text-text">
                    원시 로그
                  </h2>
                  <LogStream code={selectedCode} />
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

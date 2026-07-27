// 좌측 사이드바: 현장 목록 + 수신 카운트 배지. 900px 미만에서는 숨김(DESIGN.md 반응형).
import type { SiteSummary } from "@/types/site.schema";

interface SiteSidebarProps {
  sites: SiteSummary[];
  selectedCode: string | null;
  onSelect: (code: string) => void;
}

export function SiteSidebar({
  sites,
  selectedCode,
  onSelect,
}: SiteSidebarProps) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-1 border-r border-border bg-surface p-3 min-[900px]:flex">
      <p className="mb-1 px-2 text-xs font-semibold tracking-wide text-muted uppercase">
        현장 목록
      </p>
      {sites.map((site) => {
        const active = site.code === selectedCode;
        return (
          <button
            key={site.code}
            type="button"
            onClick={() => onSelect(site.code)}
            className={`flex items-center justify-between rounded-chip px-3 py-2 text-left text-sm transition ${
              active
                ? "bg-accent-soft text-accent"
                : "text-text hover:bg-surface-2"
            }`}
          >
            <span className="truncate">{site.name}</span>
            <span
              className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs ${
                site.alertCount > 0
                  ? "bg-danger-soft text-danger"
                  : "bg-surface-2 text-muted"
              }`}
            >
              {site.logCount}
            </span>
          </button>
        );
      })}
      {sites.length === 0 && (
        <p className="px-2 text-sm text-muted">등록된 현장이 없습니다.</p>
      )}
    </aside>
  );
}

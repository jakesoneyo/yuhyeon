// 상단바: 워드마크 + 현장 선택 칩(가로 스크롤) + 유저 칩(DESIGN.md 레이아웃).
import { Building2, LogOut } from "lucide-react";
import type { SiteSummary } from "@/types/site.schema";
import { useAuthStore } from "@/store/authStore";

interface TopBarProps {
  sites: SiteSummary[];
  selectedCode: string | null;
  onSelect: (code: string) => void;
}

export function TopBar({ sites, selectedCode, onSelect }: TopBarProps) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-border bg-surface px-4 py-3">
      <div className="flex shrink-0 items-center gap-2 font-bold text-text">
        <Building2 className="text-accent" size={20} />
        유현건설
      </div>

      <div className="flex flex-1 gap-2 overflow-x-auto">
        {sites.map((site) => (
          <button
            key={site.code}
            type="button"
            onClick={() => onSelect(site.code)}
            className={`shrink-0 whitespace-nowrap rounded-chip border px-3 py-1.5 text-sm transition ${
              site.code === selectedCode
                ? "border-accent bg-accent text-white"
                : "border-border bg-surface text-muted hover:border-accent"
            }`}
          >
            {site.name}
          </button>
        ))}
      </div>

      <div className="flex shrink-0 items-center gap-2 text-sm">
        <span className="rounded-chip bg-surface-2 px-3 py-1.5 text-text">
          {user?.username ?? "-"}
        </span>
        <button
          type="button"
          onClick={logout}
          aria-label="로그아웃"
          className="flex items-center gap-1 rounded-chip border border-border px-2 py-1.5 text-muted transition hover:border-danger hover:text-danger"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}

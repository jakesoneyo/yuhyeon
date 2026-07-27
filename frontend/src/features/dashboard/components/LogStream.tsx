// 원시 로그 스트림(F9, 디버깅/감사용). useSiteLogs로 직접 조회해 커서 기반 "더 보기"를 관리한다.
// 모노스페이스 타임스탬프+원시 라인, 고정 높이 스크롤(DESIGN.md LogStream).
import { useSiteLogs } from "@/api/hooks/useSiteLogs";

export function LogStream({ code }: { code: string | null }) {
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useSiteLogs(code);
  const items = data?.pages.flatMap((page) => page.items) ?? [];

  if (!code || isLoading) {
    return <p className="p-4 text-sm text-muted">로그를 불러오는 중...</p>;
  }
  if (items.length === 0) {
    return <p className="p-4 text-sm text-muted">최근 로그가 없습니다.</p>;
  }

  return (
    <div className="flex max-h-72 flex-col overflow-y-auto font-mono text-xs">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex gap-3 border-b border-border px-4 py-1.5 last:border-0"
        >
          <span className="shrink-0 text-muted">
            {new Date(item.occurredAt).toLocaleTimeString("ko-KR", {
              hour12: false,
            })}
          </span>
          <span className="truncate text-text">{item.rawLine}</span>
        </div>
      ))}
      {hasNextPage && (
        <button
          type="button"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="px-4 py-2 text-left text-accent transition hover:underline disabled:opacity-60"
        >
          {isFetchingNextPage ? "불러오는 중..." : "더 보기"}
        </button>
      )}
    </div>
  );
}

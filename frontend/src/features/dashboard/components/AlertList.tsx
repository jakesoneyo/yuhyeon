// 최근 경보 이력(F7). severity dot + 메시지 + 시각(DESIGN.md AlertItem 매핑).
import type { AlertItem } from "@/types/site.schema";

const LEVEL_DOT: Record<AlertItem["level"], string> = {
  warn: "bg-warn",
  danger: "bg-danger",
};

export function AlertList({ alerts }: { alerts: AlertItem[] }) {
  if (alerts.length === 0) {
    return <p className="p-4 text-sm text-muted">최근 경보가 없습니다.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {alerts.map((alert) => (
        <li
          key={alert.id}
          className="flex items-start gap-2 px-4 py-2.5 text-sm"
        >
          <span
            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${LEVEL_DOT[alert.level]}`}
          />
          <div className="min-w-0">
            <p className="text-text">{alert.message}</p>
            <p className="font-mono text-xs text-muted">{alert.time}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

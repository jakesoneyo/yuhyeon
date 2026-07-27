// KPI 카드: label/value/tone(DESIGN.md KpiCard 매핑). API.md kpis 배열 원소 그대로 받는다.
import type { KpiCard as KpiCardData } from "@/types/site.schema";

const TONE_TEXT: Record<KpiCardData["tone"], string> = {
  neutral: "text-text",
  success: "text-ok",
  warning: "text-warn",
  danger: "text-danger",
};

export function KpiCard({ label, value, tone }: KpiCardData) {
  return (
    <div className="rounded-card border border-border bg-surface p-4 shadow-sm">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${TONE_TEXT[tone]}`}>
        {value}
      </p>
    </div>
  );
}

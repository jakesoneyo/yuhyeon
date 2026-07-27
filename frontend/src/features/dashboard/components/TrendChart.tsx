// 계측 추이 차트(F7). Recharts LineChart로 시계열 값을 그린다(DESIGN.md TrendChart).
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeriesPoint } from "@/types/site.schema";

function formatTick(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TrendChart({ series }: { series: SeriesPoint[] }) {
  if (series.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted">
        표시할 계측 데이터가 없습니다.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart
        data={series}
        margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="t"
          tickFormatter={formatTick}
          tick={{ fontSize: 11, fill: "var(--color-muted)" }}
        />
        <YAxis tick={{ fontSize: 11, fill: "var(--color-muted)" }} />
        <Tooltip labelFormatter={(value) => formatTick(String(value))} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--color-accent)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

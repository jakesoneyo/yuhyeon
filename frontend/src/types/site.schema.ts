// 백엔드 /api/sites* 응답 계약(API.md)을 프론트에서 검증·타입화하는 Zod 스키마.
// 프론트/백 공용 검증 규칙 통일(워크스페이스 표준) — 응답이 계약과 어긋나면 파싱 단계에서 즉시 드러난다.
import { z } from "zod";

export const siteSummarySchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
  logCount: z.number(),
  lastReceivedAt: z.string().nullable(),
  alertCount: z.number(),
});
export type SiteSummary = z.infer<typeof siteSummarySchema>;
export const siteSummaryListSchema = z.array(siteSummarySchema);

export const kpiToneSchema = z.enum([
  "neutral",
  "success",
  "warning",
  "danger",
]);
export const kpiCardSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  tone: kpiToneSchema,
});
export type KpiCard = z.infer<typeof kpiCardSchema>;

export const seriesPointSchema = z.object({
  t: z.string(),
  value: z.number(),
  sensorId: z.string(),
});
export type SeriesPoint = z.infer<typeof seriesPointSchema>;

export const alertLevelSchema = z.enum(["warn", "danger"]);
export const alertItemSchema = z.object({
  id: z.string(),
  time: z.string(),
  message: z.string(),
  level: alertLevelSchema,
});
export type AlertItem = z.infer<typeof alertItemSchema>;

export const logLineSchema = z.object({
  time: z.string(),
  message: z.string(),
});

export const dashboardSnapshotSchema = z.object({
  site: z.object({
    code: z.string(),
    name: z.string(),
    updatedAtLabel: z.string(),
  }),
  kpis: z.array(kpiCardSchema),
  series: z.array(seriesPointSchema),
  alerts: z.array(alertItemSchema),
  logLines: z.array(logLineSchema),
});
export type DashboardSnapshot = z.infer<typeof dashboardSnapshotSchema>;

export const dashboardWindowSchema = z.enum(["1h", "24h", "7d"]);
export type DashboardWindow = z.infer<typeof dashboardWindowSchema>;

export const rawLogItemSchema = z.object({
  id: z.string(),
  occurredAt: z.string(),
  rawLine: z.string(),
  parsedPayload: z.record(z.string(), z.unknown()).nullable().optional(),
});
export type RawLogItem = z.infer<typeof rawLogItemSchema>;

export const logsPageSchema = z.object({
  items: z.array(rawLogItemSchema),
  nextCursor: z.string().nullable(),
});
export type LogsPage = z.infer<typeof logsPageSchema>;

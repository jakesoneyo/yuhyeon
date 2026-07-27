/**
 * 계측 경보 판정 규칙. DATA-MODEL.md §6 방침대로 "저장하지 않고 쿼리 시 계산"하며,
 * 규칙 자체는 별도 테이블이 아니라 이 파일의 상수로 관리한다(M티어 과설계 방지).
 *
 * sensorId 접두어(INC/PPV/WL/CRACK 등)로 계측 종류를 구분해 관리기준(경고/위험) 값을 매핑한다.
 * Stage 3의 simulate-ingest.ts가 데모 데이터를 만들 때도 이 접두어 규칙을 그대로 참고해야
 * 대시보드에 경보가 실제로 나타난다.
 */
export interface AlertThreshold {
  /** 주의 구간 시작값(이상) */
  warn: number;
  /** 위험 구간 시작값(이상) */
  danger: number;
  unit: string;
  label: string;
}

export const ALERT_THRESHOLDS: Record<string, AlertThreshold> = {
  INC: { warn: 10, danger: 14, unit: 'mm', label: '경사계 변위' },
  PPV: { warn: 2, danger: 5, unit: 'mm/s', label: '진동(PPV)' },
  WL: { warn: 500, danger: 800, unit: 'mm', label: '지하수위' },
  CRACK: { warn: 0.3, danger: 0.5, unit: 'mm', label: '균열폭' },
};

export type AlertLevel = 'ok' | 'warn' | 'danger';

/** sensorId 접두어(하이픈 앞부분)로 관리기준을 찾는다. 등록되지 않은 센서 종류는 null. */
export function thresholdFor(
  sensorId: string | undefined,
): AlertThreshold | null {
  if (!sensorId) return null;
  const prefix = sensorId.split('-')[0]?.toUpperCase();
  return ALERT_THRESHOLDS[prefix] ?? null;
}

/**
 * 계측값이 관리기준 대비 어느 구간인지 판정한다.
 * @returns 규칙이 없거나 값이 숫자가 아니면 null(경보 판정 불가 — 무시).
 */
export function evaluateAlertLevel(
  sensorId: string | undefined,
  value: number | undefined,
): AlertLevel | null {
  const threshold = thresholdFor(sensorId);
  if (!threshold || typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  if (value >= threshold.danger) return 'danger';
  if (value >= threshold.warn) return 'warn';
  return 'ok';
}

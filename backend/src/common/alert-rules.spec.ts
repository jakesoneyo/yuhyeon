import { evaluateAlertLevel, thresholdFor } from './alert-rules';

describe('alert-rules', () => {
  describe('thresholdFor', () => {
    it('등록된 접두어(INC 등)는 관리기준을 반환한다', () => {
      expect(thresholdFor('INC-04')).toEqual(
        expect.objectContaining({ warn: 10, danger: 14 }),
      );
    });

    it('등록되지 않은 접두어는 null', () => {
      expect(thresholdFor('UNKNOWN-01')).toBeNull();
    });

    it('sensorId가 없으면 null', () => {
      expect(thresholdFor(undefined)).toBeNull();
    });
  });

  describe('evaluateAlertLevel', () => {
    it('warn 미만이면 ok', () => {
      expect(evaluateAlertLevel('INC-04', 9.99)).toBe('ok');
    });

    it('warn 이상 danger 미만이면 warn (경계값 포함)', () => {
      expect(evaluateAlertLevel('INC-04', 10)).toBe('warn');
      expect(evaluateAlertLevel('INC-04', 13.99)).toBe('warn');
    });

    it('danger 이상이면 danger (경계값 포함)', () => {
      expect(evaluateAlertLevel('INC-04', 14)).toBe('danger');
      expect(evaluateAlertLevel('INC-04', 20)).toBe('danger');
    });

    it('규칙이 없는 센서는 null(판정 불가)', () => {
      expect(evaluateAlertLevel('UNKNOWN-01', 999)).toBeNull();
    });

    it('값이 숫자가 아니면 null', () => {
      expect(evaluateAlertLevel('INC-04', undefined)).toBeNull();
      expect(evaluateAlertLevel('INC-04', NaN)).toBeNull();
    });
  });
});

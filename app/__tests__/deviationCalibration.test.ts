import {
  buildDeviationCalibrationCases,
  DEVIATION_DISTANCE_THRESHOLDS_M,
  evaluateDeviationThresholds,
} from '@/features/location/deviationCalibration';

describe('reproducible deviation-threshold calibration', () => {
  test('keeps a fixed pre-labelled set with both outcome classes', () => {
    const cases = buildDeviationCalibrationCases();

    expect(cases.map((item) => item.caseId)).toEqual([
      'P1',
      'P2',
      'P3',
      'P4',
      'P5',
      'P6',
      'N1',
      'N2',
      'N3',
      'N4',
      'N5',
      'N6',
      'N7',
    ]);
    expect(cases.filter((item) => item.expectedAlert)).toHaveLength(6);
    expect(cases.filter((item) => !item.expectedAlert)).toHaveLength(7);
  });

  test('evaluates every case with every declared threshold', () => {
    const result = evaluateDeviationThresholds();

    expect(result.predictions).toHaveLength(
      buildDeviationCalibrationCases().length *
        DEVIATION_DISTANCE_THRESHOLDS_M.length,
    );
    expect(result.summaries.map((summary) => summary.thresholdM)).toEqual([
      20, 30, 40,
    ]);
  });

  test('selects 30 metres from the fixed cases without hiding errors', () => {
    const result = evaluateDeviationThresholds();

    expect(result.selectedThresholdM).toBe(30);
    expect(result.summaries).toEqual([
      expect.objectContaining({
        thresholdM: 20,
        truePositives: 6,
        trueNegatives: 5,
        falsePositives: 2,
        falseNegatives: 0,
        selected: false,
      }),
      expect.objectContaining({
        thresholdM: 30,
        truePositives: 5,
        trueNegatives: 7,
        falsePositives: 0,
        falseNegatives: 1,
        selected: true,
      }),
      expect.objectContaining({
        thresholdM: 40,
        truePositives: 4,
        trueNegatives: 7,
        falsePositives: 0,
        falseNegatives: 2,
        selected: false,
      }),
    ]);
  });

  test('reports detection latency only for alerts that should exist', () => {
    const result = evaluateDeviationThresholds();
    const selected = result.summaries.find((summary) => summary.selected);
    const falseAlerts = result.predictions.filter(
      (prediction) =>
        prediction.thresholdM === 20 && !prediction.expectedAlert && prediction.predictedAlert,
    );

    expect(selected).toEqual(
      expect.objectContaining({
        meanDetectionLatencyMs: 11_000,
        medianDetectionLatencyMs: 10_000,
      }),
    );
    expect(falseAlerts).toHaveLength(2);
    expect(falseAlerts.every((prediction) => prediction.detectionLatencyMs === null)).toBe(true);
  });

  test.each([
    { thresholds: [] },
    { thresholds: [30, 20] },
    { thresholds: [20, 20] },
    { thresholds: [0, 20] },
  ])('rejects an invalid threshold sequence: $thresholds', ({ thresholds }) => {
    expect(() => evaluateDeviationThresholds(thresholds)).toThrow(
      'Thresholds must be positive, unique and sorted.',
    );
  });
});

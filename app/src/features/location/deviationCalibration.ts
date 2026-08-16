import type { GeoPoint } from '../../api/types';
import {
  DEFAULT_DEVIATION_CONFIG,
  evaluateLocationSample,
  INITIAL_DEVIATION_STATE,
  type DeviationDetectorConfig,
  type LocationSample,
} from './deviationDetector';

const EARTH_RADIUS_M = 6_371_000;

export const DEVIATION_DISTANCE_THRESHOLDS_M = [20, 30, 40] as const;

export const DEVIATION_CALIBRATION_ROUTE: GeoPoint[] = [
  { latitude: 40.43, longitude: -3.72 },
  { latitude: 40.435, longitude: -3.72 },
];

export interface DeviationCalibrationCase {
  caseId: string;
  description: string;
  expectedAlert: boolean;
  deviationStartMs: number | null;
  samples: LocationSample[];
}

export interface DeviationPrediction {
  thresholdM: number;
  caseId: string;
  description: string;
  expectedAlert: boolean;
  predictedAlert: boolean;
  correct: boolean;
  alertTimestampMs: number | null;
  detectionLatencyMs: number | null;
}

export interface DeviationThresholdSummary {
  thresholdM: number;
  accuracy: number;
  precision: number;
  sensitivity: number;
  specificity: number;
  f1: number;
  truePositives: number;
  trueNegatives: number;
  falsePositives: number;
  falseNegatives: number;
  meanDetectionLatencyMs: number | null;
  medianDetectionLatencyMs: number | null;
  selected: boolean;
}

export interface DeviationCalibrationResult {
  cases: DeviationCalibrationCase[];
  predictions: DeviationPrediction[];
  summaries: DeviationThresholdSummary[];
  selectedThresholdM: number;
}

function offsetLongitude(latitude: number, offsetM: number): number {
  const radians = Math.PI / 180;
  return (
    -3.72 +
    (offsetM / (EARTH_RADIUS_M * Math.cos(latitude * radians))) / radians
  );
}

function sample(
  timestampMs: number,
  offsetM: number,
  accuracyM = 5,
): LocationSample {
  const latitude = 40.4325;
  return {
    accuracyM,
    latitude,
    longitude: offsetLongitude(latitude, offsetM),
    timestampMs,
  };
}

function sequence(
  offsetsM: number[],
  options: { accuracyM?: number; startMs?: number; intervalMs?: number } = {},
): LocationSample[] {
  const {
    accuracyM = 5,
    startMs = 0,
    intervalMs = 5_000,
  } = options;
  return offsetsM.map((offsetM, index) =>
    sample(startMs + index * intervalMs, offsetM, accuracyM),
  );
}

export function buildDeviationCalibrationCases(): DeviationCalibrationCase[] {
  return [
    {
      caseId: 'P1',
      description: 'Desviación estable de 25 m',
      expectedAlert: true,
      deviationStartMs: 0,
      samples: sequence([25, 25, 25]),
    },
    {
      caseId: 'P2',
      description: 'Desviación estable de 35 m',
      expectedAlert: true,
      deviationStartMs: 0,
      samples: sequence([35, 35, 35]),
    },
    {
      caseId: 'P3',
      description: 'Desviación estable de 50 m',
      expectedAlert: true,
      deviationStartMs: 0,
      samples: sequence([50, 50, 50]),
    },
    {
      caseId: 'P4',
      description: 'Separación gradual de la ruta',
      expectedAlert: true,
      deviationStartMs: 5_000,
      samples: sequence([12, 22, 32, 45, 55, 65]),
    },
    {
      caseId: 'P5',
      description: 'Desviación estable después de una lectura imprecisa',
      expectedAlert: true,
      deviationStartMs: 5_000,
      samples: [
        sample(0, 50, 40),
        ...sequence([50, 50, 50], { startMs: 5_000 }),
      ],
    },
    {
      caseId: 'P6',
      description: 'Retorno puntual seguido de una desviación estable',
      expectedAlert: true,
      deviationStartMs: 15_000,
      samples: sequence([50, 50, 5, 50, 50, 50]),
    },
    {
      caseId: 'N1',
      description: 'Posiciones centradas sobre la ruta',
      expectedAlert: false,
      deviationStartMs: null,
      samples: sequence([0, 2, -3, 1]),
    },
    {
      caseId: 'N2',
      description: 'Ruido GPS ordinario de hasta 12 m',
      expectedAlert: false,
      deviationStartMs: null,
      samples: sequence([8, -12, 10, -6]),
    },
    {
      caseId: 'N3',
      description: 'Una única lectura alejada',
      expectedAlert: false,
      deviationStartMs: null,
      samples: sequence([3, 60, 4, 2]),
    },
    {
      caseId: 'N4',
      description: 'Dos lecturas alejadas sin duración suficiente',
      expectedAlert: false,
      deviationStartMs: null,
      samples: sequence([50, 50, 5]),
    },
    {
      caseId: 'N5',
      description: 'Lecturas alejadas con precisión insuficiente',
      expectedAlert: false,
      deviationStartMs: null,
      samples: sequence([70, 70, 70], { accuracyM: 35 }),
    },
    {
      caseId: 'N6',
      description: 'Sesgo lateral GPS conocido de 24 m sin salida real',
      expectedAlert: false,
      deviationStartMs: null,
      samples: sequence([24, 24, 24]),
    },
    {
      caseId: 'N7',
      description: 'Desplazamiento cartográfico de 28 m sin salida real',
      expectedAlert: false,
      deviationStartMs: null,
      samples: sequence([28, 28, 28]),
    },
  ];
}

function divide(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export function evaluateDeviationCase(
  calibrationCase: DeviationCalibrationCase,
  config: DeviationDetectorConfig,
): DeviationPrediction {
  let state = INITIAL_DEVIATION_STATE;
  let alertTimestampMs: number | null = null;
  for (const locationSample of calibrationCase.samples) {
    state = evaluateLocationSample(
      state,
      locationSample,
      DEVIATION_CALIBRATION_ROUTE,
      config,
    );
    if (state.status === 'confirmation_required') {
      alertTimestampMs = locationSample.timestampMs;
      break;
    }
  }
  const predictedAlert = alertTimestampMs !== null;
  const detectionLatencyMs =
    alertTimestampMs !== null && calibrationCase.deviationStartMs !== null
      ? alertTimestampMs - calibrationCase.deviationStartMs
      : null;
  return {
    thresholdM: config.routeDistanceThresholdM,
    caseId: calibrationCase.caseId,
    description: calibrationCase.description,
    expectedAlert: calibrationCase.expectedAlert,
    predictedAlert,
    correct: predictedAlert === calibrationCase.expectedAlert,
    alertTimestampMs,
    detectionLatencyMs,
  };
}

function summarizeThreshold(
  thresholdM: number,
  predictions: DeviationPrediction[],
): Omit<DeviationThresholdSummary, 'selected'> {
  const truePositives = predictions.filter(
    (prediction) => prediction.expectedAlert && prediction.predictedAlert,
  ).length;
  const trueNegatives = predictions.filter(
    (prediction) => !prediction.expectedAlert && !prediction.predictedAlert,
  ).length;
  const falsePositives = predictions.filter(
    (prediction) => !prediction.expectedAlert && prediction.predictedAlert,
  ).length;
  const falseNegatives = predictions.filter(
    (prediction) => prediction.expectedAlert && !prediction.predictedAlert,
  ).length;
  const precision = divide(truePositives, truePositives + falsePositives);
  const sensitivity = divide(truePositives, truePositives + falseNegatives);
  const latencies = predictions.flatMap((prediction) =>
    prediction.detectionLatencyMs === null
      ? []
      : [prediction.detectionLatencyMs],
  );
  return {
    thresholdM,
    accuracy: divide(truePositives + trueNegatives, predictions.length),
    precision,
    sensitivity,
    specificity: divide(trueNegatives, trueNegatives + falsePositives),
    f1: divide(2 * precision * sensitivity, precision + sensitivity),
    truePositives,
    trueNegatives,
    falsePositives,
    falseNegatives,
    meanDetectionLatencyMs:
      latencies.length === 0
        ? null
        : latencies.reduce((total, latency) => total + latency, 0) /
          latencies.length,
    medianDetectionLatencyMs: median(latencies),
  };
}

function selectThreshold(
  summaries: Omit<DeviationThresholdSummary, 'selected'>[],
): number {
  const ordered = [...summaries].sort(
    (first, second) =>
      second.f1 - first.f1 ||
      first.falsePositives - second.falsePositives ||
      second.sensitivity - first.sensitivity ||
      first.thresholdM - second.thresholdM,
  );
  return ordered[0].thresholdM;
}

export function evaluateDeviationThresholds(
  thresholdsM: readonly number[] = DEVIATION_DISTANCE_THRESHOLDS_M,
  cases: DeviationCalibrationCase[] = buildDeviationCalibrationCases(),
): DeviationCalibrationResult {
  if (
    thresholdsM.length === 0 ||
    thresholdsM.some((threshold) => !Number.isFinite(threshold) || threshold <= 0) ||
    thresholdsM.some(
      (threshold, index) => index > 0 && threshold <= thresholdsM[index - 1],
    )
  ) {
    throw new Error('Thresholds must be positive, unique and sorted.');
  }
  if (cases.length === 0 || !cases.some((item) => item.expectedAlert) || !cases.some((item) => !item.expectedAlert)) {
    throw new Error('Calibration cases must contain positive and negative examples.');
  }

  const predictions = thresholdsM.flatMap((thresholdM) => {
    const config: DeviationDetectorConfig = {
      ...DEFAULT_DEVIATION_CONFIG,
      routeDistanceThresholdM: thresholdM,
    };
    return cases.map((calibrationCase) =>
      evaluateDeviationCase(calibrationCase, config),
    );
  });
  const incompleteSummaries = thresholdsM.map((thresholdM) =>
    summarizeThreshold(
      thresholdM,
      predictions.filter((prediction) => prediction.thresholdM === thresholdM),
    ),
  );
  const selectedThresholdM = selectThreshold(incompleteSummaries);
  return {
    cases,
    predictions,
    summaries: incompleteSummaries.map((summary) => ({
      ...summary,
      selected: summary.thresholdM === selectedThresholdM,
    })),
    selectedThresholdM,
  };
}

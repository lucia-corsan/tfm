import type {
  ConstraintViolation,
  RouteReason,
  RouteWarning,
} from '@/api/types';
import { ES } from '../../../i18n/es';

export function formatPercentage(value: number): string {
  return `${Math.round(value * 100)} %`;
}

export function formatDistance(distanceM: number): string {
  if (distanceM >= 1000) {
    return `${(distanceM / 1000).toFixed(1).replace('.', ',')} km`;
  }
  return `${Math.round(distanceM)} m`;
}

export function formatDuration(durationS: number): string {
  return `${Math.round(durationS / 60)} min`;
}

export function describeReason(reason: RouteReason): string {
  return `${ES.routeComparison.reasonKinds[reason.kind]}: ${ES.routeComparison.dimensions[reason.dimension]}.`;
}

export function describeWarning(warning: RouteWarning): string {
  const summary = `${ES.routeComparison.warningStates[warning.state]} sobre ${ES.routeComparison.attributes[warning.attribute]}. Cobertura ${formatPercentage(warning.coverage_ratio)}.`;
  return warning.note ? `${summary} ${warning.note}` : summary;
}

export function describeViolation(violation: ConstraintViolation): string {
  return ES.routeComparison.constraints[violation.code];
}

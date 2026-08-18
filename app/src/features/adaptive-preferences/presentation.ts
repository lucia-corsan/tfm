import type { AdaptiveChoiceResult } from '@/features/adaptive-preferences/useAdaptivePreferences';
import { mostChangedEffectiveDimensions } from '@/features/adaptive-preferences/storage';
import { ES } from '../../../i18n/es';

export function describeAdaptiveChoice(
  result: AdaptiveChoiceResult,
): string | null {
  if (result.kind === 'disabled') {
    return null;
  }
  if (result.kind === 'insufficient_alternatives') {
    return ES.adaptivePreferences.singleRouteNotice;
  }
  if (result.kind === 'storage_error') {
    return ES.adaptivePreferences.storageError;
  }
  if (result.update.status === 'observation') {
    return ES.adaptivePreferences.observationRecorded(
      result.update.updatedState.choiceCount,
      result.update.updatedState.config.observationChoices,
    );
  }
  const changes = mostChangedEffectiveDimensions(result.update);
  if (changes.length === 0) {
    return ES.adaptivePreferences.noEffectiveChange;
  }
  return ES.adaptivePreferences.influentialChoice(
    changes.map((change) => ({
      direction: change.difference > 0 ? 'more' : 'less',
      label: ES.routeComparison.dimensions[change.dimension],
    })),
  );
}

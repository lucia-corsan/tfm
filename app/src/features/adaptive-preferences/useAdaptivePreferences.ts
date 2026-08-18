import { useCallback, useEffect, useRef, useState } from 'react';

import type { PreferenceWeights, RouteCompareResponse } from '@/api/types';
import {
  buildPairwiseChoice,
  initializeLearning,
  resetLearning,
  setLearningEnabled,
  updatePreferences,
  type PreferenceLearningState,
  type PreferenceUpdate,
} from '@/features/adaptive-preferences/learner';
import { sqlitePreferenceStorage } from '@/features/adaptive-preferences/sqliteStorage';
import {
  appendPreferenceChoice,
  clearPreferenceLearning,
  loadPreferenceState,
  savePreferenceState,
  type PreferenceStorage,
} from '@/features/adaptive-preferences/storage';

export type AdaptivePreferenceStatus = 'loading' | 'ready' | 'error';

export type AdaptiveChoiceResult =
  | { kind: 'disabled'; update: null }
  | { kind: 'insufficient_alternatives'; update: null }
  | { kind: 'updated'; update: PreferenceUpdate }
  | { kind: 'storage_error'; update: null };

interface AdaptivePreferencesController {
  learningState: PreferenceLearningState;
  recordChoice: (
    comparison: RouteCompareResponse,
    chosenRouteId: string,
  ) => Promise<AdaptiveChoiceResult>;
  recoveredFromInvalidData: boolean;
  reset: () => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<void>;
  status: AdaptivePreferenceStatus;
}

export function useAdaptivePreferences(
  profileId: string,
  declaredWeights: PreferenceWeights,
  storage: PreferenceStorage = sqlitePreferenceStorage,
): AdaptivePreferencesController {
  const [learningState, setLearningState] = useState(() =>
    initializeLearning(declaredWeights),
  );
  const [storedStatus, setStoredStatus] =
    useState<AdaptivePreferenceStatus>('loading');
  const [loadedProfileId, setLoadedProfileId] = useState<string | null>(null);
  const [storedRecoveryNotice, setStoredRecoveryNotice] = useState(false);
  const requestVersion = useRef(0);
  const status =
    loadedProfileId === profileId ? storedStatus : ('loading' as const);
  const recoveredFromInvalidData =
    loadedProfileId === profileId && storedRecoveryNotice;

  useEffect(() => {
    const currentVersion = requestVersion.current + 1;
    requestVersion.current = currentVersion;
    void loadPreferenceState(storage, profileId, declaredWeights)
      .then((loaded) => {
        if (requestVersion.current !== currentVersion) {
          return;
        }
        setLearningState(loaded.state);
        setStoredRecoveryNotice(loaded.recoveredFromInvalidData);
        setStoredStatus('ready');
        setLoadedProfileId(profileId);
      })
      .catch(() => {
        if (requestVersion.current !== currentVersion) {
          return;
        }
        setLearningState(initializeLearning(declaredWeights));
        setStoredRecoveryNotice(false);
        setStoredStatus('error');
        setLoadedProfileId(profileId);
      });
  }, [declaredWeights, profileId, storage]);

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      if (status !== 'ready') {
        return;
      }
      const updated = setLearningEnabled(learningState, enabled);
      try {
        await savePreferenceState(storage, profileId, updated);
        setLearningState(updated);
      } catch {
        setStoredStatus('error');
      }
    },
    [learningState, profileId, status, storage],
  );

  const reset = useCallback(async () => {
    if (status !== 'ready') {
      return;
    }
    const resetState = resetLearning(learningState);
    try {
      await clearPreferenceLearning(storage, profileId);
      await savePreferenceState(storage, profileId, resetState);
      setLearningState(resetState);
    } catch {
      setStoredStatus('error');
    }
  }, [learningState, profileId, status, storage]);

  const recordChoice = useCallback(
    async (
      comparison: RouteCompareResponse,
      chosenRouteId: string,
    ): Promise<AdaptiveChoiceResult> => {
      if (status !== 'ready' || !learningState.enabled) {
        return { kind: 'disabled', update: null };
      }
      if (comparison.routes.length < 2) {
        return { kind: 'insufficient_alternatives', update: null };
      }
      try {
        const choice = buildPairwiseChoice(comparison, chosenRouteId);
        const update = updatePreferences(learningState, choice);
        await appendPreferenceChoice(
          storage,
          profileId,
          choice,
          update,
        );
        setLearningState(update.updatedState);
        return { kind: 'updated', update };
      } catch {
        setStoredStatus('error');
        return { kind: 'storage_error', update: null };
      }
    },
    [learningState, profileId, status, storage],
  );

  return {
    learningState,
    recordChoice,
    recoveredFromInvalidData,
    reset,
    setEnabled,
    status,
  };
}

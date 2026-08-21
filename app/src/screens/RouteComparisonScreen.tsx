import { useEffect, useMemo, useRef, useState } from 'react';

import type { SearchPlacesFunction } from '@/components/PlaceSearchField';
import { PlaceQueryScreen } from '@/screens/PlaceQueryScreen';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import {
  CONFIGURED_PLAN_STEPS,
  PLAN_STEPS,
  PlanRouteScreen,
  type PlanStep,
} from '@/screens/PlanRouteScreen';
import { RouteResultsScreen } from '@/screens/RouteResultsScreen';
import type { ComparedRoute, NavigationSession } from '@/api/types';
import { useAdaptivePreferences } from '@/features/adaptive-preferences/useAdaptivePreferences';
import { describeAdaptiveChoice } from '@/features/adaptive-preferences/presentation';
import type { PreferenceStorage } from '@/features/adaptive-preferences/storage';
import { sqlitePreferenceStorage } from '@/features/adaptive-preferences/sqliteStorage';
import {
  type CompareRoutesFunction,
  useRouteComparison,
} from '@/features/route-comparison/useRouteComparison';
import { DEMO_PROFILES } from '@/features/route-comparison/profiles';
import {
  buildProfileFromAnswers,
  DEFAULT_ONBOARDING_ANSWERS,
  type OnboardingAnswers,
} from '@/features/onboarding/answers';
import { ES } from '../../i18n/es';

interface RouteComparisonScreenProps {
  compare?: CompareRoutesFunction;
  /** Respuestas del cuestionario inicial, si se completó. */
  onboardingAnswers?: OnboardingAnswers;
  onChooseRoute?: (session: NavigationSession) => void;
  onUpdatePreferences?: (answers: OnboardingAnswers) => void;
  preferenceStorage?: PreferenceStorage;
  search?: SearchPlacesFunction;
}

/**
 * Flujo de comparación repartido en pantallas independientes.
 *
 * Cada paso ocupa una pantalla completa, de forma que el recorrido con lector
 * de pantalla avanza por pasos cortos en lugar de una única lista larga.
 */
export function RouteComparisonScreen({
  compare,
  onboardingAnswers,
  onChooseRoute = () => undefined,
  onUpdatePreferences,
  preferenceStorage = sqlitePreferenceStorage,
  search,
}: RouteComparisonScreenProps) {
  const configuredProfile = useMemo(
    () =>
      onboardingAnswers ? buildProfileFromAnswers(onboardingAnswers) : undefined,
    [onboardingAnswers],
  );
  /**
   * El cuestionario ya fijó el perfil y el consentimiento del aprendizaje, así
   * que esos dos pasos no vuelven a pedirse.
   */
  const planSteps: readonly PlanStep[] = onboardingAnswers
    ? CONFIGURED_PLAN_STEPS
    : PLAN_STEPS;
  const controller = useRouteComparison(compare, configuredProfile);
  const { state } = controller;
  const [choosingRouteId, setChoosingRouteId] = useState<string | null>(null);
  const [editingPreferences, setEditingPreferences] = useState(false);
  const [planStep, setPlanStep] = useState<PlanStep>('confirm');
  const [placeStep, setPlaceStep] = useState<'destination' | 'origin' | null>(
    'destination',
  );
  const choiceInProgress = useRef(false);
  const selectedProfile =
    configuredProfile ?? DEMO_PROFILES[controller.selectedProfileId];
  const adaptive = useAdaptivePreferences(
    selectedProfile.profile_id,
    selectedProfile.declared_weights,
    preferenceStorage,
  );
  const adaptiveEnabled = adaptive.learningState.enabled;
  const adaptiveStatus = adaptive.status;
  const setAdaptiveEnabled = adaptive.setEnabled;

  useEffect(() => {
    if (onboardingAnswers && adaptiveStatus === 'ready') {
      const desired = onboardingAnswers.adaptiveLearning;
      if (adaptiveEnabled !== desired) {
        void setAdaptiveEnabled(desired);
      }
    }
  }, [
    adaptiveEnabled,
    adaptiveStatus,
    onboardingAnswers,
    setAdaptiveEnabled,
  ]);

  const chooseRoute = async (route: ComparedRoute) => {
    if (state.status !== 'success' || choiceInProgress.current) {
      return;
    }
    choiceInProgress.current = true;
    setChoosingRouteId(route.route_id);
    const result = await adaptive.recordChoice(state.response, route.route_id);
    const effectiveWeights =
      result.kind === 'updated'
        ? result.update.updatedState.effectiveWeights
        : adaptive.learningState.effectiveWeights;
    const session: NavigationSession = {
      destination: { ...state.request.destination },
      effective_weights: { ...effectiveWeights },
      learning_feedback: describeAdaptiveChoice(result),
      profile: {
        ...state.request.profile,
        declared_weights: {
          ...state.request.profile.declared_weights,
        },
      },
      route,
    };
    choiceInProgress.current = false;
    setChoosingRouteId(null);
    onChooseRoute(session);
  };

  const returnToSearch = () => {
    setPlaceStep(null);
    setPlanStep('confirm');
    controller.reset();
  };

  if (editingPreferences && onboardingAnswers) {
    return (
      <OnboardingScreen
        initialAnswers={onboardingAnswers}
        onFinish={(answers) => {
          onUpdatePreferences?.(answers ?? DEFAULT_ONBOARDING_ANSWERS);
          setEditingPreferences(false);
        }}
      />
    );
  }

  if (state.status === 'success') {
    return (
      <RouteResultsScreen
        choosingRouteId={choosingRouteId}
        destinationName={controller.destination?.name ?? ''}
        onBack={returnToSearch}
        onChooseRoute={(route) => void chooseRoute(route)}
        originName={controller.origin?.name ?? ''}
        response={state.response}
      />
    );
  }

  if (placeStep === 'destination') {
    return (
      <PlaceQueryScreen
        field="destination"
        key="destination"
        onNext={() => setPlaceStep('origin')}
        onSelect={controller.selectDestination}
        search={search}
        selectedPlace={controller.destination}
      />
    );
  }

  if (placeStep === 'origin') {
    return (
      <PlaceQueryScreen
        backHint={ES.placeQuery.backToDestinationHint}
        backLabel={ES.placeQuery.backToDestinationButton}
        field="origin"
        key="origin"
        onBack={() => setPlaceStep('destination')}
        onNext={() => {
          setPlaceStep(null);
          setPlanStep('confirm');
        }}
        onSelect={controller.selectOrigin}
        search={search}
        selectedPlace={controller.origin}
      />
    );
  }

  return (
    <PlanRouteScreen
      adaptive={{
        learningState: adaptive.learningState,
        recoveredFromInvalidData: adaptive.recoveredFromInvalidData,
        reset: adaptive.reset,
        setEnabled: adaptive.setEnabled,
        status: adaptive.status,
      }}
      canCompare={controller.canCompare}
      comparisonStatus={state.status}
      destination={controller.destination}
      {...(state.status === 'error' ? { errorCode: state.code } : {})}
      onChangeDestination={() => setPlaceStep('destination')}
      onChangeOrigin={() => setPlaceStep('origin')}
      {...(onboardingAnswers && onUpdatePreferences
        ? { onEditPreferences: () => setEditingPreferences(true) }
        : {})}
      onCompare={() =>
        void controller.compareSelectedProfile(
          adaptive.learningState.effectiveWeights,
        )
      }
      onGoToStep={setPlanStep}
      onSelectProfile={controller.selectProfile}
      origin={controller.origin}
      selectedProfileId={controller.selectedProfileId}
      step={planStep}
      steps={planSteps}
    />
  );
}

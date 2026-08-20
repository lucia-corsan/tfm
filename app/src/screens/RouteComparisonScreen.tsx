import { useRef, useState } from 'react';

import type { SearchPlacesFunction } from '@/components/PlaceSearchField';
import { PlaceQueryScreen } from '@/screens/PlaceQueryScreen';
import { PlanRouteScreen, type PlanStep } from '@/screens/PlanRouteScreen';
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
import { ES } from '../../i18n/es';

interface RouteComparisonScreenProps {
  compare?: CompareRoutesFunction;
  onChooseRoute?: (session: NavigationSession) => void;
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
  onChooseRoute = () => undefined,
  preferenceStorage = sqlitePreferenceStorage,
  search,
}: RouteComparisonScreenProps) {
  const controller = useRouteComparison(compare);
  const { state } = controller;
  const [choosingRouteId, setChoosingRouteId] = useState<string | null>(null);
  const [planStep, setPlanStep] = useState<PlanStep>('confirm');
  const [placeStep, setPlaceStep] = useState<'destination' | 'origin' | null>(
    'destination',
  );
  const choiceInProgress = useRef(false);
  const selectedProfile = DEMO_PROFILES[controller.selectedProfileId];
  const adaptive = useAdaptivePreferences(
    controller.selectedProfileId,
    selectedProfile.declared_weights,
    preferenceStorage,
  );

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
    />
  );
}

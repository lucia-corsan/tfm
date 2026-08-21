import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AccessibleText } from '@/components/AccessibleText';
import { AdaptivePreferencesPanel } from '@/components/AdaptivePreferencesPanel';
import { Callout } from '@/components/Callout';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ActionBand } from '@/components/ActionBand';
import { Icon } from '@/components/icons';
import { StepProgress } from '@/components/StepProgress';
import { ProfileOption } from '@/components/ProfileOption';
import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import type { PlaceResult } from '@/api/types';
import type { PreferenceLearningState } from '@/features/adaptive-preferences/learner';
import type { AdaptivePreferenceStatus } from '@/features/adaptive-preferences/useAdaptivePreferences';
import type { RouteApiErrorCode } from '@/api/client';
import type { DemoProfileId } from '@/features/route-comparison/profiles';
import { colors, spacing } from '@/theme';
import { ES } from '../../i18n/es';

const PROFILE_IDS: DemoProfileId[] = [
  'balanced_demo',
  'simpler_crossings_demo',
];

/** Pasos de la configuración, en el orden en que se recorren. */
export const PLAN_STEPS = ['confirm', 'profile', 'learning'] as const;

export type PlanStep = (typeof PLAN_STEPS)[number];

/** Pasos que quedan cuando el cuestionario inicial ya fijó las preferencias. */
export const CONFIGURED_PLAN_STEPS = ['confirm'] as const;

interface PlanRouteScreenProps {
  adaptive: {
    learningState: PreferenceLearningState;
    recoveredFromInvalidData: boolean;
    reset: () => Promise<void>;
    setEnabled: (enabled: boolean) => Promise<void>;
    status: AdaptivePreferenceStatus;
  };
  canCompare: boolean;
  comparisonStatus: 'error' | 'idle' | 'loading';
  destination: PlaceResult | null;
  errorCode?: RouteApiErrorCode;
  onCompare: () => void;
  onChangeDestination: () => void;
  onChangeOrigin: () => void;
  onEditPreferences?: () => void;
  onGoToStep: (step: PlanStep) => void;
  onSelectProfile: (profileId: DemoProfileId) => void;
  origin: PlaceResult | null;
  selectedProfileId: DemoProfileId;
  step: PlanStep;
  /** Pasos vigentes; se acortan si el cuestionario ya respondió alguno. */
  steps: readonly PlanStep[];
}

/**
 * Configuración del trayecto repartida en pasos cortos.
 *
 * Cada paso presenta un único asunto y termina en una sola acción, de modo que
 * el recorrido con TalkBack y el del teclado se mantengan breves. En Android
 * ambos recorridos comparten la misma propiedad `accessible`, así que una
 * pantalla larga vuelve impredecible la búsqueda de foco del teclado.
 */
export function PlanRouteScreen({
  adaptive,
  canCompare,
  comparisonStatus,
  destination,
  errorCode,
  onChangeDestination,
  onChangeOrigin,
  onEditPreferences,
  onCompare,
  onGoToStep,
  onSelectProfile,
  origin,
  selectedProfileId,
  step,
  steps,
}: PlanRouteScreenProps) {
  const loading = comparisonStatus === 'loading';
  const stepIndex = steps.indexOf(step);
  const isLastStep = stepIndex === steps.length - 1;
  const copy = ES.routeComparison.steps[step];

  return (
    <Screen
      band={
        <ActionBand
          accessibilityHint={
            isLastStep
              ? ES.routeComparison.compareHint
              : ES.routeComparison.continueHint
          }
          busy={loading}
          disabled={
            isLastStep
              ? adaptive.status === 'loading' || !canCompare
              : !canCompare
          }
          label={
            isLastStep
              ? loading
                ? ES.routeComparison.loadingButton
                : ES.routeComparison.compareButton
              : ES.routeComparison.continueButton
          }
          onPress={
            isLastStep ? onCompare : () => onGoToStep(steps[stepIndex + 1])
          }
        />
      }
      header={
        <>
          <TopBar
            backHint={ES.routeComparison.backStepHint}
            backLabel={ES.routeComparison.backStepButton}
            onBack={
              stepIndex > 0
                ? () => onGoToStep(steps[stepIndex - 1])
                : onChangeOrigin
            }
            title={ES.routeComparison.stepIndicator(
              stepIndex + 1,
              steps.length,
            )}
          />
          <StepProgress current={stepIndex + 1} total={steps.length} />
        </>
      }
    >
      <View style={styles.hero}>
        <AccessibleText
          accessibilityLiveRegion="polite"
          accessibilityRole="header"
          variant="display"
        >
          {copy.title}
        </AccessibleText>
        <AccessibleText style={styles.muted}>{copy.description}</AccessibleText>
      </View>

      {step === 'confirm' && (
        <View style={styles.section}>
          <View style={styles.endpoints}>
            <View style={styles.endpoint}>
              <Icon color={colors.brandInk} name="mapPin" size={22} />
              <View style={styles.endpointCopy}>
                <AccessibleText style={styles.endpointLabel} variant="meta">
                  {ES.routeComparison.placeSearch.origin.label}
                </AccessibleText>
                <AccessibleText variant="emphasis">
                  {origin?.name ?? ES.routeComparison.placeNotChosen}
                </AccessibleText>
              </View>
              <PrimaryButton
                accessibilityHint={ES.routeComparison.changeHint(
                  ES.routeComparison.placeSearch.origin.label,
                )}
                accessibilityLabel={ES.routeComparison.changeButton(
                  ES.routeComparison.placeSearch.origin.label,
                )}
                label={ES.routeComparison.changeShortButton}
                onPress={onChangeOrigin}
                variant="link"
              />
            </View>

            <View style={styles.endpoint}>
              <Icon color={colors.brandInk} name="flagCheckered" size={22} />
              <View style={styles.endpointCopy}>
                <AccessibleText style={styles.endpointLabel} variant="meta">
                  {ES.routeComparison.placeSearch.destination.label}
                </AccessibleText>
                <AccessibleText variant="emphasis">
                  {destination?.name ?? ES.routeComparison.placeNotChosen}
                </AccessibleText>
              </View>
              <PrimaryButton
                accessibilityHint={ES.routeComparison.changeHint(
                  ES.routeComparison.placeSearch.destination.label,
                )}
                accessibilityLabel={ES.routeComparison.changeButton(
                  ES.routeComparison.placeSearch.destination.label,
                )}
                label={ES.routeComparison.changeShortButton}
                onPress={onChangeDestination}
                variant="link"
              />
            </View>
          </View>

          {!canCompare && (
            <Callout
              accessibilityLiveRegion="assertive"
              role="alert"
              text={ES.routeComparison.samePlaceError}
              tone="danger"
            />
          )}
          {onEditPreferences && (
            <PrimaryButton
              accessibilityHint={ES.routeComparison.editPreferencesHint}
              icon="gear"
              label={ES.routeComparison.editPreferencesButton}
              onPress={onEditPreferences}
              variant="secondary"
            />
          )}
        </View>
      )}

      {step === 'profile' && (
        <View style={styles.section}>
          <View
            accessibilityLabel={ES.routeComparison.profileGroupLabel}
            accessibilityRole="radiogroup"
            style={styles.section}
          >
            {PROFILE_IDS.map((profileId) => {
              const profileCopy = ES.routeComparison.profiles[profileId];
              return (
                <ProfileOption
                  description={profileCopy.description}
                  hint={profileCopy.hint}
                  key={profileId}
                  label={profileCopy.label}
                  onPress={() => onSelectProfile(profileId)}
                  selected={selectedProfileId === profileId}
                />
              );
            })}
          </View>
        </View>
      )}

      {step === 'learning' && (
        <View style={styles.section}>
          <AdaptivePreferencesPanel
            learningState={adaptive.learningState}
            onReset={adaptive.reset}
            onSetEnabled={adaptive.setEnabled}
            recoveredFromInvalidData={adaptive.recoveredFromInvalidData}
            status={adaptive.status}
          />
        </View>
      )}

      {loading && (
        <View
          accessible
          accessibilityLanguage="es-ES"
          accessibilityLabel={ES.routeComparison.loading}
          accessibilityLiveRegion="polite"
          accessibilityRole="progressbar"
          accessibilityState={{ busy: true }}
          style={styles.loading}
        >
          <ActivityIndicator color={colors.brandInk} size="large" />
          <AccessibleText
            accessible={false}
            style={styles.loadingText}
            variant="body"
          >
            {ES.routeComparison.loading}
          </AccessibleText>
        </View>
      )}

      {comparisonStatus === 'error' && errorCode && (
        <>
          <Callout
            accessibilityLiveRegion="assertive"
            role="alert"
            text={ES.routeComparison.errors[errorCode]}
            title={ES.routeComparison.errorTitle}
            tone="danger"
          />
          <PrimaryButton
            accessibilityHint={ES.routeComparison.retryHint}
            icon="arrowsClockwise"
            label={ES.routeComparison.retryButton}
            onPress={onCompare}
            variant="secondary"
          />
        </>
      )}

      <AccessibleText style={styles.disclaimer} variant="meta">
        {ES.routeComparison.disclaimer}
      </AccessibleText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  disclaimer: {
    color: colors.inkSubtle,
  },
  hero: {
    gap: spacing.sm,
  },
  loading: {
    alignItems: 'center',
    backgroundColor: colors.brandSoft,
    borderRadius: 20,
    gap: spacing.md,
    padding: spacing.xxl,
  },
  loadingText: {
    color: colors.brandOnSoft,
    textAlign: 'center',
  },
  muted: {
    color: colors.inkMuted,
  },
  endpoint: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 68,
    paddingVertical: spacing.md,
  },
  endpointLabel: {
    color: colors.brandInk,
  },
  endpoints: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  endpointCopy: {
    flex: 1,
    gap: 2,
  },
  section: {
    gap: spacing.lg,
  },
});

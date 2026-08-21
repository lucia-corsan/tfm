import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { NavigationManeuver, NavigationSession } from '@/api/types';
import { AccessibleText } from '@/components/AccessibleText';
import { Callout } from '@/components/Callout';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { Icon, type IconName } from '@/components/icons';
import { InstructionAccessibilityEvent } from '@/components/InstructionAccessibilityEvent';
import { ActionBand } from '@/components/ActionBand';
import { PrimaryButton } from '@/components/PrimaryButton';
import { RerouteNoticeScreen } from '@/screens/RerouteNoticeScreen';
import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { useManualNavigation } from '@/features/navigation/useManualNavigation';
import {
  DEFAULT_SPEECH_PREFERENCES,
  getSpeechRate,
  type SpeechPreferences,
} from '@/features/speech/speechPreferences';
import { useInstructionSpeech } from '@/features/speech/useInstructionSpeech';
import { useScreenReaderStatus } from '@/features/speech/useScreenReaderStatus';
import {
  type RerouteRoutesFunction,
  useRouteRerouting,
} from '@/features/navigation/useRouteRerouting';
import { useForegroundRouteTracking } from '@/features/location/useForegroundRouteTracking';
import {
  formatDistance,
  formatDuration,
} from '@/features/route-comparison/presenters';
import { radii, spacing, usePresentation } from '@/theme';
import { ES } from '../../i18n/es';

interface NavigationScreenProps {
  initialSpeechPreferences?: SpeechPreferences;
  onFinish: () => void;
  onOpenSettings?: () => void;
  reroute?: RerouteRoutesFunction;
  session: NavigationSession;
}

/** Icono orientativo de cada maniobra; el texto sigue siendo la fuente única. */
const maneuverIcons: Record<NavigationManeuver, IconName> = {
  arrive: 'flagCheckered',
  continue_straight: 'arrowRight',
  depart: 'personSimpleWalk',
  enter_roundabout: 'arrowsClockwise',
  exit_roundabout: 'arrowsClockwise',
  keep_left: 'arrowLeft',
  keep_right: 'arrowRight',
  turn_left: 'arrowLeft',
  turn_right: 'arrowRight',
  turn_sharp_left: 'arrowLeft',
  turn_sharp_right: 'arrowRight',
  turn_slight_left: 'arrowLeft',
  turn_slight_right: 'arrowRight',
  u_turn: 'arrowsClockwise',
};

export function NavigationScreen({
  initialSpeechPreferences = DEFAULT_SPEECH_PREFERENCES,
  onFinish,
  onOpenSettings,
  reroute,
  session,
}: NavigationScreenProps) {
  const presentation = usePresentation();
  const [route, setRoute] = useState(session.route);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [detailExpanded, setDetailExpanded] = useState(false);
  const speechPreferences = initialSpeechPreferences;
  const screenMounted = useRef(true);
  const controller = useManualNavigation(route);
  const rerouting = useRouteRerouting(reroute);
  const tracking = useForegroundRouteTracking(
    route.geometry,
    controller.handleReliableLocation,
    gpsEnabled,
  );
  const instruction = controller.currentInstruction;
  const screenReaderStatus = useScreenReaderStatus();
  const instructionSpeech = useInstructionSpeech({
    automaticPlayback:
      speechPreferences.enabled && speechPreferences.automaticPlayback,
    instructionKey: `${route.route_id}:${instruction.sequence}`,
    rate: getSpeechRate(speechPreferences.rateId),
    screenReaderEnabled: screenReaderStatus !== 'disabled',
    text: instruction.text,
  });
  const unknownCount = route.warnings.filter(
    (warning) => warning.state === 'unknown',
  ).length;
  const unfavorableCount = route.warnings.filter(
    (warning) => warning.state === 'unfavorable',
  ).length;

  useEffect(
    () => () => {
      screenMounted.current = false;
    },
    [],
  );

  /**
   * El aviso ocupa la pantalla solo mientras la decisión sigue pendiente. El
   * cálculo, el resultado y el error se muestran ya sobre la navegación, con la
   * ruta anterior visible.
   */
  const confirmationVisible =
    tracking.status === 'confirmation_required' &&
    rerouting.state.status === 'idle';

  const keepCurrentRoute = () => {
    rerouting.reset();
    tracking.resetDeviationEvidence();
  };

  const recalculateRoute = async () => {
    const currentPosition = tracking.latestReliablePosition;
    if (currentPosition === null) {
      tracking.resetDeviationEvidence();
      return;
    }
    tracking.pauseForReroute();
    const replacement = await rerouting.recalculate({
      current_position: currentPosition,
      destination: session.destination,
      ...(session.effective_weights
        ? { effective_weights: session.effective_weights }
        : {}),
      profile: session.profile,
    });
    if (!screenMounted.current) {
      return;
    }
    if (replacement === null) {
      tracking.resetDeviationEvidence();
      return;
    }
    setRoute(replacement);
    controller.resetToFirstInstruction();
    tracking.startRerouteCooldown();
  };

  if (confirmationVisible) {
    return (
      <RerouteNoticeScreen
        onConfirm={() => void recalculateRoute()}
        onKeepCurrentRoute={keepCurrentRoute}
        {...(onOpenSettings ? { onOpenSettings } : {})}
        routeName={route.name}
      />
    );
  }

  return (
    <>
      <Screen
        band={
          <ActionBand
            accessibilityHint={
              controller.canGoNext
                ? ES.navigation.nextHint
                : ES.navigation.finishHint
            }
            label={
              controller.canGoNext
                ? ES.navigation.nextButton
                : ES.navigation.finishButton
            }
            onPress={controller.canGoNext ? controller.goNext : onFinish}
          />
        }
        header={
          <TopBar
            {...(onOpenSettings
              ? {
                  actionHint: ES.settings.openHint,
                  actionLabel: ES.settings.openButton,
                  onAction: onOpenSettings,
                }
              : {})}
            title={ES.navigation.title}
          />
        }
      >
        <AccessibleText
          style={{ color: presentation.colors.inkSubtle }}
          variant="meta"
        >
          {ES.navigation.routeLabel(route.name)}
        </AccessibleText>
        {session.learning_feedback && (
          <Callout
            accessibilityLiveRegion="polite"
            role="alert"
            text={session.learning_feedback}
            tone="positive"
          />
        )}

        <View
          style={[
            styles.instruction,
            { backgroundColor: presentation.colors.brandSoft },
          ]}
        >
          <View style={styles.instructionTop}>
            <Icon
              color={presentation.colors.brandInk}
              name={maneuverIcons[instruction.maneuver]}
              size={30}
            />
            <AccessibleText
              style={[
                styles.progress,
                { color: presentation.colors.brandOnSoft },
              ]}
              variant="emphasis"
            >
              {ES.navigation.progress(
                controller.currentIndex + 1,
                controller.totalInstructions,
              )}
            </AccessibleText>
          </View>
          <AccessibleText
            accessibilityLiveRegion={
              screenReaderStatus === 'enabled' ? 'polite' : 'none'
            }
            variant="instruction"
          >
            {instruction.text}
          </AccessibleText>
          {instruction.street_name && (
            <AccessibleText
              style={{ color: presentation.colors.inkMuted }}
              variant="body"
            >
              {ES.navigation.streetLabel(instruction.street_name)}
            </AccessibleText>
          )}
          <View style={styles.chips}>
            <Chip
              icon="ruler"
              label={`${ES.navigation.stepDistance}: ${formatDistance(instruction.distance_m)}.`}
            />
            <Chip
              icon="clock"
              label={`${ES.navigation.stepDuration}: ${formatDuration(instruction.duration_s)}.`}
            />
          </View>

          {speechPreferences.enabled && screenReaderStatus === 'disabled' ? (
            <PrimaryButton
              accessibilityHint={
                instructionSpeech.isSpeaking
                  ? ES.navigation.speech.stopHint
                  : ES.navigation.speech.listenHint
              }
              icon={instructionSpeech.isSpeaking ? 'stop' : 'speakerHigh'}
              label={
                instructionSpeech.isSpeaking
                  ? ES.navigation.speech.stopButton
                  : speechPreferences.automaticPlayback
                    ? ES.navigation.speech.repeatButton
                    : ES.navigation.speech.listenButton
              }
              onPress={() =>
                void (instructionSpeech.isSpeaking
                  ? instructionSpeech.stop()
                  : instructionSpeech.speak())
              }
              variant="secondary"
            />
          ) : null}

          {instructionSpeech.error ? (
            <Callout
              accessibilityLiveRegion="assertive"
              role="alert"
              text={ES.navigation.speech.error}
              tone="danger"
            />
          ) : null}

          <PrimaryButton
            accessibilityHint={ES.navigation.stepDetailsHint}
            expanded={detailExpanded}
            icon={detailExpanded ? 'caretUp' : 'caretDown'}
            label={
              detailExpanded
                ? ES.routeComparison.detailsCloseButton
                : ES.routeComparison.detailsButton
            }
            onPress={() => setDetailExpanded(!detailExpanded)}
            variant="quiet"
          />

          {detailExpanded && (
            <View
              style={[
                styles.detail,
                { borderTopColor: presentation.colors.border },
              ]}
            >
              <AccessibleText accessibilityRole="header" variant="subheading">
                {ES.navigation.instructionAccessibilityTitle}
              </AccessibleText>
              {instruction.accessibility_events.length === 0 ? (
                <AccessibleText
                  style={{ color: presentation.colors.inkMuted }}
                  variant="body"
                >
                  {ES.navigation.noInstructionAccessibilityEvents}
                </AccessibleText>
              ) : (
                instruction.accessibility_events.map((event) => (
                  <InstructionAccessibilityEvent
                    event={event}
                    key={event.sequence}
                  />
                ))
              )}

              <AccessibleText accessibilityRole="header" variant="subheading">
                {ES.navigation.routeContextTitle}
              </AccessibleText>
              {unknownCount === 0 && unfavorableCount === 0 ? (
                <AccessibleText
                  style={{ color: presentation.colors.inkMuted }}
                  variant="body"
                >
                  {ES.navigation.noWarnings}
                </AccessibleText>
              ) : (
                <>
                  {unknownCount > 0 && (
                    <AccessibleText
                      style={{ color: presentation.colors.inkMuted }}
                      variant="body"
                    >
                      {ES.navigation.unknownSummary(unknownCount)}
                    </AccessibleText>
                  )}
                  {unfavorableCount > 0 && (
                    <AccessibleText
                      style={{ color: presentation.colors.inkMuted }}
                      variant="body"
                    >
                      {ES.navigation.unfavorableSummary(unfavorableCount)}
                    </AccessibleText>
                  )}
                </>
              )}
              <AccessibleText
                style={{ color: presentation.colors.inkSubtle }}
                variant="meta"
              >
                {ES.navigation.disclaimer}
              </AccessibleText>

            <Card>
              <View style={styles.titleRow}>
                <Icon
                  color={presentation.colors.brandInk}
                  name="crosshair"
                  size={24}
                />
                <AccessibleText accessibilityRole="header" variant="section">
                  {ES.navigation.gpsTitle}
                </AccessibleText>
              </View>
              <AccessibleText
                accessibilityLiveRegion="polite"
                style={{ color: presentation.colors.inkMuted }}
                variant="body"
              >
                {ES.navigation.gpsStatus[tracking.status]}
              </AccessibleText>
              {!gpsEnabled && (
                <PrimaryButton
                  accessibilityHint={ES.navigation.activateGpsHint}
                  icon="navigationArrow"
                  label={ES.navigation.activateGpsButton}
                  onPress={() => setGpsEnabled(true)}
                  variant="secondary"
                />
              )}
            </Card>

            </View>
          )}
        </View>

        <PrimaryButton
          accessibilityHint={ES.navigation.previousHint}
          disabled={!controller.canGoPrevious}
          icon="arrowLeft"
          label={ES.navigation.previousButton}
          onPress={controller.goPrevious}
          variant="secondary"
        />

        {rerouting.state.status === 'loading' && (
          <View
            accessible
            accessibilityLanguage="es-ES"
            accessibilityLabel={ES.navigation.reroutingLoading}
            accessibilityLiveRegion="assertive"
            accessibilityRole="progressbar"
            accessibilityState={{ busy: true }}
            style={[
              styles.rerouting,
              { backgroundColor: presentation.colors.brandSoft },
            ]}
          >
            <ActivityIndicator
              color={presentation.colors.brandInk}
              size="large"
            />
            <AccessibleText
              accessible={false}
              style={[
                styles.reroutingText,
                { color: presentation.colors.brandOnSoft },
              ]}
              variant="body"
            >
              {ES.navigation.reroutingLoading}
            </AccessibleText>
          </View>
        )}

        {rerouting.state.status === 'success' && (
          <Callout
            accessibilityLiveRegion="assertive"
            role="alert"
            text={ES.navigation.reroutingSuccess}
            tone="positive"
          />
        )}

        {rerouting.state.status === 'error' && (
          <View style={styles.section}>
            <Callout
              accessibilityLiveRegion="assertive"
              role="alert"
              text={ES.navigation.reroutingErrors[rerouting.state.code]}
              title={ES.navigation.reroutingErrorTitle}
              tone="danger"
            />
            <PrimaryButton
              accessibilityHint={ES.navigation.retryRerouteHint}
              icon="arrowsClockwise"
              label={ES.navigation.retryRerouteButton}
              onPress={() => void recalculateRoute()}
              variant="secondary"
            />
          </View>
        )}


      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  detail: {
    borderTopWidth: 1,
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  instruction: {
    borderRadius: radii.large,
    gap: spacing.md,
    padding: spacing.xxl,
  },
  instructionTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  progress: {
    flex: 1,
  },
  rerouting: {
    alignItems: 'center',
    borderRadius: radii.card,
    gap: spacing.md,
    padding: spacing.xl,
  },
  reroutingText: {
    flex: 1,
  },
  section: {
    gap: spacing.md,
  },
  stepControls: {
    gap: spacing.md,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
});

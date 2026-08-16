import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { NavigationSession } from '@/api/types';
import { AccessibleText } from '@/components/AccessibleText';
import { InstructionAccessibilityEvent } from '@/components/InstructionAccessibilityEvent';
import { PrimaryButton } from '@/components/PrimaryButton';
import { RerouteConfirmationDialog } from '@/components/RerouteConfirmationDialog';
import { useManualNavigation } from '@/features/navigation/useManualNavigation';
import {
  type RerouteRoutesFunction,
  useRouteRerouting,
} from '@/features/navigation/useRouteRerouting';
import { useForegroundRouteTracking } from '@/features/location/useForegroundRouteTracking';
import {
  formatDistance,
  formatDuration,
} from '@/features/route-comparison/presenters';
import { ES } from '../../i18n/es';

interface NavigationScreenProps {
  onFinish: () => void;
  reroute?: RerouteRoutesFunction;
  session: NavigationSession;
}

export function NavigationScreen({
  onFinish,
  reroute,
  session,
}: NavigationScreenProps) {
  const [route, setRoute] = useState(session.route);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const screenMounted = useRef(true);
  const controller = useManualNavigation(route);
  const rerouting = useRouteRerouting(reroute);
  const tracking = useForegroundRouteTracking(
    route.geometry,
    controller.handleReliableLocation,
    gpsEnabled,
  );
  const instruction = controller.currentInstruction;
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
  const confirmationVisible =
    tracking.status === 'confirmation_required' &&
    rerouting.state.status !== 'loading';

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <RerouteConfirmationDialog
        onConfirm={() => void recalculateRoute()}
        onKeepCurrentRoute={keepCurrentRoute}
        visible={confirmationVisible}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <AccessibleText style={styles.eyebrow}>
          {ES.navigation.eyebrow}
        </AccessibleText>
        <AccessibleText accessibilityRole="header" style={styles.title}>
          {ES.navigation.title}
        </AccessibleText>
        <AccessibleText style={styles.routeName}>
          {ES.navigation.routeLabel(route.name)}
        </AccessibleText>
        <AccessibleText style={styles.manualNotice}>
          {ES.navigation.manualMode}
        </AccessibleText>

        <View style={styles.gpsCard}>
          <AccessibleText accessibilityRole="header" style={styles.sectionTitle}>
            {ES.navigation.gpsTitle}
          </AccessibleText>
          <AccessibleText accessibilityLiveRegion="polite" style={styles.detail}>
            {ES.navigation.gpsStatus[tracking.status]}
          </AccessibleText>
          {!gpsEnabled && (
            <PrimaryButton
              accessibilityHint={ES.navigation.activateGpsHint}
              label={ES.navigation.activateGpsButton}
              onPress={() => setGpsEnabled(true)}
            />
          )}
        </View>

        {rerouting.state.status === 'loading' && (
          <View
            accessible
            accessibilityLanguage="es-ES"
            accessibilityLabel={ES.navigation.reroutingLoading}
            accessibilityLiveRegion="assertive"
            accessibilityRole="progressbar"
            accessibilityState={{ busy: true }}
            style={styles.reroutingCard}
          >
            <ActivityIndicator color="#5B3FC4" size="large" />
            <AccessibleText style={styles.detail}>
              {ES.navigation.reroutingLoading}
            </AccessibleText>
          </View>
        )}

        {rerouting.state.status === 'success' && (
          <AccessibleText
            accessibilityLiveRegion="assertive"
            accessibilityRole="alert"
            style={styles.successCard}
          >
            {ES.navigation.reroutingSuccess}
          </AccessibleText>
        )}

        {rerouting.state.status === 'error' && (
          <View style={styles.errorCard}>
            <View
              accessible
              accessibilityLanguage="es-ES"
              accessibilityLabel={`${ES.navigation.reroutingErrorTitle}. ${ES.navigation.reroutingErrors[rerouting.state.code]}`}
              accessibilityLiveRegion="assertive"
              accessibilityRole="alert"
            >
              <AccessibleText accessibilityRole="header" style={styles.sectionTitle}>
                {ES.navigation.reroutingErrorTitle}
              </AccessibleText>
              <AccessibleText style={styles.detail}>
                {ES.navigation.reroutingErrors[rerouting.state.code]}
              </AccessibleText>
            </View>
            <PrimaryButton
              accessibilityHint={ES.navigation.retryRerouteHint}
              label={ES.navigation.retryRerouteButton}
              onPress={() => void recalculateRoute()}
            />
          </View>
        )}

        <AccessibleText
          accessibilityLiveRegion="polite"
          style={styles.progress}
        >
          {ES.navigation.progress(
            controller.currentIndex + 1,
            controller.totalInstructions,
          )}
        </AccessibleText>

        <View style={styles.instructionCard}>
          <AccessibleText accessibilityRole="header" style={styles.sectionTitle}>
            {ES.navigation.currentInstructionTitle}
          </AccessibleText>
          <AccessibleText
            accessibilityLiveRegion="polite"
            style={styles.instructionText}
          >
            {instruction.text}
          </AccessibleText>
          {instruction.street_name && (
            <AccessibleText style={styles.detail}>
              {ES.navigation.streetLabel(instruction.street_name)}
            </AccessibleText>
          )}
          <AccessibleText style={styles.detail}>
            {ES.navigation.stepDistance}: {formatDistance(instruction.distance_m)}.
          </AccessibleText>
          <AccessibleText style={styles.detail}>
            {ES.navigation.stepDuration}: {formatDuration(instruction.duration_s)}.
          </AccessibleText>
          <View style={styles.accessibilityContext}>
            <AccessibleText accessibilityRole="header" style={styles.contextTitle}>
              {ES.navigation.instructionAccessibilityTitle}
            </AccessibleText>
            {instruction.accessibility_events.length === 0 ? (
              <AccessibleText style={styles.detail}>
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
          </View>
        </View>

        <View style={styles.controls}>
          <PrimaryButton
            accessibilityHint={ES.navigation.previousHint}
            disabled={!controller.canGoPrevious}
            label={ES.navigation.previousButton}
            onPress={controller.goPrevious}
          />
          <PrimaryButton
            accessibilityHint={ES.navigation.nextHint}
            disabled={!controller.canGoNext}
            label={ES.navigation.nextButton}
            onPress={controller.goNext}
          />
        </View>

        <View style={styles.contextCard}>
          <AccessibleText accessibilityRole="header" style={styles.sectionTitle}>
            {ES.navigation.routeContextTitle}
          </AccessibleText>
          {unknownCount === 0 && unfavorableCount === 0 ? (
            <AccessibleText style={styles.detail}>
              {ES.navigation.noWarnings}
            </AccessibleText>
          ) : (
            <>
              {unknownCount > 0 && (
                <AccessibleText style={styles.detail}>
                  {ES.navigation.unknownSummary(unknownCount)}
                </AccessibleText>
              )}
              {unfavorableCount > 0 && (
                <AccessibleText style={styles.detail}>
                  {ES.navigation.unfavorableSummary(unfavorableCount)}
                </AccessibleText>
              )}
            </>
          )}
          <AccessibleText style={styles.disclaimer}>
            {ES.navigation.disclaimer}
          </AccessibleText>
        </View>

        <PrimaryButton
          accessibilityHint={ES.navigation.finishHint}
          label={ES.navigation.finishButton}
          onPress={onFinish}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  accessibilityContext: {
    gap: 12,
    marginTop: 6,
  },
  content: {
    gap: 18,
    marginHorizontal: 'auto',
    maxWidth: 680,
    paddingHorizontal: 20,
    paddingVertical: 28,
    width: '100%',
  },
  contextCard: {
    backgroundColor: '#FFF4DC',
    borderColor: '#E4BC65',
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  contextTitle: {
    color: '#17213A',
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
  },
  controls: {
    gap: 12,
  },
  detail: {
    color: '#343B50',
    fontSize: 16,
    lineHeight: 24,
  },
  errorCard: {
    backgroundColor: '#FFF1F1',
    borderColor: '#D99090',
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  disclaimer: {
    color: '#533B0C',
    fontSize: 15,
    lineHeight: 22,
  },
  eyebrow: {
    color: '#5B3FC4',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  instructionCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#7A5BD1',
    borderRadius: 20,
    borderWidth: 2,
    gap: 12,
    padding: 22,
  },
  gpsCard: {
    backgroundColor: '#E7F4EE',
    borderColor: '#69B693',
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  instructionText: {
    color: '#17213A',
    fontSize: 23,
    fontWeight: '800',
    lineHeight: 31,
  },
  manualNotice: {
    backgroundColor: '#ECE8FA',
    borderRadius: 14,
    color: '#3E277F',
    fontSize: 15,
    lineHeight: 22,
    overflow: 'hidden',
    padding: 14,
  },
  progress: {
    color: '#5B3FC4',
    fontSize: 17,
    fontWeight: '700',
  },
  reroutingCard: {
    alignItems: 'center',
    backgroundColor: '#F3F0FC',
    borderRadius: 16,
    gap: 12,
    padding: 18,
  },
  routeName: {
    color: '#3F465A',
    fontSize: 17,
    lineHeight: 25,
  },
  successCard: {
    backgroundColor: '#E5F4EC',
    borderColor: '#69B693',
    borderRadius: 16,
    borderWidth: 1,
    color: '#1E5035',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
    padding: 18,
  },
  safeArea: {
    backgroundColor: '#F7F5FB',
    flex: 1,
  },
  sectionTitle: {
    color: '#17213A',
    fontSize: 18,
    fontWeight: '700',
  },
  title: {
    color: '#17213A',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 39,
  },
});

import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ComparedRoute } from '@/api/types';
import { AccessibleText } from '@/components/AccessibleText';
import { InstructionAccessibilityEvent } from '@/components/InstructionAccessibilityEvent';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useManualNavigation } from '@/features/navigation/useManualNavigation';
import { useForegroundRouteTracking } from '@/features/location/useForegroundRouteTracking';
import {
  formatDistance,
  formatDuration,
} from '@/features/route-comparison/presenters';
import { ES } from '../../i18n/es';

interface NavigationScreenProps {
  onFinish: () => void;
  route: ComparedRoute;
}

export function NavigationScreen({ onFinish, route }: NavigationScreenProps) {
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const controller = useManualNavigation(route);
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

  return (
    <SafeAreaView style={styles.safeArea}>
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
  routeName: {
    color: '#3F465A',
    fontSize: 17,
    lineHeight: 25,
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

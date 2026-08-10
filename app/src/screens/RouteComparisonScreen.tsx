import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ProfileOption } from '@/components/ProfileOption';
import { RejectedRouteCard } from '@/components/RejectedRouteCard';
import { RouteCard } from '@/components/RouteCard';
import type { DemoProfileId } from '@/features/route-comparison/profiles';
import {
  type CompareRoutesFunction,
  useRouteComparison,
} from '@/features/route-comparison/useRouteComparison';
import { ES } from '../../i18n/es';

interface RouteComparisonScreenProps {
  compare?: CompareRoutesFunction;
}

const PROFILE_IDS: DemoProfileId[] = [
  'balanced_demo',
  'simpler_crossings_demo',
];

export function RouteComparisonScreen({ compare }: RouteComparisonScreenProps) {
  const controller = useRouteComparison(compare);
  const { state } = controller;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>{ES.routeComparison.eyebrow}</Text>
          <Text accessibilityRole="header" style={styles.title}>
            {ES.routeComparison.title}
          </Text>
          <Text style={styles.description}>{ES.routeComparison.description}</Text>
        </View>

        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {ES.routeComparison.profileSectionTitle}
        </Text>
        <View
          accessibilityLabel={ES.routeComparison.profileGroupLabel}
          accessibilityRole="radiogroup"
          style={styles.profileGroup}
        >
          {PROFILE_IDS.map((profileId) => {
            const copy = ES.routeComparison.profiles[profileId];
            return (
              <ProfileOption
                description={copy.description}
                hint={copy.hint}
                key={profileId}
                label={copy.label}
                onPress={() => controller.selectProfile(profileId)}
                selected={controller.selectedProfileId === profileId}
              />
            );
          })}
        </View>

        <PrimaryButton
          accessibilityHint={ES.routeComparison.compareHint}
          disabled={state.status === 'loading'}
          label={
            state.status === 'loading'
              ? ES.routeComparison.loadingButton
              : ES.routeComparison.compareButton
          }
          onPress={() => void controller.compareSelectedProfile()}
        />

        {state.status === 'idle' && (
          <View accessible style={styles.infoCard}>
            <Text style={styles.infoTitle}>{ES.routeComparison.idleTitle}</Text>
            <Text style={styles.infoText}>{ES.routeComparison.idleDescription}</Text>
          </View>
        )}

        {state.status === 'loading' && (
          <View
            accessible
            accessibilityLabel={ES.routeComparison.loading}
            accessibilityLiveRegion="polite"
            accessibilityRole="progressbar"
            accessibilityState={{ busy: true }}
            style={styles.loading}
          >
            <ActivityIndicator color="#5B3FC4" size="large" />
            <Text style={styles.infoText}>{ES.routeComparison.loading}</Text>
          </View>
        )}

        {state.status === 'error' && (
          <View style={styles.errorCard}>
            <View
              accessible
              accessibilityLabel={`${ES.routeComparison.errorTitle}. ${ES.routeComparison.errors[state.code]}`}
              accessibilityLiveRegion="assertive"
              accessibilityRole="alert"
              style={styles.errorCopy}
            >
              <Text style={styles.errorTitle}>{ES.routeComparison.errorTitle}</Text>
              <Text style={styles.errorText}>
                {ES.routeComparison.errors[state.code]}
              </Text>
            </View>
            <PrimaryButton
              accessibilityHint={ES.routeComparison.retryHint}
              label={ES.routeComparison.retryButton}
              onPress={() => void controller.compareSelectedProfile()}
            />
          </View>
        )}

        {state.status === 'success' && (
          <View style={styles.results}>
            <Text
              accessibilityLiveRegion="polite"
              style={styles.resultSummary}
            >
              {ES.routeComparison.resultSummary(
                state.response.routes.length,
                state.response.rejected_routes.length,
              )}
            </Text>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              {ES.routeComparison.resultTitle}
            </Text>
            <Text style={styles.infoText}>
              {ES.routeComparison.resultIntroduction}
            </Text>
            {state.response.routes.map((route) => (
              <RouteCard key={route.route_id} route={route} />
            ))}

            {state.response.rejected_routes.length > 0 && (
              <View style={styles.rejectedSection}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  {ES.routeComparison.rejectedTitle}
                </Text>
                <Text style={styles.infoText}>
                  {ES.routeComparison.rejectedDescription}
                </Text>
                {state.response.rejected_routes.map((route) => (
                  <RejectedRouteCard key={route.route_id} route={route} />
                ))}
              </View>
            )}
          </View>
        )}

        <Text style={styles.disclaimer}>{ES.routeComparison.disclaimer}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 22,
    marginHorizontal: 'auto',
    maxWidth: 680,
    paddingHorizontal: 20,
    paddingVertical: 28,
    width: '100%',
  },
  description: {
    color: '#3F465A',
    fontSize: 17,
    lineHeight: 25,
  },
  disclaimer: {
    borderTopColor: '#D8D3E2',
    borderTopWidth: 1,
    color: '#555B6D',
    fontSize: 14,
    lineHeight: 21,
    paddingTop: 18,
  },
  errorCard: {
    backgroundColor: '#FFF1F1',
    borderColor: '#D99090',
    borderRadius: 18,
    borderWidth: 1,
    gap: 16,
    padding: 18,
  },
  errorCopy: {
    gap: 7,
  },
  errorText: {
    color: '#5C2626',
    fontSize: 15,
    lineHeight: 22,
  },
  errorTitle: {
    color: '#441818',
    fontSize: 18,
    fontWeight: '800',
  },
  eyebrow: {
    color: '#5B3FC4',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  hero: {
    gap: 12,
  },
  infoCard: {
    backgroundColor: '#ECE8FA',
    borderColor: '#C6BCEB',
    borderRadius: 16,
    borderWidth: 1,
    gap: 7,
    padding: 18,
  },
  infoText: {
    color: '#454B5E',
    fontSize: 15,
    lineHeight: 22,
  },
  infoTitle: {
    color: '#252B3C',
    fontSize: 17,
    fontWeight: '700',
  },
  loading: {
    alignItems: 'center',
    backgroundColor: '#F3F0FC',
    borderRadius: 16,
    gap: 12,
    padding: 22,
  },
  profileGroup: {
    gap: 12,
  },
  rejectedSection: {
    gap: 12,
    marginTop: 8,
  },
  results: {
    gap: 16,
  },
  resultSummary: {
    backgroundColor: '#E5F4EC',
    borderColor: '#91BFA5',
    borderRadius: 14,
    borderWidth: 1,
    color: '#1E5035',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    padding: 14,
  },
  safeArea: {
    backgroundColor: '#FAF9FD',
    flex: 1,
  },
  sectionTitle: {
    color: '#17213A',
    fontSize: 21,
    fontWeight: '800',
    lineHeight: 27,
  },
  title: {
    color: '#17213A',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 41,
  },
});

import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ES } from '../../i18n/es';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StatusCard } from '@/components/StatusCard';

export function WelcomeScreen() {
  const [detailsVisible, setDetailsVisible] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>{ES.welcome.eyebrow}</Text>
          <Text accessibilityRole="header" style={styles.title}>
            {ES.welcome.title}
          </Text>
          <Text style={styles.description}>{ES.welcome.description}</Text>
        </View>

        <StatusCard
          description={ES.welcome.statusDescription}
          title={ES.welcome.statusTitle}
        />

        <PrimaryButton
          accessibilityHint={ES.welcome.detailsHint}
          expanded={detailsVisible}
          label={ES.welcome.detailsButton}
          onPress={() => setDetailsVisible((current) => !current)}
        />

        {detailsVisible && (
          <View accessibilityLiveRegion="polite" style={styles.details}>
            <Text style={styles.detailsText}>{ES.welcome.details}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    gap: 24,
    justifyContent: 'center',
    marginHorizontal: 'auto',
    maxWidth: 560,
    paddingHorizontal: 24,
    paddingVertical: 32,
    width: '100%',
  },
  description: {
    color: '#343B50',
    fontSize: 18,
    lineHeight: 27,
  },
  details: {
    borderLeftColor: '#5B3FC4',
    borderLeftWidth: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  detailsText: {
    color: '#17213A',
    fontSize: 16,
    lineHeight: 24,
  },
  eyebrow: {
    color: '#5B3FC4',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  hero: {
    gap: 14,
  },
  safeArea: {
    backgroundColor: '#F8F7FC',
    flex: 1,
  },
  title: {
    color: '#17213A',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 41,
  },
});

import { StyleSheet, View } from 'react-native';

import type { NavigationAccessibilityEvent } from '@/api/types';
import { AccessibleText } from '@/components/AccessibleText';
import { formatDistance } from '@/features/route-comparison/presenters';
import { ES } from '../../i18n/es';

interface InstructionAccessibilityEventProps {
  event: NavigationAccessibilityEvent;
}

/** Shows one OSM event as separate TalkBack reading stops. */
export function InstructionAccessibilityEvent({
  event,
}: InstructionAccessibilityEventProps) {
  return (
    <View style={styles.eventCard}>
      <AccessibleText style={styles.eventTitle}>{event.text}</AccessibleText>
      <AccessibleText style={styles.eventDistance}>
        {ES.navigation.accessibilityEventDistance(
          formatDistance(event.distance_from_instruction_start_m),
        )}
      </AccessibleText>
      {event.details.map((detail) => (
        <View
          key={detail.attribute}
          style={[
            styles.detailCard,
            detail.state === 'unfavorable' && styles.unfavorableDetail,
            detail.state === 'unknown' && styles.unknownDetail,
          ]}
        >
          <AccessibleText style={styles.stateLabel}>
            {ES.navigation.evidenceStates[detail.state]}
          </AccessibleText>
          <AccessibleText style={styles.detailText}>{detail.text}</AccessibleText>
        </View>
      ))}
      <AccessibleText style={styles.source}>
        {ES.navigation.accessibilitySource}
      </AccessibleText>
    </View>
  );
}

const styles = StyleSheet.create({
  detailCard: {
    backgroundColor: '#E7F5EC',
    borderColor: '#65A67D',
    borderLeftWidth: 4,
    borderRadius: 10,
    gap: 3,
    padding: 12,
  },
  detailText: {
    color: '#17213A',
    fontSize: 16,
    lineHeight: 24,
  },
  eventCard: {
    backgroundColor: '#F7F5FB',
    borderColor: '#C8BBEA',
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  eventDistance: {
    color: '#4B5268',
    fontSize: 15,
    lineHeight: 22,
  },
  eventTitle: {
    color: '#2E1A69',
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
  },
  source: {
    color: '#596076',
    fontSize: 14,
    lineHeight: 20,
  },
  stateLabel: {
    color: '#343B50',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    textTransform: 'uppercase',
  },
  unfavorableDetail: {
    backgroundColor: '#FFF0E4',
    borderColor: '#B45B2A',
  },
  unknownDetail: {
    backgroundColor: '#FFF4DC',
    borderColor: '#A97818',
  },
});

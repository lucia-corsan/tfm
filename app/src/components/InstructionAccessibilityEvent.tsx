import { StyleSheet, View } from 'react-native';

import type {
  EvidenceState,
  NavigationAccessibilityEvent,
} from '@/api/types';
import { AccessibleText } from '@/components/AccessibleText';
import { Icon, type IconName } from '@/components/icons';
import { formatDistance } from '@/features/route-comparison/presenters';
import { radii, spacing, usePresentation } from '@/theme';
import { ES } from '../../i18n/es';

interface InstructionAccessibilityEventProps {
  event: NavigationAccessibilityEvent;
}

const stateIcons: Record<EvidenceState, IconName> = {
  favorable: 'checkCircle',
  unfavorable: 'warning',
  unknown: 'sealQuestion',
};

/** Muestra un evento de OpenStreetMap como paradas de lectura separadas. */
export function InstructionAccessibilityEvent({
  event,
}: InstructionAccessibilityEventProps) {
  const presentation = usePresentation();
  const stateColors: Record<EvidenceState, string> = {
    favorable: presentation.colors.positiveOnSoft,
    unfavorable: presentation.colors.cautionOnSoft,
    unknown: presentation.colors.unknownOnSoft,
  };
  const stateBackgrounds: Record<EvidenceState, string> = {
    favorable: presentation.colors.positiveSoft,
    unfavorable: presentation.colors.cautionSoft,
    unknown: presentation.colors.unknownSoft,
  };

  return (
    <View
      style={[
        styles.event,
        { borderLeftColor: presentation.colors.border },
      ]}
    >
      <View style={styles.titleRow}>
        <Icon
          color={presentation.colors.brandInk}
          name="handTap"
          size={20}
        />
        <AccessibleText style={styles.title} variant="emphasis">
          {event.text}
        </AccessibleText>
      </View>
      <AccessibleText
        style={{ color: presentation.colors.inkMuted }}
        variant="body"
      >
        {ES.navigation.accessibilityEventDistance(
          formatDistance(event.distance_from_instruction_start_m),
        )}
      </AccessibleText>
      {event.details.map((detail) => (
        <View
          key={detail.attribute}
          style={[
            styles.detail,
            { backgroundColor: stateBackgrounds[detail.state] },
          ]}
        >
          <Icon
            color={stateColors[detail.state]}
            name={stateIcons[detail.state]}
            size={20}
          />
          <View style={styles.detailCopy}>
            <AccessibleText
              style={{ color: stateColors[detail.state] }}
              variant="meta"
            >
              {ES.navigation.evidenceStates[detail.state]}
            </AccessibleText>
            <AccessibleText
              style={{ color: stateColors[detail.state] }}
              variant="body"
            >
              {detail.text}
            </AccessibleText>
          </View>
        </View>
      ))}
      <AccessibleText
        style={{ color: presentation.colors.inkSubtle }}
        variant="meta"
      >
        {ES.navigation.accessibilitySource}
      </AccessibleText>
    </View>
  );
}

const styles = StyleSheet.create({
  detail: {
    borderRadius: radii.field,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  detailCopy: {
    flex: 1,
    gap: 2,
  },
  event: {
    borderLeftWidth: 3,
    gap: spacing.sm,
    paddingLeft: spacing.lg,
  },
  title: {
    flex: 1,
  },
  titleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
});

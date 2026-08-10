import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ProfileOptionProps {
  description: string;
  hint: string;
  label: string;
  onPress: () => void;
  selected: boolean;
}

export function ProfileOption({
  description,
  hint,
  label,
  onPress,
  selected,
}: ProfileOptionProps) {
  return (
    <Pressable
      accessibilityHint={hint}
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected && styles.optionSelected,
        pressed && styles.optionPressed,
      ]}
    >
      <View
        importantForAccessibility="no-hide-descendants"
        style={[styles.indicator, selected && styles.indicatorSelected]}
      />
      <View importantForAccessibility="no-hide-descendants" style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    gap: 4,
  },
  description: {
    color: '#454B5E',
    fontSize: 15,
    lineHeight: 21,
  },
  indicator: {
    borderColor: '#6B6680',
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    marginTop: 2,
    width: 20,
  },
  indicatorSelected: {
    backgroundColor: '#6C4BC3',
    borderColor: '#6C4BC3',
    borderWidth: 5,
  },
  label: {
    color: '#17213A',
    fontSize: 17,
    fontWeight: '700',
  },
  option: {
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: '#D6D0E6',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    minHeight: 72,
    padding: 16,
  },
  optionPressed: {
    backgroundColor: '#F3F0FC',
  },
  optionSelected: {
    backgroundColor: '#F3F0FC',
    borderColor: '#6C4BC3',
    borderWidth: 2,
  },
});

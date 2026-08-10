import { Pressable, StyleSheet, Text } from 'react-native';

interface PrimaryButtonProps {
  accessibilityHint: string;
  disabled?: boolean;
  expanded?: boolean;
  label: string;
  onPress: () => void;
}

export function PrimaryButton({
  accessibilityHint,
  disabled = false,
  expanded,
  label,
  onPress,
}: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled, expanded }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#5B3FC4',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  buttonPressed: {
    backgroundColor: '#432B9B',
  },
  buttonDisabled: {
    backgroundColor: '#887DAE',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
});

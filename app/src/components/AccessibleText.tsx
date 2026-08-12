import type { ComponentProps } from 'react';
import { Text } from 'react-native';

type AccessibleTextProps = ComponentProps<typeof Text>;

/** Text exposed as one Spanish accessibility focus in reading order. */
export function AccessibleText({
  accessibilityRole = 'text',
  ...props
}: AccessibleTextProps) {
  return (
    <Text
      accessible
      accessibilityLanguage="es-ES"
      accessibilityRole={accessibilityRole}
      {...props}
    />
  );
}

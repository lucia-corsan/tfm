import { StyleSheet, Text, View } from 'react-native';

interface StatusCardProps {
  description: string;
  title: string;
}

export function StatusCard({ description, title }: StatusCardProps) {
  return (
    <View
      accessible
      accessibilityLabel={`${title}. ${description}`}
      style={styles.card}
    >
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    backgroundColor: '#ECE8FA',
    borderColor: '#C6BCEB',
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  description: {
    color: '#343B50',
    fontSize: 16,
    lineHeight: 23,
  },
  title: {
    color: '#17213A',
    fontSize: 18,
    fontWeight: '700',
  },
});

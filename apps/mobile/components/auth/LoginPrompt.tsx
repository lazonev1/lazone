import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Button } from '@lazone/ui';

interface LoginPromptProps {
  title: string;
  message: string;
}

export function LoginPrompt({ title, message }: LoginPromptProps) {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.message, { color: theme.icon }]}>{message}</Text>
      <Button
        label="Go to Login"
        onPress={() => router.push('/(auth)/login')}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  button: {
    width: '100%',
  }
});

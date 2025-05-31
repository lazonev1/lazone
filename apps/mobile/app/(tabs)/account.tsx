import { View } from 'react-native';
import { Button } from '@lazone/ui';
import { useRouter } from 'expo-router';

import { StyleSheet } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

export default function Account() {
  const router = useRouter();
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Account</ThemedText>
      <Button label="Go to Info" onPress={() => router.push('/account/info')} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});

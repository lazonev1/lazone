import { View, StyleSheet, Appearance } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@lazone/ui';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { getStatusColor } from '@/components/booking/BookingStatus';
import { useTranslation } from 'react-i18next';

export default function BookingSuccessScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { t } = useTranslation('booking');
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const { bookingId, providerId, providerName } = params;

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
        }} 
      />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle" size={80} color={getStatusColor('pending')} />
          </View>
          
          <ThemedText type="title" style={styles.title}>
            {t('success.title')}
          </ThemedText>

          <ThemedText style={styles.subtitle}>
            {t('success.message', { name: providerName })}
          </ThemedText>
        
          <View style={styles.buttonGroup}>
            <Button
              label={t('success.viewDetails')}
              onPress={() => router.replace(`/booking/${bookingId}`)}
              variant="primary"
              style={styles.button}
            />
            <Button
              label={t('success.returnToProvider')}
              onPress={() => providerId ? router.replace(`/provider/${providerId}`) : router.back()}
              variant="secondary"
              style={styles.button}
            />
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 16,
    opacity: 0.8,
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  buttonGroup: {
    width: '100%',
    gap: 12,
  },
  button: {
    width: '100%',
  }
});

import { View, StyleSheet, Appearance } from 'react-native';
import { useState } from 'react';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';
import BusinessInfoStep from '@/components/provider/BusinessInfoStep';
import ServiceDetailsStep from '@/components/provider/ServiceDetailsStep';
import { Stack, useRouter } from 'expo-router';
import type { ProviderRegistration } from '@/types/provider';

export default function ProviderRegistrationScreen() {
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme, colorScheme);
  const router = useRouter();
  
  const [step, setStep] = useState<'business-info' | 'service-details'>('business-info');
  const [formData, setFormData] = useState<Partial<ProviderRegistration>>({});

  const handleNext = (data: Partial<ProviderRegistration>) => {
    setFormData(prev => ({ ...prev, ...data }));
    setStep('service-details');
  };

  const handleSubmit = async (finalData: Partial<ProviderRegistration>) => {
    const completeData = { ...formData, ...finalData };
    // TODO: Submit registration
    console.log('Complete registration data:', completeData);
    // Navigate to success or dashboard
    router.push('/(tabs)');
  };

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Become a Provider',
          headerBackTitle: 'Back',
        }} 
      />
      <View style={styles.container}>
        {step === 'business-info' ? (
          <BusinessInfoStep 
            initialData={formData}
            onNext={handleNext}
          />
        ) : (
          <ServiceDetailsStep
            initialData={formData}
            onSubmit={handleSubmit}
          />
        )}
      </View>
    </>
  );
}

const createStyles = (theme, colorScheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
});
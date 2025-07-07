import { View, StyleSheet, Appearance, Pressable } from 'react-native';
import { useState, useCallback } from 'react';
import { Colors } from '@/constants/Colors';
import BusinessInfoStep from '@/components/provider/BusinessInfoStep';
import ServiceDetailsStep from '@/components/provider/ServiceDetailsStep';
import { Stack, useRouter } from 'expo-router';
import type { ProviderRegistration } from '@/types/provider';
import { Ionicons } from '@expo/vector-icons';

export default function ProviderRegistrationScreen() {
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
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

  const handleBackPress = useCallback(() => {
    if (step === 'service-details') {
      setStep('business-info');
      return true; // Prevents default back behavior
    }
    return false; // Allows default back to account screen
  }, [step]);

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Become a Provider',
          headerBackTitle: 'Back',
          headerLeft: () => (
            <Pressable 
              onPress={() => handleBackPress() || router.back()}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Ionicons name="chevron-back" size={24} color={theme.text} />
            </Pressable>
          ),
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
            onBack={() => setStep('business-info')}  // Add back handler
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
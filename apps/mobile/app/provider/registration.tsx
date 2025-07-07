import { View, StyleSheet, Appearance, Pressable, Alert } from 'react-native';
import { useState, useCallback } from 'react';
import { Colors } from '@/constants/Colors';
import BusinessInfoStep from '@/components/provider/BusinessInfoStep';
import ServiceDetailsStep from '@/components/provider/ServiceDetailsStep';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import type { ProviderRegistration } from '@/types/provider';
import { Ionicons } from '@expo/vector-icons';

export default function ProviderRegistrationScreen() {
  const { editMode, providerId, prefilledData } = useLocalSearchParams();
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  
  // Parse prefilled data if in edit mode
  const initialData = editMode === 'true' && prefilledData 
    ? JSON.parse(prefilledData as string)
    : {};
  
  const [step, setStep] = useState<'business-info' | 'service-details'>('business-info');
  const [formData, setFormData] = useState<Partial<ProviderRegistration>>(initialData);

  const isEditMode = editMode === 'true';

  const handleNext = (data: Partial<ProviderRegistration>) => {
    setFormData(prev => ({ ...prev, ...data }));
    setStep('service-details');
  };

  const handleSubmit = async (finalData: Partial<ProviderRegistration>) => {
    const completeData = { ...formData, ...finalData };
    
    try {
      if (isEditMode) {
        // Handle update for existing provider
        // TODO: Replace with API call
        console.log('Updating provider:', providerId, completeData);
        Alert.alert(
          'Profile Updated',
          'Your provider profile has been updated successfully.',
          [{ text: 'OK', onPress: () => router.push('/provider/preview?id=' + providerId) }]
        );
      } else {
        // Handle creation of new provider
        // TODO: Replace with API call
        console.log('Creating new provider:', completeData);
        router.push('/(tabs)');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save provider information');
    }
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
          title: isEditMode ? 'Edit Provider Profile' : 'Become a Provider',
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
            isEditMode={isEditMode}
          />
        ) : (
          <ServiceDetailsStep
            initialData={formData}
            onSubmit={handleSubmit}
            onBack={() => setStep('business-info')}
            isEditMode={isEditMode}
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
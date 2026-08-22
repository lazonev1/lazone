import { View, StyleSheet, Appearance, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { Colors } from '@/constants/Colors';
import BusinessInfoStep from '@/components/provider/BusinessInfoStep';
import ServiceDetailsStep from '@/components/provider/ServiceDetailsStep';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import type { ProviderRegistration, ProviderViewModel } from '@/types/provider';
import { Ionicons } from '@expo/vector-icons';
import { useProvider } from '@/hooks/useProvider';
import { useAuth } from '@/contexts/auth';
import { ThemedText } from '@/components/ThemedText';
import { useTranslation } from 'react-i18next';

/**
 * Helper function to transform ProviderViewModel to ProviderRegistration format
 * Used when editing an existing provider profile
 */
function transformProviderViewModelToRegistration(
  provider: ProviderViewModel
): Partial<ProviderRegistration> {
  return {
    businessName: provider.businessName || provider.name,
    serviceCategory: provider.categoryName,
    phone: provider.phoneNumber || '',
    description: provider.bio,
    location: {
      country: provider.locationDetails?.country || 'BF',
      city: provider.locationDetails?.city || '',
      coordinates: provider.location,
    },
    languages: [], // TODO: Get from provider data if available
    remoteService: provider.remoteService,
    portfolio: provider.portfolio || [],
    services: provider.services || [],
    certifications: [], // TODO: Get from provider data if available
  };
}

export default function ProviderRegistrationScreen() {
  const { editMode, providerId } = useLocalSearchParams();
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const { t } = useTranslation(['provider', 'common']);
  const { userProfile, refreshUserProfile } = useAuth();
  const isEditMode = editMode === 'true';
  const requestedProviderId = Array.isArray(providerId) ? providerId[0] : providerId;
  const resolvedProviderId = isEditMode
    ? requestedProviderId || userProfile?._id
    : undefined;

  // Use the provider hook to fetch existing provider data and save functionality
  const { provider, isLoading, saveProviderProfile } = useProvider(resolvedProviderId);

  const [step, setStep] = useState<'business-info' | 'service-details'>('business-info');
  const [formData, setFormData] = useState<Partial<ProviderRegistration>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Populate form data when provider data is loaded
  useEffect(() => {
    if (isEditMode && provider) {
      setFormData(transformProviderViewModelToRegistration(provider));
    }
  }, [provider, isEditMode]);

  const handleNext = (data: Partial<ProviderRegistration>) => {
    setFormData(prev => ({ ...prev, ...data }));
    setStep('service-details');
  };

  const handleSubmit = async (finalData: Partial<ProviderRegistration>) => {
    const completeData = { ...formData, ...finalData } as ProviderRegistration;
    
    // Validate user is authenticated
    if (!userProfile) {
      Alert.alert(t('common:alerts.error'), t('registration.alerts.loginRequired'));
      return;
    }

    setIsSaving(true);
    
    try {
      // Call the save function from the hook
      const resultProviderId = await saveProviderProfile(
        userProfile._id,
        isEditMode ? resolvedProviderId || null : null,
        completeData
      );

      // Creating a provider profile promotes the user to the `both` role in
      // Firestore. Refresh the AuthContext immediately so Business access is
      // available without requiring the user to sign out and back in.
      if (!isEditMode) {
        await refreshUserProfile();
      }

      if (isEditMode) {
        Alert.alert(
          t('registration.alerts.updatedTitle'),
          t('registration.alerts.updatedMessage'),
          [{ text: t('common:actions.ok'), onPress: () => router.push(`/provider/preview?id=${resultProviderId}` as any) }]
        );
      } else {
        Alert.alert(
          t('registration.alerts.createdTitle'),
          t('registration.alerts.createdMessage'),
          [{ text: t('common:actions.ok'), onPress: () => router.push(`/provider/preview?id=${resultProviderId}` as any) }]
        );
      }
    } catch (error) {
      console.error('Error saving provider profile:', error);
      Alert.alert(
        t('common:alerts.error'),
        isEditMode ? t('registration.alerts.updateFailed') : t('registration.alerts.createFailed')
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackPress = useCallback(() => {
    if (step === 'service-details') {
      setStep('business-info');
      return true; // Prevents default back behavior
    }
    return false; // Allows default back to account screen
  }, [step]);

  // Show loading indicator while fetching provider data in edit mode
  if (isEditMode && isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: t('registration.editTitle'),
            headerBackTitle: t('common:actions.back'),
          }}
        />
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color={theme.tint} />
          <ThemedText style={{ marginTop: 16 }}>{t('registration.loadingProvider')}</ThemedText>
        </View>
      </>
    );
  }

  // Show saving indicator
  if (isSaving) {
    return (
      <>
        <Stack.Screen
          options={{
            title: isEditMode ? t('registration.updatingTitle') : t('registration.creatingTitle'),
            headerBackTitle: t('common:actions.back'),
          }}
        />
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color={theme.tint} />
          <ThemedText style={{ marginTop: 16 }}>
            {isEditMode ? t('registration.updatingMessage') : t('registration.creatingMessage')}
          </ThemedText>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{
          title: isEditMode ? t('registration.editTitle') : t('registration.title'),
          headerBackTitle: t('common:actions.back'),
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

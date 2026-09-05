import { View, StyleSheet, ScrollView, Appearance, TouchableOpacity, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@lazone/ui';
import { TextBox } from '@/components/ui/TextBox';
import { PortfolioImagePicker } from '@/components/ui/ImagePicker';  // Updated import
import { Colors } from '@/constants/Colors';
import { ServiceItem, PortfolioItem, ProviderRegistration } from '@/types/provider';
import { CertificationUploader } from './CertificationUploader';
import { Ionicons } from '@expo/vector-icons';
import { generateServiceId } from '@/utils/generateId';
import { validateService, validateCertification } from '@/utils/validation';
import { useTranslation } from 'react-i18next';

interface Props {
  initialData: Partial<ProviderRegistration>;
  onSubmit: (data: Partial<ProviderRegistration>) => void;
  onBack: () => void;  // Add back handler prop
  isEditMode?: boolean;
}

export default function ServiceDetailsStep({ initialData, onSubmit, onBack, isEditMode = false }: Props) {
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme, colorScheme);
  const { t } = useTranslation('provider');

  const [services, setServices] = useState<ServiceItem[]>(initialData?.services || [{
    id: generateServiceId(),
    name: '',
    description: '',
    price: ''
  }]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(initialData?.portfolio || []);
  const [certificates, setCertificates] = useState(initialData?.certifications || []);

  // Keep the second step in sync with the provider profile fetched for edit mode.
  useEffect(() => {
    if (!isEditMode) return;

    setServices(initialData.services?.length ? initialData.services : [{
      id: generateServiceId(),
      name: '',
      description: '',
      price: '',
    }]);
    setPortfolio(initialData.portfolio || []);
    setCertificates(initialData.certifications || []);
  }, [initialData.services, initialData.portfolio, initialData.certifications, isEditMode]);

  const addServiceField = () => {
    setServices([...services, {
      id: generateServiceId(),
      name: '',
      description: '',
      price: '',
      errors: {}
    }]);
  };

  const updateService = (id: string, field: string, value: string) => {
    const updatedServices = services.map(service => {
      if (service.id === id) {
        return { ...service, [field]: value };
      }
      return service;
    });
    setServices(updatedServices);
  };

  const removeService = (id: string) => {
    if (services.length > 1) {
      setServices(services.filter(service => service.id !== id));
    }
  };

  const renderServiceControls = (index: number, serviceId: string) => {
    return (
      <View style={styles.controlsContainer}>
        {services.length > 1 && (
          <TouchableOpacity
            onPress={() => removeService(serviceId)}
          >
            <Ionicons name="remove-circle" size={24} color="#FF3B30" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const validateAll = () => {
    let isValid = true;

    if (services.length === 0) {
      Alert.alert(
        t('registration.services.addServiceTitle'),
        t('registration.services.addServiceMessage')
      );
      return false;
    }

    // Validate all services
    const updatedServices = services.map(service => {
      const validation = validateService(service);
      if (!validation.isValid) {
        isValid = false;
      }
      return {
        ...service,
        errors: validation.errors
      };
    });
    setServices(updatedServices);

    // Validate all certificates
    if (certificates.length > 0) {
      const updatedCerts = certificates.map(cert => {
        const validation = validateCertification(cert);
        if (!validation.isValid) {
          isValid = false;
        }
        return {
          ...cert,
          errors: validation.errors
        };
      });
      setCertificates(updatedCerts);

    }

    if (!isValid) {
      Alert.alert(
        t('registration.services.incompleteTitle'),
        t('registration.services.incompleteMessage')
      );
    }

    return isValid;
  };

  const handleSubmit = () => {
    if (validateAll()) {
      onSubmit({ services, portfolio, certifications: certificates });
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>    
        <ThemedText type="subtitle" style={styles.sectionTitle}>{t('registration.services.title')}</ThemedText>
        
        {services.map((service, index) => (
          <View key={service.id} style={styles.serviceCard}>
            <View style={styles.serviceHeader}>
              <ThemedText style={styles.serviceNumber}>{t('registration.services.serviceNumber', { number: index + 1 })}</ThemedText>
              {renderServiceControls(index, service.id)}
            </View>
            
            <TextBox
              label={t('registration.services.name')}
              value={service.name}
              onChangeText={(text) => updateService(service.id, 'name', text)}
              placeholder={t('registration.services.namePlaceholder')}
              error={service.errors?.name}
            />

            <TextBox
              label={t('registration.services.description')}
              value={service.description}
              onChangeText={(text) => updateService(service.id, 'description', text)}
              placeholder={t('registration.services.descriptionPlaceholder')}
              multiline
              numberOfLines={3}
              error={service.errors?.description}
            />
            <TextBox
              label={t('registration.services.price')}
              value={service.price}
              onChangeText={(text) => updateService(service.id, 'price', text)}
              placeholder={t('registration.services.pricePlaceholder')}
              keyboardType="numeric"
              error={service.errors?.price}
            />
          </View>
        ))}

          <TouchableOpacity
            onPress={addServiceField}
            style={styles.addServiceButton}
          >
            <Ionicons name="add-circle" size={20} color="#0A58A5" />
            <ThemedText style={styles.addServiceText}>{t('registration.services.addService')}</ThemedText>
          </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>{t('registration.portfolio.title')}</ThemedText>
        <ThemedText style={styles.sectionDescription}>
          {t('registration.portfolio.subtitle')}
        </ThemedText>

        <PortfolioImagePicker  // Updated component name
          images={portfolio}
          onChange={setPortfolio}
          maxImages={6}
          allowCaptions
          captionPlaceholder={t('registration.portfolio.captionPlaceholder')}
        />
      </View>

      <View style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {t('registration.certifications.title')}
        </ThemedText>
        <ThemedText style={styles.sectionDescription}>
          {t('registration.certifications.subtitle')}
        </ThemedText>

        <CertificationUploader
          certificates={certificates}
          onChange={setCertificates}
        />
      </View>

      <Button
        label={isEditMode ? t('registration.services.saveChanges') : t('registration.services.completeRegistration')}
        onPress={handleSubmit}
        variant="primary"
        style={styles.submitButton}
      />
    </ScrollView>
  );
}

const createStyles = (
  theme: typeof Colors.light,
  colorScheme: ReturnType<typeof Appearance.getColorScheme>
) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  section: {
    padding: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    marginBottom: 8,
  },
  sectionDescription: {
    color: theme.text,
    opacity: 0.7,
    marginBottom: 16,
  },
  serviceCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : theme.background,
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? '#333' : '#eee',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  controlsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  addServiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    padding: 8,
    borderRadius: 8,
    backgroundColor:'rgba(10, 88, 165, 0.1)',
  },
  addServiceText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#0A58A5',
    fontWeight: '500',
  },
  submitButton: {
    margin: 16,
    marginBottom: 32,
  },
});

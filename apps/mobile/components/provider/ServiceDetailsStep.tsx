import { View, StyleSheet, ScrollView } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@lazone/ui';
import EditableField from '@/components/account/EditableField';
import { ImagePicker } from '@/components/ui/ImagePicker';
import { useState } from 'react';
import { ServiceItem, ProviderRegistration } from '@/types/provider';

type Props = {
  initialData: Partial<ProviderRegistration>;
  onSubmit: (data: Partial<ProviderRegistration>) => void;
};

export default function ServiceDetailsStep({ initialData, onSubmit }: Props) {
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentService, setCurrentService] = useState<Partial<ServiceItem>>({});

  const handleAddService = () => {
    if (!currentService.name || !currentService.price) {
      setErrors({ service: 'Name and price are required' });
      return;
    }

    setFormData(prev => ({
      ...prev,
      services: [...(prev.services || []), { 
        id: Date.now().toString(),
        ...currentService as ServiceItem 
      }]
    }));
    setCurrentService({});
    setErrors({});
  };

  const handleSubmit = () => {
    if (!formData.services?.length) {
      setErrors({ service: 'Add at least one service' });
      return;
    }
    onSubmit(formData);
  };

  return (
    <ScrollView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Your Services & Portfolio
      </ThemedText>

      <View style={styles.form}>
        <View style={styles.section}>
          <ThemedText type="subtitle">Add a Service</ThemedText>
          <EditableField
            label="Service Name"
            value={currentService.name || ''}
            onChangeText={(text) => setCurrentService({ ...currentService, name: text })}
            placeholder="e.g., Hair Cut, House Cleaning"
          />
          <EditableField
            label="Price"
            value={currentService.price || ''}
            onChangeText={(text) => setCurrentService({ ...currentService, price: text })}
            placeholder="e.g., 5000 CFA"
            keyboardType="numeric"
          />
          <Button
            label="Add Service"
            onPress={handleAddService}
            variant="secondary"
            size="small"
          />
          {errors.service && (
            <ThemedText style={styles.error}>{errors.service}</ThemedText>
          )}
        </View>

        {formData.services?.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="subtitle">Your Services</ThemedText>
            {formData.services.map((service, index) => (
              <View key={index} style={styles.serviceItem}>
                <ThemedText>{service.name}</ThemedText>
                <ThemedText>{service.price} CFA</ThemedText>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <ThemedText type="subtitle">Portfolio Images</ThemedText>
          <ImagePicker
            images={formData.portfolio || []}
            onChange={(images) => setFormData({ ...formData, portfolio: images })}
            maxImages={3}
          />
        </View>

        <Button
          label="Complete Registration"
          onPress={handleSubmit}
          variant="primary"
          style={styles.submitButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  form: {
    gap: 24,
    padding: 16,
  },
  section: {
    gap: 12,
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  error: {
    color: '#FF3B30',
    fontSize: 14,
  },
  submitButton: {
    marginTop: 32,
  },
});

import { View, StyleSheet, ScrollView, Appearance, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@lazone/ui';
import { TextBox } from '@/components/ui/TextBox';
import { PortfolioImagePicker } from '@/components/ui/ImagePicker';  // Updated import
import { Colors } from '@/constants/Colors';
import { ServiceItem, PortfolioItem } from '@/types/provider';
import { CertificationUploader } from './CertificationUploader';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { generateServiceId } from '@/utils/generateId';

export default function ServiceDetailsStep({ initialData, onSubmit }) {
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme, colorScheme);
  
  const [services, setServices] = useState<ServiceItem[]>(initialData?.services || [{
    id: generateServiceId(),
    name: '',
    description: '',
    price: ''
  }]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(initialData?.portfolio || []);
  const [certificates, setCertificates] = useState(initialData?.certifications || []);

  const addServiceField = () => {
    setServices([...services, {
      id: generateServiceId(),
      name: '',
      description: '',
      price: ''
    }]);
  };

  const updateService = (id: string, field: string, value: string) => {
    setServices(services.map(service => 
      service.id === id ? { ...service, [field]: value } : service
    ));
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
            style={styles.removeButton}
          >
            <Ionicons name="remove-circle" size={24} color="#FF3B30" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>    
        <ThemedText type="subtitle" style={styles.sectionTitle}>Services Offered</ThemedText>
        
        {services.map((service, index) => (
          <View key={service.id} style={styles.serviceCard}>
            <View style={styles.serviceHeader}>
              <ThemedText style={styles.serviceNumber}>Service {index + 1}</ThemedText>
              {renderServiceControls(index, service.id)}
            </View>
            
            <TextBox
              label="Service Name"
              value={service.name}
              onChangeText={(text) => updateService(service.id, 'name', text)}
              placeholder="e.g., Basic Electrical Installation"
            />
            
            <TextBox
              label="Description (Optional)"
              value={service.description}
              onChangeText={(text) => updateService(service.id, 'description', text)}
              placeholder="Describe what's included in this service..."
              multiline
              numberOfLines={3}
            />
            <TextBox
              label="Price (CFA)"
              value={service.price}
              onChangeText={(text) => updateService(service.id, 'price', text)}
              placeholder="e.g., 25000"
              keyboardType="numeric"
            />
          </View>
        ))}

          <TouchableOpacity
            onPress={addServiceField}
            style={styles.addServiceButton}
          >
            <Ionicons name="add-circle" size={20} color="#0A58A5" />
            <ThemedText style={styles.addServiceText}>Add Service</ThemedText>
          </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Portfolio</ThemedText>
        <ThemedText style={styles.sectionDescription}>
          Add photos of your previous work to showcase your expertise
        </ThemedText>
        
        <PortfolioImagePicker  // Updated component name
          images={portfolio}
          onChange={setPortfolio}
          maxImages={6}
          allowCaptions
          captionPlaceholder="Describe this work (optional)"
        />
      </View>

      <View style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Certifications & Recognition
        </ThemedText>
        <ThemedText style={styles.sectionDescription}>
          Add any relevant certifications or professional recognition
        </ThemedText>

        <CertificationUploader
          certificates={certificates}
          onChange={setCertificates}
        />
      </View>

      <Button
        label="Complete Registration"
        onPress={() => onSubmit({ services, portfolio, certifications: certificates })}
        variant="primary"
        style={styles.submitButton}
      />
    </ScrollView>
  );
}

const createStyles = (theme, colorScheme) => StyleSheet.create({
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
    backgroundColor: theme.cardBackground,
    backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : theme.background,
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? '#333' : '#eee',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  serviceNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  controlsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  removeButton: {
    padding: 4,
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

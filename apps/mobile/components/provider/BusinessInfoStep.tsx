import { View, StyleSheet, ScrollView } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@lazone/ui';
import EditableField from '@/components/account/EditableField';
import { CategoryPicker } from '@/components/ui/CategoryPicker';
import { LocationPicker } from '@/components/ui/LocationPicker';
import Checkbox from '@/components/ui/CheckBox';
import { useState } from 'react';

type Props = {
  initialData: Partial<ProviderRegistration>;
  onNext: (data: Partial<ProviderRegistration>) => void;
};

export default function BusinessInfoStep({ initialData, onNext }: Props) {
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleValueChange = (key: string, value: any) => {
    console.log('Updating:', key, value); // Debug log
    setFormData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    console.log('Validating formData:', formData); // Debug log
    
    if (!formData.businessName?.trim()) {
      newErrors.businessName = 'Business name is required';
    }
    if (!formData.serviceCategory) {
      newErrors.category = 'Please select a category';
    }
    
    // More specific location validation
    if (!formData.location) {
      newErrors.location = 'Location is required';
    } else {
      if (!formData.location.country) {
        newErrors.location = 'Please select a country';
      } else if (!formData.location.city) {
        newErrors.location = 'Please enter a city';
      }
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      console.log('Validation errors:', newErrors); // Debug log
      return false;
    }
    
    return true;
  };

  const handleContinue = () => {
    if (validate()) {
      console.log('Validation passed, moving to next step with data:', formData); // Debug log
      onNext(formData);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Tell us about your business
      </ThemedText>

      <View style={styles.form}>
        <EditableField
          label="Business Name"
          value={formData.businessName || ''}
          onChangeText={(text) => handleValueChange('businessName', text)}
          placeholder="Your business name"
          error={errors.businessName}
        />

        <CategoryPicker
          selected={formData.serviceCategory}
          onSelect={(category) => handleValueChange('serviceCategory', category)}
          error={errors.category}
        />

        <LocationPicker
          value={formData.location || { country: '', city: '' }}
          onChange={(location) => handleValueChange('location', location)}
          error={errors.location}
        />

        <EditableField
          label="Description"
          value={formData.description || ''}
          onChangeText={(text) => handleValueChange('description', text)}
          multiline
          numberOfLines={3}
          placeholder="Brief description of your services..."
        />

        <View style={styles.checkboxContainer}>
          <Checkbox
            isChecked={formData.remoteService || false}
            setChecked={(checked) => handleValueChange('remoteService', checked)}
            label="I offer remote services"
          />
        </View>

        <Button
          label="Continue to Services"
          onPress={handleContinue}
          variant="primary"
          style={styles.button}
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
    gap: 16,
    padding: 16,
  },
  checkboxContainer: {
    marginTop: 8,
  },
  button: {
    marginTop: 24,
  },
});



// {value.coordinates && (
//     <View style={styles.coordinatesContainer}>
//       <ThemedText style={styles.coordinates}>
//         📍 {value.coordinates.latitude.toFixed(6)}, {value.coordinates.longitude.toFixed(6)}
//       </ThemedText>
//     </View>
//   )}
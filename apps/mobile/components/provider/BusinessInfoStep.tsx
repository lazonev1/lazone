import { View, StyleSheet, ScrollView, SafeAreaView, Appearance, Alert } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@lazone/ui';
import { SelectList } from '@/components/ui/SelectList';
import { TextBox } from '@/components/ui/TextBox';
import { LocationPicker } from '@/components/ui/LocationPicker';
import Checkbox from '@/components/ui/CheckBox';
import { useState } from 'react';
import { Colors } from '@/constants/Colors';
import { validateBusinessInfo } from '@/utils/validation';

const SERVICE_CATEGORIES = [
  { label: 'Beauty & Wellness', value: 'beauty' },
  { label: 'Home Services', value: 'home' },
  { label: 'Technology', value: 'tech' },
  { label: 'Healthcare', value: 'health' },
  { label: 'Education', value: 'education' },
  { label: 'Events', value: 'events' },
  { label: 'Automotive', value: 'automotive' },
  { label: 'Legal Services', value: 'legal' },
  { label: 'Creative & Design', value: 'creative' },
  { label: 'Fitness', value: 'fitness' },
];

export default function BusinessInfoStep({ initialData, onNext }) {
  const [formData, setFormData] = useState({
    ...initialData,
    location: {
      country: 'BF', // Use country code for Burkina Faso
      city: '',
      ...initialData?.location // Preserve any existing location data
    }
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme, colorScheme);

  const handleFieldChange = (field: string, value: any) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
  };

  const handleSubmit = () => {
    const validation = validateBusinessInfo(formData);

    if (!validation.isValid) {
      setErrors(validation.errors);
      Alert.alert('Please fill in all required fields correctly.');
      return;
    }

    onNext(formData);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>Business Information</ThemedText>
          <ThemedText style={styles.subtitle}>Tell us about your business to get started</ThemedText>
        </View>

        <View style={styles.form}>
          <TextBox
            label="Business Name"
            value={formData.businessName}
            onChangeText={(textinput) => handleFieldChange('businessName', textinput)}
            placeholder="Enter your business name"
            error={errors.businessName}
            maxLength={50}
            style={styles.input}
          />

          <SelectList
            label="Service Category"
            value={formData.serviceCategory}
            options={SERVICE_CATEGORIES}
            onChange={(selectedCategory) => handleFieldChange('serviceCategory', selectedCategory)}
            error={errors.serviceCategory}
            style={styles.input}
          />

          <LocationPicker
            value={formData.location || { country: '', city: '' }}
            onChange={(location) => handleFieldChange('location', location)}
            countryError={errors.country}
            cityError={errors.city}
          />

          <TextBox
            label="Business Description"
            value={formData.description}
            onChangeText={(text) => handleFieldChange('description', text)}
            placeholder="Describe your services and expertise..."
            multiline
            numberOfLines={5}
            maxLength={500}
            style={[styles.input, styles.textArea]}
            containerStyle={styles.textAreaContainer}
            error={errors.description}
          />

          <View style={styles.optionsSection}>
            <ThemedText style={styles.label}>I offer remote services</ThemedText>
            <Checkbox
              isChecked={formData.remoteService}
              setChecked={(checked) => handleFieldChange('remoteService', checked)}
              color={formData.remoteService ? '#0A58A5' : undefined}
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Continue"
          onPress={handleSubmit}
          variant="primary"
          style={styles.button}
        />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme, colorScheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  form: {
    padding: 24,
    gap: 20,
  },
  input: {
    marginBottom: 8,
  },
  textAreaContainer: {
    height: 120,
  },
  optionsSection: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colorScheme === 'dark' ? '#333' : '#eee',
  },
  button: {
    height: 50,
  },
});
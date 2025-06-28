import { View, StyleSheet, ScrollView, SafeAreaView, Appearance } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@lazone/ui';
import {SelectList} from '@/components/ui/SelectList';
import { TextBox } from '@/components/ui/TextBox';
import { LocationPicker } from '@/components/ui/LocationPicker';
import Checkbox from '@/components/ui/CheckBox';
import { useState } from 'react';
import { Colors } from '@/constants/Colors';

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
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState({});
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme, colorScheme);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    // Required field validations
    if (!formData.businessName?.trim()) {
      newErrors.businessName = 'Business name is required';
    }
    if (!formData.serviceCategory) {
      newErrors.category = 'Please select a category';
    }
    if (!formData.location?.country) {
      newErrors.location = 'Please select a country';
    } else if (!formData.location?.city) {
      newErrors.location = 'Please enter a city';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext(formData);
    }
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
            onChangeText={(textinput) => setFormData({...formData, businessName: textinput})}
            placeholder="Enter your business name"
            error={errors.businessName}
            maxLength={50}
            style={styles.input}
          />

          <SelectList
            label="Service Category"
            value={formData.serviceCategory}
            options={SERVICE_CATEGORIES}
            onChange={(selectedCategory) => setFormData({ ...formData, serviceCategory: selectedCategory })}
            error={errors.category}
            style={styles.input}
          />

          <LocationPicker
            value={formData.location || { country: '', city: '' }}
            onChange={(location) => setFormData({ ...formData, location })}
            error={errors.location}
          />

          <TextBox
            label="Business Description"
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="Describe your services and expertise..."
            multiline
            numberOfLines={5}
            maxLength={500}
            style={[styles.input, styles.textArea]}
            containerStyle={styles.textAreaContainer}
          />

          <View style={styles.optionsSection}>
            <ThemedText style = {styles.label}>I offer remote services</ThemedText>
            <Checkbox
              isChecked={formData.remoteService}
              setChecked={(checked) => setFormData({ ...formData, remoteService: checked })}
            />
          </View>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Continue"
          onPress={handleNext}
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
  label: {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '500',
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
  textArea: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  optionsSection: {
    marginTop: 16,
    flexDirection: 'row',
    // justifyContent: 'space-between',
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
import { View, StyleSheet, TouchableWithoutFeedback, TouchableOpacity, Keyboard, KeyboardAvoidingView, Platform, ScrollView, Appearance } from 'react-native';
import { useState } from 'react';
import { ServiceItem } from '@/types/provider';
import { CreateBookingInput } from '@/types/booking';
import { Button } from '@lazone/ui';
import { TextBox } from '@/components/ui/TextBox';
import { SelectList } from '@/components/ui/SelectList';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';

interface Props {
  providerId: string;
  providerName: string;
  services: ServiceItem[];
  onSubmit: (input: CreateBookingInput) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  initialValues?: {
    serviceId?: string;
    scheduledDate?: Date;
    price?: string;
    description?: string;
  };
}

export function BookingRequestForm({ providerId, providerName, services, onSubmit, onCancel, isSubmitting, initialValues }: Props) {
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme, colorScheme);

  const [selectedService, setSelectedService] = useState(initialValues?.serviceId || '');
  const [date, setDate] = useState(initialValues?.scheduledDate || new Date());
  const [price, setPrice] = useState(initialValues?.price || '');
  const [description, setDescription] = useState(initialValues?.description || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Auto-fill price when a service is selected
  const handleServiceChange = (serviceId: string) => {
    setSelectedService(serviceId);
    const service = services.find((s) => s.id === serviceId);
    if (service?.price) {
      setPrice(service.price);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedService) newErrors.service = 'Please select a service';
    if (!date) newErrors.date = 'Please select a date';
    if (!price) newErrors.price = 'Please enter your proposed price';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const selectedServiceDetails = services.find(s => s.id === selectedService);
    
    const input: CreateBookingInput = {
      providerId,
      providerName,
      serviceId: selectedService,
      serviceName: selectedServiceDetails?.name || '',
      bookingDate: date,
      price: Number(price),
      notes: description || undefined,
    };

    onSubmit(input);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: theme.background }}
      >
        <ScrollView style={styles.container}>
          <View style={styles.form}>
            <SelectList
              label="Select Service *"
              value={selectedService}
              options={services.map(s => ({ 
                label: `${s.name} (${s.price} CFA)`, 
                value: s.id 
              }))}
              onChange={handleServiceChange}
              error={errors.service}
            />

            <View style={styles.dateSection}>
              <ThemedText style={styles.label}>Preferred Date and Time *</ThemedText>
              {Platform.OS === 'ios' ? (
                <DateTimePicker
                  value={date}
                  mode="datetime"
                  onChange={(_, selectedDate) => setDate(selectedDate || date)}
                  minimumDate={new Date()}
                />
              ) : (
                <>
                  <View style={styles.datePills}>
                    <TouchableOpacity
                      style={styles.datePill}
                      onPress={() => setShowDatePicker(true)}
                      activeOpacity={0.6}
                    >
                      <ThemedText style={styles.datePillText}>
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.datePill}
                      onPress={() => setShowTimePicker(true)}
                      activeOpacity={0.6}
                    >
                      <ThemedText style={styles.datePillText}>
                        {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                  {showDatePicker && (
                    <DateTimePicker
                      value={date}
                      mode="date"
                      onChange={(_, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) setDate(selectedDate);
                      }}
                      minimumDate={new Date()}
                    />
                  )}
                  {showTimePicker && (
                    <DateTimePicker
                      value={date}
                      mode="time"
                      onChange={(_, selectedDate) => {
                        setShowTimePicker(false);
                        if (selectedDate) setDate(selectedDate);
                      }}
                    />
                  )}
                </>
              )}
              {errors.date && <ThemedText style={styles.error}>{errors.date}</ThemedText>}
            </View>

            <TextBox
              label="Your Proposed Price (CFA) *"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              placeholder="Enter amount"
              error={errors.price}
            />

            <TextBox
              label="Additional Details (Optional)"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              placeholder="Any specific requirements or details..."
            />
            
            <View style={styles.buttons}>
              <Button
                label="Cancel"
                onPress={onCancel}
                variant="secondary"
                style={styles.button}
                disabled={isSubmitting}
              />
              <Button
                label={isSubmitting ? 'Submitting...' : 'Submit Request'}
                onPress={handleSubmit}
                variant="primary"
                style={styles.button}
                disabled={isSubmitting}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const createStyles = (theme: typeof Colors.light, colorScheme: string | null | undefined) => StyleSheet.create({
  container: {
    padding: 16,
  },
  form: {
    flex: 1,
    gap: 20,
  },
  dateSection: {
    gap: 8,
    backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.text,
    marginBottom: 8,
  },
  error: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 4,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 24,
  },
  button: {
    flex: 1,
  },
  datePills: {
    flexDirection: 'row',
    gap: 6,
  },
  datePill: {
    backgroundColor: colorScheme === 'dark' ? '#3a3a3c' : '#e8e8ed',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  datePillText: {
    fontSize: 15,
    fontWeight: '600',
    color: colorScheme === 'dark' ? '#fff' : '#000',
  },
});

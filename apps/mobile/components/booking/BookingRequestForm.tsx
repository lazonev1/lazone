import { View, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Appearance } from 'react-native';
import { useRef, useState } from 'react';
import { ServiceItem } from '@/types/provider';
import { CreateBookingInput } from '@/types/booking';
import { Button } from '@lazone/ui';
import { TextBox } from '@/components/ui/TextBox';
import { SelectList } from '@/components/ui/SelectList';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useTranslation } from 'react-i18next';

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
    checklist?: string[];
  };
}

export function BookingRequestForm({ providerId, providerName, services, onSubmit, onCancel, isSubmitting, initialValues }: Props) {
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme, colorScheme);
  const { t, i18n } = useTranslation(['booking', 'common']);
  const dateLocale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';

  const [selectedService, setSelectedService] = useState(initialValues?.serviceId || '');
  const [date, setDate] = useState(initialValues?.scheduledDate || new Date());
  const [price, setPrice] = useState(initialValues?.price || '');
  const [description, setDescription] = useState(initialValues?.description || '');
  const [checklist, setChecklist] = useState<string[]>(initialValues?.checklist?.length ? initialValues.checklist : ['']);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

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
    if (!selectedService) newErrors.service = t('form.errors.service');
    if (!date) newErrors.date = t('form.errors.date');
    if (!price) newErrors.price = t('form.errors.price');
    if (checklist.some((item) => !item.trim())) newErrors.checklist = t('form.errors.checklist');
    
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
      checklist: checklist.map((description, index) => ({ id: `item-${index + 1}`, description: description.trim(), completed: false })),
    };

    onSubmit(input);
  };

  const addChecklistItem = () => {
    setChecklist((items) => [...items, '']);
    // Keep the newly-created field reachable while the keyboard is open.
    requestAnimationFrame(() => requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true })));
  };

  return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        style={{ flex: 1, backgroundColor: theme.background }}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          nestedScrollEnabled
        >
          <View style={styles.form}>
            <SelectList
              label={t('form.selectService')}
              value={selectedService}
              options={services.map(s => ({
                label: t('form.serviceOption', { name: s.name, price: s.price }),
                value: s.id
              }))}
              onChange={handleServiceChange}
              error={errors.service}
            />

            <View style={styles.dateSection}>
              <ThemedText style={styles.label}>{t('form.preferredDateTime')}</ThemedText>
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
                        {date.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.datePill}
                      onPress={() => setShowTimePicker(true)}
                      activeOpacity={0.6}
                    >
                      <ThemedText style={styles.datePillText}>
                        {date.toLocaleTimeString(dateLocale, { hour: 'numeric', minute: '2-digit', hour12: i18n.language !== 'fr' })}
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
              label={t('form.proposedPrice')}
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              placeholder={t('form.enterAmount')}
              error={errors.price}
            />

            <View style={styles.checklistSection}>
              <ThemedText style={styles.label}>{t('form.requestChecklist')}</ThemedText>
              <ThemedText style={styles.helper}>{t('form.checklistHelper')}</ThemedText>
              {checklist.map((item, index) => (
                <View key={index} style={styles.checklistRow}>
                  <TextBox
                    value={item}
                    onChangeText={(value) => setChecklist((items) => items.map((current, i) => i === index ? value : current))}
                    onFocus={index > 0 ? () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50) : undefined}
                    placeholder={t('form.itemPlaceholder', { number: index + 1 })}
                  />
                  {checklist.length > 1 && <TouchableOpacity onPress={() => setChecklist((items) => items.filter((_, i) => i !== index))}><ThemedText style={styles.remove}>{t('form.remove')}</ThemedText></TouchableOpacity>}
                </View>
              ))}
              {errors.checklist && <ThemedText style={styles.error}>{errors.checklist}</ThemedText>}
              <TouchableOpacity onPress={addChecklistItem}><ThemedText style={styles.add}>{t('form.addChecklistItem')}</ThemedText></TouchableOpacity>
            </View>

            <TextBox
              label={t('form.additionalDetails')}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              placeholder={t('form.additionalDetailsPlaceholder')}
            />
            
            <View style={styles.buttons}>
              <Button
                label={t('common:actions.cancel')}
                onPress={onCancel}
                variant="secondary"
                style={styles.button}
                disabled={isSubmitting}
              />
              <Button
                label={isSubmitting ? t('form.submitting') : t('form.submitRequest')}
                onPress={handleSubmit}
                variant="primary"
                style={styles.button}
                disabled={isSubmitting}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
  );
}

const createStyles = (theme: typeof Colors.light, colorScheme: string | null | undefined) => StyleSheet.create({
  container: {
    padding: 16,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  form: {
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
  checklistSection: { gap: 8 },
  helper: { opacity: 0.65, marginBottom: 4 },
  checklistRow: { gap: 4 },
  add: { color: theme.tint, fontWeight: '600' },
  remove: { color: '#FF3B30', alignSelf: 'flex-end' },
});

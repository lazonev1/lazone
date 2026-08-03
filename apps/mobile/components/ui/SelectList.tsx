import { View, StyleSheet, Appearance, TouchableOpacity, Modal } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

type Option = {
  label: string;
  value: string;
};

type Props = {
  label: string;
  value?: string;
  options: Option[];
  onChange: (value: string) => void;
  error?: string;
  style?: any;
};

export function SelectList({ label, value, options, onChange, error, style }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme, colorScheme);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <View style={[styles.container, style]}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      
      <TouchableOpacity 
        style={[styles.selectButton, error && styles.errorBorder]}
        onPress={() => setModalVisible(true)}
      >
        <ThemedText style={styles.selectText}>
          {selectedOption?.label || 'Select an option'}
        </ThemedText>
        <Ionicons 
          name="chevron-down" 
          size={20} 
          color={theme.text}
        />
      </TouchableOpacity>

      {error && <ThemedText style={styles.error}>{error}</ThemedText>}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>{label}</ThemedText>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.optionItem}
                onPress={() => {
                  onChange(option.value);
                  setModalVisible(false);
                }}
              >
                <ThemedText style={[
                  styles.optionText,
                  value === option.value && styles.selectedOptionText
                ]}>
                  {option.label}
                </ThemedText>
                {value === option.value && (
                  <Ionicons 
                    name="checkmark" 
                    size={20} 
                    color="#0A58A5"
                  />
                )}
              </TouchableOpacity>
            ))}
          </ThemedView>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (
  theme: typeof Colors.light,
  colorScheme: ReturnType<typeof Appearance.getColorScheme>
) => StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '500',
    color: theme.text,
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
    borderRadius: 12,
    backgroundColor: theme.background,
  },
  selectText: {
    fontSize: 16,
  },
  errorBorder: {
    borderColor: '#FF3B30',
  },
  error: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colorScheme === 'dark' ? '#333' : '#eee',
  },
  optionText: {
    fontSize: 16,
  },
  selectedOptionText: {
    color: '#0A58A5',
    fontWeight: '500',
  },
});

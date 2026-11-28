import { View, StyleSheet, TouchableOpacity, Modal, FlatList, useColorScheme, useWindowDimensions, AccessibilityInfo, findNodeHandle } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

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
  disabled?: boolean;
  style?: any;
};

export function SelectList({ label, value, options, onChange, error, disabled = false, style }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const colorScheme = useColorScheme();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('common');
  const triggerRef = useRef<View>(null);
  const headingRef = useRef<View>(null);
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme, colorScheme);

  const selectedOption = options.find(opt => opt.value === value);
  const focus = (target: View | null) => {
    const handle = target ? findNodeHandle(target) : null;
    if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
  };
  const close = () => setModalVisible(false);

  return (
    <View style={[styles.container, style]}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      
      <TouchableOpacity 
        ref={triggerRef}
        style={[styles.selectButton, error && styles.errorBorder]}
        onPress={() => setModalVisible(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: selectedOption?.label ?? t('select.placeholder') }}
        accessibilityHint={error || t('select.openHint')}
        accessibilityState={{ expanded: modalVisible, disabled }}
      >
        <ThemedText style={styles.selectText}>
          {selectedOption?.label || t('select.placeholder')}
        </ThemedText>
        <Ionicons 
          name="chevron-down" 
          size={20} 
          color={theme.text}
        />
      </TouchableOpacity>

      {error && <ThemedText style={styles.error} accessibilityRole="alert">{error}</ThemedText>}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={close}
        onShow={() => focus(headingRef.current)}
        onDismiss={() => focus(triggerRef.current)}
        supportedOrientations={['portrait', 'landscape']}
      >
        <View style={styles.modalOverlay}>
          <ThemedView
            style={[styles.modalContent, { maxHeight: Math.max(120, height - insets.top - 24), paddingBottom: Math.max(insets.bottom, 16) }]}
            accessibilityViewIsModal
            onAccessibilityEscape={close}
          >
            <View style={styles.modalHeader}>
              <View ref={headingRef} accessible accessibilityRole="header" accessibilityLabel={label} style={{ flex: 1 }}>
                <ThemedText style={styles.modalTitle}>{label}</ThemedText>
              </View>
              <TouchableOpacity 
                onPress={close}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel={t('select.close')}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={options}
              style={[styles.optionList, { maxHeight: height * 0.65 }]}
              keyExtractor={option => option.value}
              extraData={value}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={12}
              ListEmptyComponent={<ThemedText style={styles.emptyText}>{t('select.empty')}</ThemedText>}
              renderItem={({ item: option }) => (
              <TouchableOpacity
                style={styles.optionItem}
                accessibilityRole="radio"
                accessibilityLabel={option.label}
                accessibilityState={{ checked: value === option.value }}
                onPress={() => {
                  onChange(option.value);
                  close();
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
              )}
            />
          </ThemedView>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (
  theme: typeof Colors.light,
  colorScheme: ReturnType<typeof useColorScheme>
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
    flex: 1,
    marginRight: 12,
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
    flexShrink: 1,
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
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionList: { flexGrow: 0, flexShrink: 1 },
  emptyText: { padding: 20 },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: colorScheme === 'dark' ? '#333' : '#eee',
  },
  optionText: {
    fontSize: 16,
    flex: 1,
    marginRight: 12,
  },
  selectedOptionText: {
    color: '#0A58A5',
    fontWeight: '500',
  },
});

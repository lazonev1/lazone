import { View, TouchableOpacity, StyleSheet, Appearance } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';

type Option = {
  label: string;
  value: string;
};

type Props = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
};

export function SegmentedToggle({ options, value, onChange }: Props) {
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme, colorScheme);

  return (
    <View style={styles.container}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.option,
            { backgroundColor: theme.background },
            value === option.value && styles.selectedOption,
          ]}
          onPress={() => onChange(option.value)}
        >
          <ThemedText
            style={[
              styles.optionText,
              value === option.value && styles.selectedText,
            ]}
          >
            {option.label}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );
}
function createStyles(
  theme: typeof Colors.light,
  colorScheme: ReturnType<typeof Appearance.getColorScheme>
) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      padding: 4,
      // backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : theme.background,
      borderColor: colorScheme === 'dark' ? '#333' : '#ccc',
      borderWidth: 1,
      borderRadius: 8,
      marginBottom: 20,
    },
    option: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 6,
    },
    selectedOption: {
      backgroundColor: '#0A58A5',
    },
    optionText: {
      fontSize: 16,
    },
    selectedText: {
      color: '#fff',
      fontWeight: '600',
    },
  });  
}

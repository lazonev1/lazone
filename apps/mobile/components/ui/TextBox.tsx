import { View, TextInput, StyleSheet, Appearance, ViewStyle, TextStyle } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';

type Props = {
  label?: string;
  error?: string;
  style?: ViewStyle;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
} & React.ComponentProps<typeof TextInput>;

export function TextBox({ 
  label, 
  error, 
  style, 
  containerStyle, 
  inputStyle,
  ...props 
}: Props) {
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme, colorScheme);

  return (
    <View style={[styles.container, style]}>
      {label && <ThemedText style={styles.label}>{label}</ThemedText>}
      <View style={[styles.inputContainer, containerStyle, error && styles.errorContainer]}>
        <TextInput
          {...props}
          style={[styles.input, inputStyle]}
          placeholderTextColor={theme.text}
          selectionColor={theme.tint}
        />
      </View>
      {error && <ThemedText style={styles.error}>{error}</ThemedText>}
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
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
    borderRadius: 12,
    backgroundColor: theme.background,
    overflow: 'hidden',
  },
  input: {
    padding: 16,
    fontSize: 16,
    color: theme.text,
  },
  errorContainer: {
    borderColor: '#FF3B30',
  },
  error: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 4,
  },
});

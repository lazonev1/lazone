import { View, Text, StyleSheet, TextInputProps, Appearance } from 'react-native';
import React from 'react';
import { TextInput } from '@lazone/ui';
import { Colors } from '@/constants/Colors';

type Props = TextInputProps & {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
};

export default function EditableField({ label, value, onChangeText, ...props }: Props) {
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme, colorScheme);
  return (
    <View style={styles.field}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
        placeholderTextColor="#999"
        {...props}
      />
    </View>
  );
}

function createStyles(theme: typeof Colors.light, colorScheme: 'light' | 'dark' | null | undefined) {
  return StyleSheet.create({
    field: {
      marginBottom: 16,
      width: '100%',
    },
    label: {
      color: '#888',
      marginBottom: 6,
      fontSize: 13,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    input: {
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      color: theme.text,
      fontSize: 16,
      backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#f2f2f7',
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#444' : '#d1d1d6',
    },
  });
}

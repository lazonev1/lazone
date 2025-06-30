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
  const styles = createStyles(theme);
  return (
    <View style={styles.field}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
        placeholderTextColor="#888"
        {...props}
      />
    </View>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    field: {
      marginBottom: 16,
      width: '100%',
    },
    label: {
      color: theme.text,
      marginBottom: 4,
      fontSize: 16,
    },
    input: {
      borderRadius: 20,
      paddingVertical: 12,
      paddingHorizontal: 16,
      color: theme.text,
      fontSize: 16,
      backgroundColor: theme.background,
    },
  });
}

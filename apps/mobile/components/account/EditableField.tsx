import { View, Text, StyleSheet, TextInputProps } from 'react-native';
import React from 'react';
import { TextInput } from '@lazone/ui';

type Props = TextInputProps & {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
};

export default function EditableField({ label, value, onChangeText, ...props }: Props) {
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

const styles = StyleSheet.create({
  field: {
    marginBottom: 16,
    width: '100%'
  },
  label: {
    color: '#ccc',
    marginBottom: 4,
    fontSize: 14,
  },
  input: {
    backgroundColor: '#333',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 16,
  },
});

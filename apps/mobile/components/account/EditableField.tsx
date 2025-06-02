import { View, Text, StyleSheet } from 'react-native';
import React from 'react';
import { TextInput } from '@lazone/ui';

type Props = {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
};

export default function EditableField({ label, value, onChangeText }: Props) {
  return (
    <View style={styles.field}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
        placeholderTextColor="#888"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 16,
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

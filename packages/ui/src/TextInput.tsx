import { TextInput as RNTextInput, StyleSheet, TextInputProps } from 'react-native';

export default function TextInput(props: TextInputProps) {
  return (
    <RNTextInput
      style={styles.input}
      placeholderTextColor="#888"
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    fontSize: 16,
    fontFamily: 'OpenSans-Regular',
    marginBottom: 12,
  },
});

import { Text, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success'; //Blue, Orange, Green
};

export default function Button({ label, onPress, variant = 'primary' }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.button, styles[variant]]}
    >
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  primary: {
    backgroundColor: '#0A58A5', // Blue 
  },
  secondary: {
    backgroundColor: '#FF9900', // Orange
  },
  success: {
    backgroundColor: '#56B224', // Green
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'OpenSans-Regular',
    fontWeight: '600',
  },
});

import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  onPress: () => void;
  color?: string;
  size?: number;
};

export function ArrowButton({ onPress, color = '#666', size = 24 }: Props) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.button}>
      <Ionicons name="chevron-forward-sharp" size={size} color={color} weight="bold" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
  },
});

import { Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle, TextStyle, ActivityIndicator, View } from 'react-native';
import { buttonColors, buttonMinimumTarget } from './buttonTokens';

type ButtonSize = 'small' | 'medium' | 'large';
type ButtonVariant = 'primary' | 'secondary' | 'success';

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export default function Button({ 
  label, 
  onPress, 
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
  style,
  textStyle
}: Props) {
  const inactive = disabled || loading;
  const colors = inactive ? buttonColors.disabled : buttonColors[variant];
  return (
    <TouchableOpacity
      onPress={() => { if (!inactive) onPress(); }}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      testID={testID}
      style={[
        styles.button,
        { backgroundColor: colors.background },
        styles[size],
        style,
        inactive && { backgroundColor: colors.background },
      ]}
    >
      <View style={styles.content} pointerEvents="none">
        {loading && <ActivityIndicator color={colors.foreground} accessible={false} />}
        <Text style={[styles.text, { color: colors.foreground }, textStyle,
          inactive && { color: colors.foreground }]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: buttonMinimumTarget,
    minWidth: buttonMinimumTarget,
  },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, flexShrink: 1 },
  small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  medium: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  large: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
});

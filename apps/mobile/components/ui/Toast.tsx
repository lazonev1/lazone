import { useEffect, useRef, useCallback } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ToastType = 'success' | 'error' | 'info';

type ToastProps = {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number; // ms before auto-dismiss
  onDismiss: () => void;
};

const ICON_MAP: Record<ToastType, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  success: { name: 'checkmark-circle', color: '#4CAF50' },
  error: { name: 'alert-circle', color: '#F44336' },
  info: { name: 'information-circle', color: '#0A58A5' },
};

const BG_MAP: Record<ToastType, string> = {
  success: 'rgba(76, 175, 80, 0.12)',
  error: 'rgba(244, 67, 54, 0.12)',
  info: 'rgba(10, 88, 165, 0.12)',
};

export default function Toast({
  visible,
  message,
  type = 'success',
  duration = 2500,
  onDismiss,
}: ToastProps) {
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  }, [translateY, opacity, onDismiss]);

  useEffect(() => {
    if (visible) {
      // Slide up + fade in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 15,
          stiffness: 150,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss
      timerRef.current = setTimeout(hide, duration);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, duration, hide, translateY, opacity]);

  if (!visible) return null;

  const icon = ICON_MAP[type];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: insets.bottom + 16,
          transform: [{ translateY }],
          opacity,
          backgroundColor: BG_MAP[type],
          borderLeftColor: icon.color,
        },
      ]}
    >
      <View style={styles.content}>
        <Ionicons name={icon.name} size={20} color={icon.color} />
        <ThemedText style={styles.message} numberOfLines={2}>
          {message}
        </ThemedText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    paddingVertical: 14,
    paddingHorizontal: 16,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  message: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
});


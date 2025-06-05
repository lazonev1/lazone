import { PropsWithChildren, useState } from 'react';
import { StyleSheet, TouchableOpacity, TouchableOpacityProps } from 'react-native';

import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';

import type { IconSymbolName } from '../../components/ui/IconSymbol';

type Props = TouchableOpacityProps & {
    label: string;
    icon: IconSymbolName;
    onPress: () => void
}
export function ButtonIcon({ icon, label, onPress }: Props) {
  const theme = useColorScheme() ?? 'light';

  return (
    <ThemedView>
      <TouchableOpacity
        style={styles.heading}
        onPress={() => onPress()}
        activeOpacity={0.8}>
        <IconSymbol
          name={icon}
          size={18}
          weight="medium"
          color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
          style={undefined}
        />
        <ThemedText type="defaultSemiBold">{label}</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  content: {
    marginTop: 6,
    marginLeft: 24,
  },
});

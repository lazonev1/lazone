import { PropsWithChildren, useState } from 'react';
import { Button, StyleSheet, TouchableOpacity, TouchableOpacityProps } from 'react-native';

import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import { StyleProp } from 'react-native';

import type { IconSymbolName } from '../../components/ui/IconSymbol';

type Props = TouchableOpacityProps & {
    label: string;
    icon: IconSymbolName;
    style?: StyleProp<Button>;
    onPress: () => void
}
export function ButtonIcon({style, icon, label, onPress }: Props) {
  const theme = useColorScheme() ?? 'light';

  return (
    <ThemedView>
      <TouchableOpacity
        style={[styles.heading, style]}
        onPress={() => onPress()}
        activeOpacity={0.8}>
        <IconSymbol
          name={icon}
          size={18}
          weight="medium"
          color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
          style={undefined}
        />
        <ThemedText style={{color: '#0a7ea4'}} >{label}</ThemedText>
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

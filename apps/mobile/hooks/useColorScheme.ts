import { useColorScheme as useNativeColorScheme } from 'react-native';

/**
 * Normalize React Native's platform-specific `unspecified` value so the rest
 * of the application has one stable light/dark theme contract.
 */
export function useColorScheme(): 'light' | 'dark' | null {
  const colorScheme = useNativeColorScheme();

  return colorScheme === 'light' || colorScheme === 'dark' ? colorScheme : null;
}

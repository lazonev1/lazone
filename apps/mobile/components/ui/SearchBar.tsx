import { TextInput, StyleSheet, View, Pressable, Appearance } from 'react-native';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';

interface SearchBarProps {
  value?: string;
  onChangeText?: (text: string) => void;
  onSubmit?: () => void;
  showFilterButton?: boolean;
  onFilterPress?: () => void;
  filterButtonText?: string;
  placeholder?: string;
  style?: any;
}

export default function SearchBar({
  value = '',
  onChangeText,
  onSubmit,
  showFilterButton = false,
  onFilterPress,
  filterButtonText = 'Filters',
  placeholder = 'Search for services...',
  style,
}: SearchBarProps) {
  const colorScheme = Appearance.getColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const styles = createStyles(theme);

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.inputContainer]}>
        <Ionicons name="search" size={20} color={theme.icon} style={{ marginRight: 8 }} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.icon}
          style={styles.input}
          returnKeyType="search"
          onSubmitEditing={onSubmit}
        />
        {value.length > 0 && (<Ionicons
          name="close-circle"
          size={20}
          color={theme.icon}
          onPress={() => onChangeText?.('')}
          style={{ marginLeft: 8 }}/>)}
      </View>
      {showFilterButton && (
        <Pressable onPress={onFilterPress} style={styles.filterButton}>
          <ThemedText>{filterButtonText}</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

function createStyles(theme: typeof Colors.light) {
    return StyleSheet.create({
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
          },
          inputContainer: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: 12,
            paddingHorizontal: 12,
            backgroundColor: theme.background,
          },
          input: {
            flex: 1,
            padding: 12,
            borderRadius: 12,
            fontSize: 16,
            color : theme.text,
          },
          
          searchButton: {
            padding: 8,
          },
          filterButton: {
            padding: 8,
            borderRadius: 8,
            fontSize: 16,
            color : theme.text,
            backgroundColor: theme.background,
            marginLeft: 8,
          },
    });
  }

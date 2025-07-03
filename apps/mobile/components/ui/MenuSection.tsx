import { View, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { ArrowButton } from '@/components/ui/ArrowButton';
import { MenuItem } from '@/types/user';

type MenuSectionProps = {
    title?: string;
    items: MenuItem[];
    onPress: (route: string) => void;
    styles: any;
};

export function MenuSection({ title, items, onPress, styles }: MenuSectionProps) {
    return (
        <View style={[
            styles.section,
            !title && styles.sectionWithoutTitle
        ]}>
            {title && (
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                    {title}
                </ThemedText>
            )}
            {items.map((item, index) => (
                <View key={item.id}>
                    <TouchableOpacity
                        onPress={() => onPress(item.route)}
                        style={styles.menuItem}
                    >
                        <View style={styles.menuItemLeft}>
                            {item.icon && (
                                <Ionicons
                                    name={item.icon}
                                    size={24}
                                    style={styles.menuIcon}
                                />
                            )}
                            <ThemedText>{item.label}</ThemedText>
                        </View>
                        <ArrowButton onPress={() => onPress(item.route)} />
                    </TouchableOpacity>
                    {index < items.length - 1 && <View style={styles.divider} />}
                </View>
            ))}
        </View>
    );
}
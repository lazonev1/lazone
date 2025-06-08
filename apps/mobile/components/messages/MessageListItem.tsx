import { Appearance, Pressable, StyleSheet, Image } from "react-native";
import { ThemedText } from "../ThemedText";
import { Colors } from "@/constants/Colors";
import { View } from "react-native-reanimated/lib/typescript/Animated";

// This should accept a message object that contains title, message, sender, time, ... attribute.
export default function ProviderListItem(sender: string, message: string, image: any, time: string, onPress: () => void) {
    const colorScheme = Appearance.getColorScheme()
    const theme = colorScheme == 'dark'? Colors.dark : Colors.light
    const styles = createStyle(theme, colorScheme)

    return (
        <Pressable style={styles.card} onPress={onPress}>
            <Image 
                source={ image ?? require('@/assets/images/avatar-placeholder.png') } 
                style={styles.avatar}/>
            <View>
                <ThemedText type="subtitle">
                    {sender}
                </ThemedText>
                <ThemedText style={styles.message}>
                    {message}
                </ThemedText>
            </View>
            <ThemedText style={styles.time}>
                {time}
            </ThemedText>
        </Pressable>
    )
}

function createStyle(theme: {[key: string]: any}, colorScheme: string | null | undefined) {
    return StyleSheet.create(
    {
    card: {
      flexDirection: 'row',
      backgroundColor: colorScheme ==='dark'?'#333':theme.background,
      padding: 12,
      borderRadius: 12,
      marginBottom: 12,
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      marginRight: 12,
    },
    time: {
        fontSize: 12
    },
    message: {
        fontSize: 14,
        flexShrink: 1
    }
    }
)
}
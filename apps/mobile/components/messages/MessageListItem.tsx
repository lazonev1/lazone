import { Appearance, Pressable, StyleSheet, Image } from "react-native";
import { ThemedText } from "../ThemedText";
import { Colors } from "@/constants/Colors";
import { View } from "react-native";
type MessageListItemProps = {
    sender: string;
    text: string;
    image?: any;
    time: string;
    onPress: () => void;

}
// This should accept a message object that contains title, message, sender, time, ... attribute.
export default function MessageListItem({sender, text, image, time, onPress}: MessageListItemProps) {
    const colorScheme = Appearance.getColorScheme()
    const theme = colorScheme == 'dark'? Colors.dark : Colors.light
    const styles = createStyle(theme, colorScheme)

    return (
        <Pressable style={styles.card} onPress={onPress}>
            <View style={{justifyContent: 'flex-start', flexDirection: 'row'}}>
                <Image 
                    source={ image ?? require('@/assets/images/avatar-placeholder.png') } 
                    style={styles.avatar}/>
                <View style={{paddingLeft: 10, paddingRight: 10}}>
                    <ThemedText type="subtitle">
                        {sender}
                    </ThemedText>
                    <ThemedText style={styles.text}>
                        {text}
                    </ThemedText>
                </View>
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
    text: {
        fontSize: 14,
        flexShrink: 1
    }
    }
)
}
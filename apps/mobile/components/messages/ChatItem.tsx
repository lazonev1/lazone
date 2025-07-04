import { Appearance, Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "../ThemedText";
import { ThemedView } from "../ThemedView";
import { Colors } from "@/constants/Colors";
import { Image } from "expo-image";

type ChatItemProps = {
    sender: string;
    text: string;
    time: string;
    unreadCount?: number;
    avatar?: any;
    profession?: string;
    isFromOther?: boolean;
    onPress: () => void;
}

// This should accept a message object that contains title, message, sender, time, ... attribute.
export function ChatItem({
    sender,
    text,
    time,
    unreadCount = 0,
    avatar,
    profession,
    isFromOther = true,
    onPress
}: ChatItemProps) {
    const colorScheme = Appearance.getColorScheme()
    const theme = colorScheme === 'dark' ? Colors.dark : Colors.light
    const styles = createStyle(theme, colorScheme)

    return (
        <Pressable
            style={[
                styles.card,
                // unreadCount > 0 && styles.unreadCard
            ]}
            onPress={onPress}
        >
            <View style={styles.leftContainer}>
                <Image
                    source={avatar ?? require('@/assets/images/avatar-placeholder.png')}
                    style={styles.avatar}
                    contentFit="cover"
                />
                <View style={styles.contentContainer}>
                    <View style={styles.header}>
                        <ThemedText type="subtitle" style={styles.senderName}>
                            {sender}
                        </ThemedText>
                        <ThemedText style={styles.time}>
                            {time}
                        </ThemedText>
                    </View>

                    <View style={styles.messagePreview}>
                        {profession && (
                            <ThemedText style={styles.profession}>
                                {profession} •
                            </ThemedText>
                        )}
                        <ThemedText
                            style={[
                                styles.text,
                                unreadCount > 0 && styles.unreadText
                            ]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {isFromOther ? text : `You: ${text}`}
                        </ThemedText>
                    </View>
                </View>
            </View>

            {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                    <ThemedText style={styles.unreadCount}>
                        {unreadCount}
                    </ThemedText>
                </View>
            )}
        </Pressable>
    )
}

function createStyle(theme: { [key: string]: any }, colorScheme: string | null | undefined) {
    return StyleSheet.create({
        card: {
            flexDirection: 'row',
            backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : theme.background,
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: colorScheme === 'dark' ? '#2C2C2E' : '#E0E0E0',
            alignItems: 'center',
            justifyContent: 'space-between',
            // borderRadius: 8,
            // margin: 4
        },
        unreadCard: {
            backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F8F8F8',
        },
        leftContainer: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
        },
        avatar: {
            width: 56,
            height: 56,
            borderRadius: 28,
            marginRight: 12,
        },
        contentContainer: {
            flex: 1,
            justifyContent: 'center',
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 4,
        },
        senderName: {
            fontSize: 16,
            fontWeight: '600',
            marginRight: 8,
        },
        time: {
            fontSize: 12,
            color: colorScheme === 'dark' ? '#8E8E93' : '#8E8E93',
        },
        messagePreview: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        profession: {
            fontSize: 13,
            color: colorScheme === 'dark' ? '#8E8E93' : '#6E6E73',
            marginRight: 4,
        },
        text: {
            fontSize: 14,
            color: colorScheme === 'dark' ? '#8E8E93' : '#6E6E73',
            flex: 1,
        },
        unreadText: {
            color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
            fontWeight: '500',
        },
        unreadBadge: {
            backgroundColor: '#0A84FF',
            minWidth: 20,
            height: 20,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 6,
            marginLeft: 8,
        },
        unreadCount: {
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: '600',
        }
    });
}
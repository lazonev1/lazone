import { SafeAreaView, StyleSheet, View, TextInput, Platform } from 'react-native';
import { ScrollView } from "react-native-gesture-handler";
import { ChatItem } from "@/components/messages/ChatItem";
import { useRouter, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { Chats, formatMessageTime, getOtherParticipant, CurrentUser } from '@/hooks/useChats';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Appearance } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Theme } from '@/constants/theme';
import { padding, margin, getColor, shadow, typography, borderRadius } from '@/utils/styleUtils';

export default function Messages() {
  const navigation = useNavigation();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const mode = colorScheme === 'dark' ? 'dark' : 'light';
  const styles = createStyles(theme, colorScheme);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false // Hide the default header
    });
  }, []);

  // Filter chats based on search query
  const filteredChats = Chats.filter(chat => {
    const otherPerson = getOtherParticipant(chat);
    const searchLower = searchQuery.toLowerCase();

    // Search in name, profession, and message text
    return (
      otherPerson.name.toLowerCase().includes(searchLower) ||
      (otherPerson.profession && otherPerson.profession.toLowerCase().includes(searchLower)) ||
      chat.lastMessage.text.toLowerCase().includes(searchLower)
    );
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ThemedView style={styles.container}>
        {/* Title Section */}
        <ThemedView style={styles.titleContainer}>
          <ThemedText style={styles.title}>Chats</ThemedText>
        </ThemedView>

        {/* Search Section */}
        <ThemedView style={styles.searchContainer}>
          <ThemedView style={styles.searchBar}>
            <Ionicons
              name="search"
              size={Theme.spacing.md}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search messages"
              placeholderTextColor={getColor(`${mode}.textTertiary`)}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Ionicons
                name="close-circle"
                size={Theme.spacing.md}
                style={styles.clearIcon}
                onPress={() => setSearchQuery('')}
              />
            )}
          </ThemedView>
        </ThemedView>

        {/* Chat List */}
        <ScrollView style={styles.scrollView}>
          {filteredChats.length === 0 ? (
            <ThemedView style={styles.emptyState}>
              <ThemedText style={styles.emptyText}>
                No chats found matching "{searchQuery}"
              </ThemedText>
            </ThemedView>
          ) : (
            filteredChats.map((chat) => {
              const otherPerson = getOtherParticipant(chat);
              const formattedTime = formatMessageTime(chat.lastMessage.timestamp);
              const isFromOther = chat.lastMessage.senderId !== CurrentUser.id;

              return (
                <ChatItem
                  key={chat.id}
                  sender={otherPerson.name}
                  text={chat.lastMessage.text}
                  time={formattedTime}
                  unreadCount={chat.unreadCount}
                  avatar={otherPerson.avatar}
                  profession={otherPerson.profession}
                  isFromOther={isFromOther}
                  onPress={() => router.push(`/messages/chat/${chat.id}`)}
                />
              );
            })
          )}
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

function createStyles(theme: any, colorScheme: 'dark' | 'light' | null | undefined) {
  const mode = colorScheme === 'dark' ? 'dark' : 'light';

  return StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    container: {
      flex: 1,
      width: '100%',
    },
    titleContainer: {
      ...padding.horizontal('md'),
      ...padding.top('md'),
      ...padding.bottom('xs'),
    },
    title: {
      ...typography.style('heading', 'bold'),
    },
    searchContainer: {
      ...padding.horizontal('md'),
      ...padding.bottom('sm'),
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: getColor(`${mode}.card`),
      ...borderRadius.all('sm'),
      ...padding.horizontal('sm'),
      height: Theme.spacing.xxl,
      ...Platform.select({
        ios: {
          ...shadow('sm')
        },
        android: {
          elevation: 1,
        },
      }),
    },
    searchIcon: {
      color: getColor(`${mode}.textTertiary`),
      ...margin.right('xs'),
    },
    searchInput: {
      flex: 1,
      height: '100%',
      ...typography.size('bodyLarge'),
      color: getColor(`${mode}.textPrimary`),
      padding: 0,
    },
    clearIcon: {
      color: getColor(`${mode}.textTertiary`),
      ...margin.left('xs'),
    },
    scrollView: {
      flex: 1,
      width: '100%',
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      ...padding.all('xxl'),
    },
    emptyText: {
      textAlign: 'center',
      ...typography.size('bodyLarge'),
      color: getColor(`${mode}.textSecondary`),
      opacity: 0.6,
    },
    infoButton: {
      ...padding.all('xs')
    },
    options: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      width: '100%',
      ...padding.horizontal('md')
    }
  });
}

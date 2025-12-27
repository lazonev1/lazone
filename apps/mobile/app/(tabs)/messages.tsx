import { SafeAreaView, StyleSheet, View, TextInput, Platform } from 'react-native';
import { ScrollView } from "react-native-gesture-handler";
import { ChatItem } from "@/components/messages/ChatItem";
import { useRouter, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { Chats, getOtherParticipant, CurrentUser } from '@/hooks/useChats';
import { formatMessageTime } from '@/backend/main/src/utils/utils';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Appearance } from 'react-native';
import { Colors } from '@/constants/Colors';
import SearchBar from '@/components/ui/SearchBar';

export default function Messages() {
  const navigation = useNavigation();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

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
    <SafeAreaView style={[styles.safeArea]}>
      <View style={styles.container}>
        {/* Title Section */}
        <View style={styles.titleContainer}>
          <ThemedText style={styles.subtitle}>Chats</ThemedText>
        </View>

        {/* Search Section */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search messages"/>

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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    width: '100%',
  },
  titleContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    opacity: 0.6,
  },
  infoButton: {
    padding: 8
  },
  options: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    width: '100%',
    paddingHorizontal: 20
  }
});

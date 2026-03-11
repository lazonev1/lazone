import { SafeAreaView, StyleSheet, View, ActivityIndicator } from 'react-native';
import { ScrollView } from "react-native-gesture-handler";
import { ConversationItem } from "@/components/messages/ConversationItem";
import { useRouter, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { useConversationsList } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/auth';
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

  const { user } = useAuth();
  const userId = user?.uid ?? '';
  const { conversations, loading } = useConversationsList(userId);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false
    });
  }, []);

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conversation => {
    const searchLower = searchQuery.toLowerCase();
    return (
      conversation.otherUser.name.toLowerCase().includes(searchLower) ||
      (conversation.lastMessage?.text?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  return (
    <SafeAreaView style={[styles.safeArea]}>
      <View style={styles.container}>
        {/* Title Section */}
        <View style={styles.titleContainer}>
          <ThemedText style={styles.subtitle}>Messages</ThemedText>
        </View>

        {/* Search Section */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search messages"/>

        {/* Conversation List */}
        <ScrollView style={styles.scrollView}>
          {loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={theme.tint} />
            </View>
          ) : filteredConversations.length === 0 ? (
            <ThemedView style={styles.emptyState}>
              <ThemedText style={styles.emptyText}>
                {searchQuery
                  ? `No messages found matching "${searchQuery}"`
                  : 'Your messages will appear here.'}
              </ThemedText>
            </ThemedView>
          ) : (
            filteredConversations.map((conversation) => {
              const formattedTime = conversation.lastMessage?.createdAt
                ? formatMessageTime(conversation.lastMessage.createdAt)
                : '';

              return (
                <ConversationItem
                  key={conversation._id}
                  sender={conversation.otherUser.name}
                  text={conversation.lastMessage?.text ?? ''}
                  time={formattedTime}
                  unreadCount={conversation.unreadCount}
                  avatar={conversation.otherUser.avatar ? { uri: conversation.otherUser.avatar } : undefined}
                  isFromOther={!(conversation.lastMessage?.isFromMe ?? false)}
                  isTyping={conversation.isTyping}
                  onPress={() => router.push({
                    pathname: '/messages/[id]',
                    params: {
                      id: conversation._id,
                      name: conversation.otherUser.name,
                      avatar: conversation.otherUser.avatar ?? '',
                    }
                  })}
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

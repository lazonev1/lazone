import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Pressable, Image, ScrollView, TextInput, TouchableOpacity, Appearance, Alert, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import MessageBubble from '@/components/chat/MessageBubble';
import DateDivider from '@/components/chat/DateDivider';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/auth';
import * as messageRepository from '@/repositories/messageRepository';
import { formatDateDivider } from '@/backend/main/src/utils/utils';

export default function ConversationScreen() {
  const { id, name, avatar } = useLocalSearchParams<{ id: string; name?: string; avatar?: string }>();
  const router = useRouter();
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const scrollRef = useRef<ScrollView | null>(null);
  const [messageText, setMessageText] = useState('');
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const styles = createStyles(theme, colorScheme);

  const { user } = useAuth();
  const userId = user?.uid ?? '';

  // Real-time messages subscription
  const { messages, loading, error, sendMessage } = useMessages(id);

  // Mark conversation as read when entering and when new messages arrive
  useEffect(() => {
    if (id && userId) {
      messageRepository.updateReadStatus(id, userId);
    }
  }, [id, userId, messages.length]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Handle typing indicator
  const handleTextChange = useCallback((text: string) => {
    setMessageText(text);

    if (id && userId) {
      messageRepository.setTypingStatus(id, userId, true);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        messageRepository.setTypingStatus(id, userId, false);
      }, 2000);
    }
  }, [id, userId]);

  // Clean up typing status on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (id && userId) {
        messageRepository.setTypingStatus(id, userId, false);
      }
    };
  }, [id, userId]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !userId) return;

    const text = messageText.trim();
    setMessageText('');

    // Clear typing indicator
    if (id && userId) {
      messageRepository.setTypingStatus(id, userId, false);
    }

    try {
      await sendMessage(userId, text);
    } catch (err) {
      console.error('Failed to send message:', err);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      setMessageText(text); // Restore the message on failure
    }
  };

  // Group messages by date for display
  type DisplayMessage = {
    id: string;
    text: string;
    time: string;
    isOutgoing: boolean;
    date: string;
  };

  const displayMessages: DisplayMessage[] = messages.map(msg => {
    const msgDate = new Date(msg.createdAt);
    return {
      id: msg._id,
      text: msg.text,
      time: msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOutgoing: msg.senderId === userId,
      date: formatDateDivider(msg.createdAt),
    };
  });

  const groupedMessages: Record<string, DisplayMessage[]> = {};
  displayMessages.forEach((msg) => {
    if (!groupedMessages[msg.date]) {
      groupedMessages[msg.date] = [];
    }
    groupedMessages[msg.date].push(msg);
  });

  const shouldShowAvatar = (msgs: DisplayMessage[], index: number) => {
    if (index === msgs.length - 1) return true;
    return msgs[index].isOutgoing !== msgs[index + 1].isOutgoing;
  };

  if (loading && messages.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.tint} />
        <ThemedText style={{ marginTop: 12 }}>Loading conversation...</ThemedText>
      </SafeAreaView>
    );
  }

  const contactName = name ?? 'Conversation';
  const contactAvatar = avatar ? { uri: avatar } : require('@/assets/images/avatar-placeholder.png');

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <Pressable
              style={styles.header}
              onPress={() => {
                // Navigate to provider profile if applicable
              }}
            >
              <Image
                source={contactAvatar}
                style={styles.avatar}
              />
              <View style={styles.headerInfo}>
                <ThemedText style={styles.headerTitle}>
                  {contactName}
                </ThemedText>
              </View>
            </Pressable>
          ),
          headerStyle: {
            backgroundColor: theme.background
          },
          headerTintColor: theme.tint,
          headerShadowVisible: false,
          headerRight: () => (
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="ellipsis-vertical" size={20} color={theme.icon} />
            </TouchableOpacity>
          )
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messageContent}
        >
          {Object.entries(groupedMessages).map(([date, msgs]) => (
            <View key={date}>
              <DateDivider date={date} />

              {msgs.map((msg, index) => (
                <MessageBubble
                  key={msg.id}
                  message={msg.text}
                  time={msg.time}
                  isOutgoing={msg.isOutgoing}
                  senderAvatar={!msg.isOutgoing && shouldShowAvatar(msgs, index)
                    ? contactAvatar
                    : undefined}
                />
              ))}
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.inputButton} onPress={() => Alert.alert('Coming soon')}>
            <Ionicons name='add-outline' size={24} color={theme.icon} />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Message"
            placeholderTextColor={theme.tabIconDefault}
            value={messageText}
            onChangeText={handleTextChange}
            multiline
          />

          <TouchableOpacity
            style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
            disabled={!messageText.trim()}
            onPress={handleSendMessage}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(theme: any, colorScheme: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    keyboardAvoid: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
    },
    headerInfo: {
      flexDirection: 'column',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
    },
    headerSubtitle: {
      fontSize: 12,
      color: theme.tabIconDefault,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      marginRight: 12,
    },
    headerButton: {
      padding: 8,
    },
    messagesContainer: {
      flex: 1,
      paddingHorizontal: 12,
    },
    messageContent: {
      paddingBottom: 10,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: colorScheme === 'dark' ? '#2b2b2b' : '#eaeaea',
    },
    inputButton: {
      backgroundColor: '#0A58A5',
      width: 40,
      height: 40,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 8,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: theme.text,
      paddingVertical: 10,
      paddingHorizontal: 16,
      backgroundColor: colorScheme === 'dark' ? '#2b2b2b' : '#f4f4f4',
      borderRadius: 24,
      marginHorizontal: 8,
      maxHeight: 100,
    },
    sendButton: {
      backgroundColor: '#0A58A5',
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButtonDisabled: {
      backgroundColor: '#0A58A5AA',
    },
  });
}
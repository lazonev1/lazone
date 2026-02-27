import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Pressable, Image, ScrollView, TextInput, TouchableOpacity, Animated, Appearance, Alert, Keyboard } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import MessageBubble from '@/components/chat/MessageBubble';
import DateDivider from '@/components/chat/DateDivider';
import { Chats, CurrentUser, getOtherParticipant } from '@/hooks/useChats';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const scrollRef = useRef<ScrollView | null>(null);
  const [message, setMessage] = useState('');
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  type ChatData = {
    contact: {
      id: string;
      name: string;
      avatar: any;
      profession?: string;
    };
    messages: Message[];
  };

  const [chatData, setChatData] = useState<ChatData | null>(null);
  const styles = createStyles(theme, colorScheme, insets.bottom);

  // Load the correct chat data based on ID
  useEffect(() => {
    const chat = Chats.find(c => c.id === id);
    if (chat) {
      const otherPerson = getOtherParticipant(chat);

      // Format messages to match the expected format
      const formattedMessages = chat.messages.map(msg => {
        const messageDate = new Date(msg.timestamp);
        return {
          id: msg.id,
          text: msg.text,
          time: messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isOutgoing: msg.senderId === CurrentUser.id,
          date: messageDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
          // Add attachment info if present
          attachment: msg.attachments && msg.attachments.length > 0 ? msg.attachments[0] : undefined
        };
      });

      setChatData({
        contact: {
          id: otherPerson.id,
          name: otherPerson.name,
          avatar: otherPerson.avatar,
          profession: otherPerson.profession
        },
        messages: formattedMessages
      });
    } else {
      // Fallback to default data if chat not found
      setChatData({
        contact: {
          id,
          name: "Chat Not Found",
          avatar: require('@/assets/images/avatar-placeholder.png')
        },
        messages: []
      });
    }
  }, [id]);

  // If chat data is still loading
  if (!chatData) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ThemedText>Loading chat...</ThemedText>
      </View>
    );
  }

  const handleSendMessage = () => {
    if (!message.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      text: message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOutgoing: true,
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    };

    setChatData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        messages: [...prev.messages, newMessage]
      };
    });

    setMessage('');

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  type Message = {
    id: string;
    text: string;
    time: string;
    isOutgoing: boolean;
    date: string;
    attachment?: any;
  };

  const groupedMessages: Record<string, Message[]> = {};

  if (chatData && chatData.messages) {
    chatData.messages.forEach((message: Message) => {
      if (!groupedMessages[message.date]) {
        groupedMessages[message.date] = [];
      }
      groupedMessages[message.date].push(message);
    });
  }

  const shouldShowAvatar = (messages: any, index: any) => {
    if (index === messages.length - 1) return true;

    const currentMessage = messages[index];
    const nextMessage = messages[index + 1];

    return currentMessage.isOutgoing !== nextMessage.isOutgoing;
  };


  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <Pressable
              style={styles.header}
              onPress={() => {
                // Only navigate to provider profile if it's a provider
                if (chatData.contact.profession) {
                  console.log(chatData.contact.id)
                  router.push(`/provider/${chatData.contact.id}`)
                }
              }}
            >
              <Image
                source={chatData.contact.avatar}
                style={styles.avatar}
              />
              <View style={styles.headerInfo}>
                <ThemedText style={styles.headerTitle}>
                  {chatData.contact.name}
                </ThemedText>
                {chatData.contact.profession && (
                  <ThemedText style={styles.headerSubtitle}>
                    {chatData.contact.profession}
                  </ThemedText>
                )}
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
        keyboardVerticalOffset={headerHeight}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messageContent}
        >
          {Object.entries(groupedMessages).map(([date, messages]) => (
            <View key={date}>
              <DateDivider date={date} />

              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message.text}
                  time={message.time}
                  isOutgoing={message.isOutgoing}
                  attachment={message.attachment}
                  senderAvatar={!message.isOutgoing && shouldShowAvatar(messages, index)
                    ? chatData.contact.avatar
                    : undefined}
                />
              ))}
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.inputButton} onPress={() => Alert.alert('Coming slowly')}>
            <Ionicons name='add-outline' size={24} color={theme.icon} />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Message"
            placeholderTextColor={theme.tabIconDefault}
            value={message}
            onChangeText={setMessage}
            multiline
          />

          <TouchableOpacity
            style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
            disabled={!message.trim()}
            onPress={handleSendMessage}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function createStyles(theme: any, colorScheme: any, bottomInset: number) {
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
      paddingTop: 8,
      paddingBottom: Math.max(8, bottomInset),
      borderTopWidth: 1,
      borderTopColor: colorScheme === 'dark' ? '#2b2b2b' : '#eaeaea',
      backgroundColor: theme.background,
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
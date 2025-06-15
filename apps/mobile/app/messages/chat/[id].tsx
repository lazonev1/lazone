import React, { useState, useRef } from 'react';
import { View, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Pressable, Image, ScrollView, TextInput, TouchableOpacity, Animated, Appearance, Alert } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import MessageBubble from '@/components/chat/MessageBubble';
import DateDivider from '@/components/chat/DateDivider';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const scrollRef = useRef(null);
  const [message, setMessage] = useState('');
  
  const [chatData, setChatData] = useState({
    contact: {
      id,
      name: "Plumbing Pro",
      avatar: require('@/assets/images/avatar-placeholder.png')
    },
    messages: [
      { id: '1', text: 'Thanks!', time: '09:12 AM', isOutgoing: false, date: 'March 10' },
      { id: '2', text: 'Hi, I bought the new pipes and will come tomorrow at 11 AM to install them', time: '1:48 PM', isOutgoing: false, date: 'March 10' },
      { id: '3', text: 'Alright, will be expecting you!', time: '1:53 PM', isOutgoing: true, date: 'March 10' },
      { id: '4', text: 'Will do!', time: '1:54 PM', isOutgoing: false, date: 'March 10' },
      { id: '5', text: 'Great! Let me know your availability.', time: '1:58 PM', isOutgoing: false, date: 'March 10' },
    ]
  });

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    const newMessage = {
      id: Date.now().toString(),
      text: message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOutgoing: true,
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    };
    
    setChatData(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage]
    }));
    
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
  };
  const groupedMessages: Record<string, Message[]> = {};
  chatData.messages.forEach((message: Message) => {
    if (!groupedMessages[message.date]) {
      groupedMessages[message.date] = [];
    }
    groupedMessages[message.date].push(message);
  });

  const shouldShowAvatar = (messages:any, index:any) => {
    if (index === messages.length - 1) return true;
    
    const currentMessage = messages[index];
    const nextMessage = messages[index + 1];
    
    return currentMessage.isOutgoing !== nextMessage.isOutgoing;
  };

  const styles = createStyles(theme, colorScheme);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <Pressable 
              style={styles.header} 
              onPress={() => router.push(`/provider/${chatData.contact.id}`)}
            >
              <Image 
                source={chatData.contact.avatar} 
                style={styles.avatar} 
              />
              <ThemedText style={styles.headerTitle}>
                {chatData.contact.name}
              </ThemedText>
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
          {Object.entries(groupedMessages).map(([date, messages]) => (
            <View key={date}>
              <DateDivider date={date} />
              
              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message.text}
                  time={message.time}
                  isOutgoing={message.isOutgoing}
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
    </SafeAreaView>
  );
}

function createStyles(theme:any, colorScheme:any) {
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
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
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
import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native-gesture-handler';
import ChatHeader from '@/components/chat/ChatHeader';
import MessageBubble from '@/components/chat/MessageBubble';
import DateDivider from '@/components/chat/DateDivider';
import MessageInput from '@/components/chat/MessageInput';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [chatData, setChatData] = useState({
    contact: {
      id,
      name: "Plumbing Pro",
      avatar: "https://imgur.com/w2rKnpL.jpg"
    },
    messages: [
      { id: '1', text: 'Thanks!', time: '09:12', isOutgoing: false, date: 'March 10' },
      { id: '2', text: 'Hi, I bought the new pipes and will come tomorrow at 11 AM to install them', time: '19:48', isOutgoing: false, date: 'March 10' },
      { id: '3', text: 'Alright, will be expecting you!', time: '19:53', isOutgoing: true, date: 'March 10' },
      { id: '4', text: 'Will do!', time: '19:54', isOutgoing: false, date: 'March 10' },
      { id: '5', text: 'Great! Let me know your availability.', time: '19:58', isOutgoing: false, date: 'March 10' },
    ]
  });

  const handleSendMessage = (message: string) => {
    const newMessage = {
      id: Date.now().toString(),
      text: message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOutgoing: true,
      date: 'March 10' // Use a proper date function
    };
    
    setChatData(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage]
    }));
  };

  // Group messages by date
  const groupedMessages: Record<string, typeof chatData.messages> = {};
  chatData.messages.forEach(message => {
    if (!groupedMessages[message.date]) {
      groupedMessages[message.date] = [];
    }
    groupedMessages[message.date].push(message);
  });

  const shouldShowAvatar = (messages: typeof chatData.messages, index: number) => {
    // Show avatar only for the last message in a sequence from the same sender
    if (index === messages.length - 1) return true;
    
    const currentMessage = messages[index];
    const nextMessage = messages[index + 1];
    
    return currentMessage.isOutgoing !== nextMessage.isOutgoing;
  };

  return (
    <SafeAreaView style={styles.container}>
        
      { // Override the header instead
      /* <ChatHeader 
        name={chatData.contact.name} 
        avatar={chatData.contact.avatar} 
      /> */}
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
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
        
        <MessageInput onSendMessage={handleSendMessage} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171617',
  },
  messagesContainer: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  messageContent: {
    paddingBottom: 10,
  }
});
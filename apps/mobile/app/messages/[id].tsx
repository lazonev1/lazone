import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Pressable, Image, ScrollView, TextInput, TouchableOpacity, Appearance, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Audio } from 'expo-av';
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
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const styles = createStyles(theme, colorScheme);

  const { user } = useAuth();
  const userId = user?.uid ?? '';
  const insets = useSafeAreaInsets();

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
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
      if (id && userId) {
        messageRepository.setTypingStatus(id, userId, false);
      }
    };
  }, [id, userId]);

  const formatDuration = (durationMillis: number) => {
    const totalSeconds = Math.floor(durationMillis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleVoiceRecord = useCallback(async () => {
    if (!userId) return;

    if (isRecording) {
      const activeRecording = recordingRef.current;
      if (!activeRecording) {
        setIsRecording(false);
        return;
      }

      try {
        await activeRecording.stopAndUnloadAsync();
        const status = await activeRecording.getStatusAsync();
        recordingRef.current = null;
        setIsRecording(false);

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
        });

        const durationMillis = status.durationMillis ?? 0;
        const voiceNoteText = `🎤 Voice note (${formatDuration(durationMillis)})`;
        await sendMessage(userId, voiceNoteText);
      } catch (err) {
        console.error('Failed to stop recording:', err);
        setIsRecording(false);
        recordingRef.current = null;
        Alert.alert('Error', 'Failed to save voice note. Please try again.');
      }
      return;
    }

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone permission needed', 'Please allow microphone access to record voice notes.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
      Alert.alert('Error', 'Could not start voice recording.');
    }
  }, [isRecording, sendMessage, userId]);

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
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.tint} />
        <ThemedText style={{ marginTop: 12 }}>Loading conversation...</ThemedText>
      </SafeAreaView>
    );
  }

  const contactName = name ?? 'Conversation';
  const contactAvatar = avatar ? { uri: avatar } : require('@/assets/images/avatar-placeholder.png');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        style={styles.keyboardAvoid}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : insets.bottom}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messageContent}
          keyboardShouldPersistTaps="handled"
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

        <View style={[styles.inputContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 }]}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity style={styles.inputButton} onPress={() => Alert.alert('Coming soon')}>
              <Ionicons name='add-outline' size={24} color='#0A58A5' />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Message"
              placeholderTextColor={theme.tabIconDefault}
              value={messageText}
              onChangeText={handleTextChange}
              multiline
            />
          </View>

          <TouchableOpacity
            style={[styles.voiceButton, isRecording && styles.voiceButtonRecording]}
            onPress={handleVoiceRecord}
          >
            <Ionicons name={isRecording ? 'stop' : 'mic'} size={20} color='#fff' />
          </TouchableOpacity>

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
    inputWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colorScheme === 'dark' ? '#2b2b2b' : '#f4f4f4',
      borderRadius: 24,
      marginRight: 8,
      paddingLeft: 8,
      paddingRight: 4,
      maxHeight: 100,
    },
    inputButton: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: 4,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: theme.text,
      paddingVertical: 10,
      paddingHorizontal: 8,
    },
    sendButton: {
      backgroundColor: '#0A58A5',
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    voiceButton: {
      backgroundColor: '#0A58A5',
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
    },
    voiceButtonRecording: {
      backgroundColor: '#C0392B',
    },
    sendButtonDisabled: {
      backgroundColor: '#0A58A5AA',
    },
  });
}
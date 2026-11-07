import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Image, FlatList, TextInput, TouchableOpacity, Appearance, Alert, ActivityIndicator, useWindowDimensions, AppState, AppStateStatus, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import MessageBubble from '@/components/chat/MessageBubble';
import DateDivider from '@/components/chat/DateDivider';
import { useConversationPeer, useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/auth';
import * as messageRepository from '@/repositories/messageRepository';
import { formatDateDivider } from '@/backend/main/src/utils/utils';
import { useTranslation } from 'react-i18next';

export default function ConversationScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const conversationId = Array.isArray(params.id) ? params.id[0] : params.id;
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const scrollRef = useRef<FlatList<DisplayItem> | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingSentRef = useRef(false);
  const lastMarkedReadRef = useRef<string | null>(null);
  const initialScrollCompleteRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const latestMessageIdRef = useRef<string | null>(null);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const styles = createStyles(theme, colorScheme);
  const { height: screenHeight } = useWindowDimensions();
  const { t } = useTranslation(['messages', 'common']);

  const { user } = useAuth();
  const userId = user?.uid ?? '';
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    initialScrollCompleteRef.current = false;
    isNearBottomRef.current = true;
    latestMessageIdRef.current = null;
    setShowNewMessage(false);
  }, [conversationId]);

  // Calculate keyboard offset dynamically based on screen size
  const keyboardOffset = Platform.OS === 'ios' ? 90 : Math.max(100, screenHeight * 0.1);

  // Real-time messages subscription
  const {
    peer,
    loading: peerLoading,
    error: peerError,
    retry: retryPeer,
  } = useConversationPeer(conversationId, userId);
  const {
    messages,
    loading,
    error,
    retry: retryMessages,
    sendMessage,
    retryMessage,
    loadOlder,
    hasOlder,
    loadingOlder,
    olderError,
  } = useMessages(
    peer ? conversationId : undefined,
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  // Mark only the latest visible incoming message as read while this screen is
  // focused and the app is active. This avoids background read receipts.
  useEffect(() => {
    if (!conversationId || !userId || !isFocused || appState !== 'active' || error) return;
    const latestIncoming = [...messages].reverse().find((message) => message.senderId !== userId);
    if (!latestIncoming) return;
    const readKey = `${conversationId}:${latestIncoming._id}`;
    if (lastMarkedReadRef.current === readKey) return;
    lastMarkedReadRef.current = readKey;
    void messageRepository.updateReadStatus(conversationId, userId).catch((readError) => {
      lastMarkedReadRef.current = null;
      console.warn('Unable to update conversation read status:', readError);
    });
  }, [appState, conversationId, error, isFocused, messages, userId]);

  // Follow only the newest message. Loading history at the top must preserve
  // position, and incoming messages must not interrupt someone reading it.
  useEffect(() => {
    const latest = messages.at(-1);
    if (!latest || latestMessageIdRef.current === latest._id) return;
    latestMessageIdRef.current = latest._id;
    if (!initialScrollCompleteRef.current || isNearBottomRef.current || latest.senderId === userId) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: initialScrollCompleteRef.current }), 50);
      setShowNewMessage(false);
    } else {
      setShowNewMessage(true);
    }
  }, [messages, userId]);

  const clearTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (!typingSentRef.current || !conversationId || !userId) return;
    typingSentRef.current = false;
    void messageRepository.setTypingStatus(conversationId, userId, false).catch((typingError) => {
      console.warn('Unable to clear typing status:', typingError);
    });
  }, [conversationId, userId]);

  // Send one typing=true transition per burst, then debounce the clear. The
  // conversation list also expires stale remote indicators after five seconds.
  const handleTextChange = useCallback((text: string) => {
    setMessageText(text);
    if (!text.trim() || !conversationId || !userId || !isFocused || appState !== 'active') {
      clearTyping();
      return;
    }
    if (!typingSentRef.current) {
      typingSentRef.current = true;
      void messageRepository.setTypingStatus(conversationId, userId, true).catch((typingError) => {
        typingSentRef.current = false;
        console.warn('Unable to update typing status:', typingError);
      });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(clearTyping, 2000);
  }, [appState, clearTyping, conversationId, isFocused, userId]);

  useEffect(() => {
    if (!isFocused || appState !== 'active') clearTyping();
  }, [appState, clearTyping, isFocused]);

  // Clean up typing status on unmount
  useEffect(() => {
    return () => {
      clearTyping();
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, [clearTyping]);

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
        const voiceNoteText = t('chat.voiceNote', { duration: formatDuration(durationMillis) });
        await sendMessage(userId, voiceNoteText);
      } catch (err) {
        console.error('Failed to stop recording:', err);
        setIsRecording(false);
        recordingRef.current = null;
        Alert.alert(t('common:alerts.error'), t('chat.voiceSaveFailed'));
      }
      return;
    }

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('chat.micPermissionTitle'), t('chat.micPermissionMessage'));
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
      Alert.alert(t('common:alerts.error'), t('chat.voiceStartFailed'));
    }
  }, [isRecording, sendMessage, userId, t]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !userId) return;

    const text = messageText.trim();
    setMessageText('');

    clearTyping();

    try {
      await sendMessage(userId, text);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // Group messages by date for display
  type DisplayMessage = {
    id: string;
    text: string;
    time: string;
    isOutgoing: boolean;
    date: string;
    deliveryStatus?: 'pending' | 'sent' | 'failed';
  };

  type DisplayItem =
    | { kind: 'date'; id: string; date: string }
    | { kind: 'message'; id: string; message: DisplayMessage; showAvatar: boolean };

  const displayMessages: DisplayMessage[] = messages.map(msg => {
    const msgDate = new Date(msg.createdAt);
    return {
      id: msg._id,
      text: msg.text,
      time: msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOutgoing: msg.senderId === userId,
      date: formatDateDivider(msg.createdAt),
      deliveryStatus: msg.deliveryStatus,
    };
  });

  const displayItems: DisplayItem[] = [];
  displayMessages.forEach((message, index) => {
    if (index === 0 || displayMessages[index - 1].date !== message.date) {
      displayItems.push({ kind: 'date', id: `date-${message.id}`, date: message.date });
    }
    const next = displayMessages[index + 1];
    displayItems.push({
      kind: 'message',
      id: message.id,
      message,
      showAvatar: !message.isOutgoing && (!next || next.date !== message.date || next.isOutgoing),
    });
  });

  const handleListScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    isNearBottomRef.current = contentSize.height - layoutMeasurement.height - contentOffset.y < 96;
    if (isNearBottomRef.current) setShowNewMessage(false);
  };

  if ((loading || peerLoading) && messages.length === 0 && !peerError) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.tint} />
        <ThemedText style={{ marginTop: 12 }}>{t('chat.loading')}</ThemedText>
      </SafeAreaView>
    );
  }

  const contactName = peer?.name ?? (peerLoading ? t('chat.loading') : t('chat.unavailableParticipant'));
  const contactAvatar = peer?.avatar ? { uri: peer.avatar } : require('@/assets/images/avatar-placeholder.png');
  const loadError = error || peerError;
  const retry = () => {
    retryMessages();
    retryPeer();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View style={styles.header}>
              <Image
                source={contactAvatar}
                style={styles.avatar}
              />
              <View style={styles.headerInfo}>
                <ThemedText style={styles.headerTitle}>
                  {contactName}
                </ThemedText>
              </View>
            </View>
          ),
          headerStyle: {
            backgroundColor: theme.background
          },
          headerTintColor: theme.tint,
          headerShadowVisible: false,
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
        keyboardVerticalOffset={keyboardOffset}
      >
        <FlatList
          ref={scrollRef}
          data={displayItems}
          keyExtractor={(item) => item.id}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messageContent}
          keyboardShouldPersistTaps="handled"
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          onScroll={handleListScroll}
          scrollEventThrottle={100}
          onContentSizeChange={() => {
            if (initialScrollCompleteRef.current || displayItems.length === 0) return;
            initialScrollCompleteRef.current = true;
            scrollRef.current?.scrollToEnd({ animated: false });
          }}
          ListHeaderComponent={<>
            {hasOlder && (
              <TouchableOpacity
                style={styles.loadOlderButton}
                onPress={() => void loadOlder()}
                disabled={loadingOlder}
                accessibilityRole="button"
                accessibilityLabel={t('chat.loadOlder')}
              >
                {loadingOlder
                  ? <ActivityIndicator color={theme.tint} />
                  : <ThemedText style={styles.retryText}>{t('chat.loadOlder')}</ThemedText>}
              </TouchableOpacity>
            )}
            {olderError && (
              <ThemedText style={styles.olderError} accessibilityRole="alert">
                {t('chat.loadOlderFailed')}
              </ThemedText>
            )}
            {loadError && (
            <View style={styles.errorBanner} accessibilityRole="alert">
              <ThemedText style={styles.errorText}>{t('chat.loadError')}</ThemedText>
              <TouchableOpacity onPress={retry} accessibilityRole="button">
                <ThemedText style={styles.retryText}>{t('chat.retry')}</ThemedText>
              </TouchableOpacity>
            </View>
            )}
          </>}
          renderItem={({ item }) => item.kind === 'date'
            ? <DateDivider date={item.date} />
            : <MessageBubble
                message={item.message.text}
                time={item.message.time}
                isOutgoing={item.message.isOutgoing}
                deliveryStatus={item.message.deliveryStatus}
                statusLabel={item.message.deliveryStatus === 'pending'
                  ? t('chat.sending')
                  : item.message.deliveryStatus === 'failed'
                    ? t('chat.notSent')
                    : undefined}
                retryLabel={item.message.deliveryStatus === 'failed' ? t('chat.retrySend') : undefined}
                onRetry={item.message.deliveryStatus === 'failed'
                  ? () => void retryMessage(item.message.id)
                  : undefined}
                senderAvatar={item.showAvatar ? contactAvatar : undefined}
              />}
        />

        {showNewMessage && (
          <TouchableOpacity
            style={styles.newMessageButton}
            onPress={() => {
              scrollRef.current?.scrollToEnd({ animated: true });
              setShowNewMessage(false);
            }}
            accessibilityRole="button"
            accessibilityLabel={t('chat.newMessage')}
          >
            <ThemedText style={styles.newMessageText}>{t('chat.newMessage')}</ThemedText>
          </TouchableOpacity>
        )}

        {!peerError && <View style={[styles.inputContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 }]}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity
              style={styles.inputButton}
              onPress={() => Alert.alert(t('chat.comingSoon'))}
              accessibilityRole="button"
              accessibilityLabel={t('chat.addAttachment')}
            >
              <Ionicons name='add-outline' size={24} color='#0A58A5' />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder={t('chat.inputPlaceholder')}
              placeholderTextColor={theme.tabIconDefault}
              value={messageText}
              onChangeText={handleTextChange}
              multiline
              maxLength={4000}
              accessibilityLabel={t('chat.inputPlaceholder')}
            />
          </View>

          <TouchableOpacity
            style={[styles.voiceButton, isRecording && styles.voiceButtonRecording]}
            onPress={handleVoiceRecord}
            accessibilityRole="button"
            accessibilityLabel={isRecording ? t('chat.stopRecording') : t('chat.recordVoice')}
          >
            <Ionicons name={isRecording ? 'stop' : 'mic'} size={20} color='#fff' />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
            disabled={!messageText.trim()}
            onPress={handleSendMessage}
            accessibilityRole="button"
            accessibilityLabel={t('chat.sendMessage')}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>}
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
    messagesContainer: {
      flex: 1,
      paddingHorizontal: 12,
    },
    messageContent: {
      paddingBottom: 10,
    },
    errorText: {
      color: '#C0392B',
      flex: 1,
    },
    errorBanner: {
      marginVertical: 12,
      padding: 12,
      borderRadius: 8,
      backgroundColor: '#FDECEA',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    retryText: {
      color: '#0A58A5',
      fontWeight: '700',
    },
    loadOlderButton: {
      alignSelf: 'center',
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: 16,
      marginVertical: 8,
    },
    olderError: {
      color: '#C0392B',
      textAlign: 'center',
      marginHorizontal: 16,
      marginBottom: 8,
    },
    newMessageButton: {
      alignSelf: 'center',
      backgroundColor: '#0A58A5',
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginBottom: 6,
    },
    newMessageText: {
      color: '#FFFFFF',
      fontWeight: '700',
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
      width: 44,
      height: 44,
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
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    voiceButton: {
      backgroundColor: '#0A58A5',
      width: 44,
      height: 44,
      borderRadius: 22,
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

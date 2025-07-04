import React from 'react';
import { View, StyleSheet, Image, Appearance } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';

type Props = {
  message: string;
  time: string;
  isOutgoing: boolean;
  senderAvatar?: any;
  attachment?: any;
};

export default function MessageBubble({ message, time, isOutgoing, senderAvatar, attachment }: Props) {
  // Do nothing with attachment for now.
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <View style={[
      styles.container,
      isOutgoing ? styles.outgoingContainer : styles.incomingContainer,
      !isOutgoing && !senderAvatar && { paddingLeft: 40 }
    ]}>
      {!isOutgoing && senderAvatar && (
        <Image source={senderAvatar} style={styles.avatar} />
      )}

      <View style={[
        styles.bubble,
        isOutgoing ? styles.outgoingBubble : styles.incomingBubble,
        isOutgoing ? { backgroundColor: '#0A58A5' } :
          { backgroundColor: colorScheme === 'dark' ? '#2b2b2b' : '#eaeaea' }
      ]}>
        <ThemedText style={[styles.messageText, isOutgoing && styles.outgoingText]}>
          {message}
        </ThemedText>
        <ThemedText style={[styles.timeText, isOutgoing && styles.outgoingTimeText]}>
          {time}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  outgoingContainer: {
    justifyContent: 'flex-end',
  },
  incomingContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  outgoingBubble: {
    backgroundColor: '#0A58A5',
    borderTopRightRadius: 4,
  },
  incomingBubble: {
    borderTopLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
  },
  outgoingText: {
    color: '#ffffff',
  },
  timeText: {
    fontSize: 11,
    alignSelf: 'flex-end',
    marginTop: 4,
    opacity: 0.7,
  },
  outgoingTimeText: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
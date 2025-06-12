import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Image } from 'react-native';

type Props = {
  message: string;
  time: string;
  isOutgoing: boolean;
  senderAvatar?: string;
};

export default function MessageBubble({ message, time, isOutgoing, senderAvatar }: Props) {
  return (
    <View style={[
      styles.container,
      isOutgoing ? styles.outgoingContainer : styles.incomingContainer,
      // Add conditional style for avatar presence
      !isOutgoing && senderAvatar ? styles.incomingContainerWithAvatar : null
    ]}>
      {!isOutgoing && senderAvatar && (
        <Image source={{ uri: senderAvatar }} style={styles.avatar} />
      )}
      
      <View style={[
        styles.bubble,
        isOutgoing ? styles.outgoingBubble : styles.incomingBubble
      ]}>
        <ThemedText style={styles.messageText}>{message}</ThemedText>
        <ThemedText style={styles.timeText}>{time}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  outgoingContainer: {
    justifyContent: 'flex-end',
  },
  incomingContainer: {
    justifyContent: 'flex-start',
    // Add padding to maintain alignment when avatar is missing
    paddingLeft: 40, // Width of avatar (32) + margin (8)
  },
  incomingContainerWithAvatar: {
    paddingLeft: 0,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  outgoingBubble: {
    backgroundColor: '#0078d7',
    borderTopRightRadius: 4,
  },
  incomingBubble: {
    backgroundColor: '#2a2a2a',
    borderTopLeftRadius: 4,
  },
  messageText: {
    color: '#ffffff',
    fontSize: 16,
  },
  timeText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
});
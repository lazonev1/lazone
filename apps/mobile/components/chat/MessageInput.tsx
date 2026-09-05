import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TextInput } from '@lazone/ui';
import { useTranslation } from 'react-i18next';

type Props = {
  onSendMessage: (message: string) => void;
};

export default function MessageInput({ onSendMessage }: Props) {
  const { t } = useTranslation('messages');
  const [message, setMessage] = useState('');
  
  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };
  
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.emojiButton}>
        {/* todo: Decid between Ionicons and SF icons late*/}
        <Ionicons name="happy-outline" size={24} color="#888" />
      </TouchableOpacity>
      
      <TextInput
        style={styles.input}
        placeholder={t('chat.inputPlaceholder')}
        placeholderTextColor="#888"
        value={message}
        onChangeText={setMessage}
        multiline
      />
      
      <TouchableOpacity style={styles.attachButton}>
        <Ionicons name="add-circle-outline" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#171617',
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  emojiButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 24,
    marginHorizontal: 8,
  },
  attachButton: {
    padding: 8,
  },
});
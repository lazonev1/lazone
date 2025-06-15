import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  name: string;
  avatar?: string;
};

export default function ChatHeader({ name, avatar }: Props) {
  const router = useRouter();
  
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={24} color="#fff" />
      </TouchableOpacity>
      
      <View style={styles.profileContainer}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder} />
        )}
        <ThemedText type="title" style={styles.name}>{name}</ThemedText>
      </View>
      
      <TouchableOpacity style={styles.infoButton}>
        <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#171617',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  backButton: {
    padding: 4,
  },
  profileContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
  },
  avatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#444',
    marginRight: 10,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  infoButton: {
    padding: 8,
  },
});
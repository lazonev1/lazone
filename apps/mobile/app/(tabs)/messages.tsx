import { SafeAreaView, StyleSheet } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import MessageList from '../messages/messages';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useNavigation } from 'expo-router';
import { useEffect } from 'react';
export default function Messages() {
      const navigation = useNavigation()
  
      useEffect(() => {
          navigation.setOptions({ title: 'Messages' });
      }, []);
  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        {/* This is decorative  for now. Will be useful for additional features/actions user can take at the main message screen... */}
        <View style={styles.options}>
            <TouchableOpacity style={styles.infoButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
            </TouchableOpacity>
        </View>
        <MessageList/>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#171617',
  }, 
  infoButton: {
    padding: 8
  },
   options: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    width: '100%'
   }
});

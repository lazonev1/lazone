import messaging from '@react-native-firebase/messaging';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  if (remoteMessage?.data?.type === 'new_message') {
    console.log('Background new_message received', remoteMessage.data);
  }
});

import 'expo-router/entry';

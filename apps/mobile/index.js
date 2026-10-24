import 'expo-router/entry';

import {
  getMessaging,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';

setBackgroundMessageHandler(getMessaging(), async remoteMessage => {
  if (remoteMessage?.data?.type === 'new_message') {
    console.log('Background new_message received', remoteMessage.data);
  }
});

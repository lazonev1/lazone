import 'expo-router/entry';

import {
  getMessaging,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';
import { firebaseEmulators } from './backend/main/src/config/firebaseEnvironment';

if (!firebaseEmulators) {
  setBackgroundMessageHandler(getMessaging(), async () => {
    // Foreground and notification-open navigation are handled in the app.
  });
}

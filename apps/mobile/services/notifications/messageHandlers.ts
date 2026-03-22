import { Alert, DeviceEventEmitter } from 'react-native';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { Router } from 'expo-router';

export const SHOW_NOTIFICATION_BANNER = 'SHOW_NOTIFICATION_BANNER';

function handleNewMessageNavigation(
  router: Router,
  remoteMessage: FirebaseMessagingTypes.RemoteMessage
) {
  const conversationId = remoteMessage.data?.conversationId;
  if (!conversationId) return;

  router.push({
    pathname: '/messages/[id]',
    params: {
      id: conversationId,
      name: remoteMessage.data?.senderName ?? 'Conversation',
      avatar: remoteMessage.data?.senderAvatar ?? '',
    },
  });
}

function isNewMessageNotification(
  remoteMessage: FirebaseMessagingTypes.RemoteMessage
): boolean {
  return remoteMessage.data?.type === 'new_message';
}

export function registerForegroundMessageHandler(getCurrentPath: () => string | null) {
  return messaging().onMessage(async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
    if (!isNewMessageNotification(remoteMessage)) return;

    // Suppress notification if user is already in this specific conversation
    const conversationId = remoteMessage.data?.conversationId;
    const currentPath = getCurrentPath();
    if (conversationId && currentPath === `/messages/${conversationId}`) {
      return;
    }

    const senderName = remoteMessage.data?.senderName ?? 'New message';
    const preview = remoteMessage.data?.preview ?? 'You received a new message.';
    
    DeviceEventEmitter.emit(SHOW_NOTIFICATION_BANNER, {
      title: senderName,
      message: preview,
      conversationId: remoteMessage.data?.conversationId,
      avatar: remoteMessage.data?.senderAvatar,
    });
  });
}

export function registerNotificationOpenHandlers(router: Router) {
  const unsubscribe = messaging().onNotificationOpenedApp((remoteMessage: any) => {
    if (!remoteMessage || !isNewMessageNotification(remoteMessage)) return;
    handleNewMessageNavigation(router, remoteMessage);
  });

  messaging()
    .getInitialNotification()
    .then((remoteMessage: any) => {
      if (!remoteMessage || !isNewMessageNotification(remoteMessage)) return;
      handleNewMessageNavigation(router, remoteMessage);
    })
    .catch((error: any) => {
      console.warn('Failed to process initial notification:', error);
    });

  return unsubscribe;
}

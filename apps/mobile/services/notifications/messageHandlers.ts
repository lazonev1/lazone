import { DeviceEventEmitter } from 'react-native';
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

function handleBookingStatusNavigation(
  router: Router,
  remoteMessage: FirebaseMessagingTypes.RemoteMessage
) {
  const bookingId = remoteMessage.data?.bookingId;
  if (!bookingId) return;
  router.push({ pathname: '/booking/[id]', params: { id: bookingId } });
}

function isNewMessageNotification(
  remoteMessage: FirebaseMessagingTypes.RemoteMessage
): boolean {
  return remoteMessage.data?.type === 'new_message';
}

function isBookingStatusNotification(
  remoteMessage: FirebaseMessagingTypes.RemoteMessage
): boolean {
  return remoteMessage.data?.type === 'booking_status';
}

export function registerForegroundMessageHandler(getCurrentPath: () => string | null) {
  return messaging().onMessage(async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
    if (!isNewMessageNotification(remoteMessage) && !isBookingStatusNotification(remoteMessage)) return;

    if (isBookingStatusNotification(remoteMessage)) {
      DeviceEventEmitter.emit(SHOW_NOTIFICATION_BANNER, {
        title: remoteMessage.notification?.title ?? 'Booking update',
        message: remoteMessage.notification?.body ?? 'Your booking has been updated.',
        bookingId: remoteMessage.data?.bookingId,
      });
      return;
    }

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
  const unsubscribe = messaging().onNotificationOpenedApp(
    (remoteMessage: FirebaseMessagingTypes.RemoteMessage | null) => {
      if (!remoteMessage) return;
      if (isBookingStatusNotification(remoteMessage)) handleBookingStatusNavigation(router, remoteMessage);
      else if (isNewMessageNotification(remoteMessage)) handleNewMessageNavigation(router, remoteMessage);
    }
  );

  messaging()
    .getInitialNotification()
    .then((remoteMessage: FirebaseMessagingTypes.RemoteMessage | null) => {
      if (!remoteMessage) return;
      if (isBookingStatusNotification(remoteMessage)) handleBookingStatusNavigation(router, remoteMessage);
      else if (isNewMessageNotification(remoteMessage)) handleNewMessageNavigation(router, remoteMessage);
    })
    .catch((error: any) => {
      console.warn('Failed to process initial notification:', error);
    });

  return unsubscribe;
}

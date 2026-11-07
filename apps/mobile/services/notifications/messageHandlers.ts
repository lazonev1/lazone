import { DeviceEventEmitter } from 'react-native';
import {
  getInitialNotification,
  getMessaging,
  onMessage,
  onNotificationOpenedApp,
  RemoteMessage,
} from '@react-native-firebase/messaging';
import type { ImperativeRouter } from 'expo-router';

export const SHOW_NOTIFICATION_BANNER = 'SHOW_NOTIFICATION_BANNER';
const messaging = getMessaging();

function handleNewMessageNavigation(
  router: ImperativeRouter,
  remoteMessage: RemoteMessage
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
  router: ImperativeRouter,
  remoteMessage: RemoteMessage
) {
  const bookingId = remoteMessage.data?.bookingId;
  if (!bookingId) return;
  router.push({ pathname: '/booking/[id]', params: { id: bookingId } });
}

function isNewMessageNotification(
  remoteMessage: RemoteMessage
): boolean {
  return remoteMessage.data?.type === 'new_message';
}

function isBookingStatusNotification(
  remoteMessage: RemoteMessage
): boolean {
  return remoteMessage.data?.type === 'booking_status';
}

export function registerForegroundMessageHandler(getCurrentPath: () => string | null) {
  return onMessage(messaging, async (remoteMessage: RemoteMessage) => {
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

export function registerNotificationOpenHandlers(router: ImperativeRouter) {
  const unsubscribe = onNotificationOpenedApp(
    messaging,
    (remoteMessage: RemoteMessage | null) => {
      if (!remoteMessage) return;
      if (isBookingStatusNotification(remoteMessage)) handleBookingStatusNavigation(router, remoteMessage);
      else if (isNewMessageNotification(remoteMessage)) handleNewMessageNavigation(router, remoteMessage);
    }
  );

  getInitialNotification(messaging)
    .then((remoteMessage: RemoteMessage | null) => {
      if (!remoteMessage) return;
      if (isBookingStatusNotification(remoteMessage)) handleBookingStatusNavigation(router, remoteMessage);
      else if (isNewMessageNotification(remoteMessage)) handleNewMessageNavigation(router, remoteMessage);
    })
    .catch((error: any) => {
      console.warn('Failed to process initial notification:', error);
    });

  return unsubscribe;
}

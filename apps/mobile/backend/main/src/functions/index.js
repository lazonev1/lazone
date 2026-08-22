const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

const USERS_COLLECTION = 'users';
const CONVERSATIONS_COLLECTION = 'conversations';
const INVALID_TOKEN_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
  'messaging/invalid-argument',
]);

function trimPreview(text, maxLength = 140) {
  const normalized = (text || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1)}…`;
}

function uniqueTokens(tokens) {
  if (!Array.isArray(tokens)) {
    return [];
  }

  return [...new Set(tokens.filter((token) => typeof token === 'string' && token.length > 0))];
}

async function removeInvalidTokens(userTokensMap, invalidTokens) {
  if (!invalidTokens.length) {
    return;
  }

  const writes = [];

  for (const [userId, tokens] of userTokensMap.entries()) {
    const tokensToRemove = tokens.filter((token) => invalidTokens.includes(token));

    if (!tokensToRemove.length) {
      continue;
    }

    writes.push(
      db.collection(USERS_COLLECTION).doc(userId).update({
        notificationTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    );
  }

  if (!writes.length) {
    return;
  }

  await Promise.allSettled(writes);
}

exports.sendNewMessageNotification = onDocumentCreated(
  {
    document: `${CONVERSATIONS_COLLECTION}/{conversationId}/messages/{messageId}`,
    region: 'us-central1',
    retry: true,
  },
  async (event) => {
    const snapshot = event.data;

    if (!snapshot) {
      logger.warn('No snapshot provided for message event.', event.params);
      return;
    }

    const messageData = snapshot.data() || {};
    const conversationId = event.params.conversationId;
    const messageId = event.params.messageId;

    const senderId = messageData.senderId;
    const messageText = messageData.text || '';

    if (!senderId || !conversationId) {
      logger.warn('Missing required message fields.', {
        conversationId,
        messageId,
      });
      return;
    }

    const conversationRef = db.collection(CONVERSATIONS_COLLECTION).doc(conversationId);
    const conversationSnapshot = await conversationRef.get();

    if (!conversationSnapshot.exists) {
      logger.warn('Conversation not found for message notification.', {
        conversationId,
        messageId,
      });
      return;
    }

    const conversation = conversationSnapshot.data() || {};
    const participants = Array.isArray(conversation.participants) ? conversation.participants : [];
    const recipientIds = participants.filter((participantId) => participantId && participantId !== senderId);

    if (!recipientIds.length) {
      logger.info('No recipients found for message notification.', {
        conversationId,
        messageId,
      });
      return;
    }

    const participantDetails = conversation.participantDetails || {};
    const senderDetails = participantDetails[senderId] || {};
    const senderName = senderDetails.name || 'New message';
    const senderAvatar = senderDetails.avatar || '';
    const preview = trimPreview(messageText, 120);

    const userSnapshots = await Promise.all(
      recipientIds.map((recipientId) => db.collection(USERS_COLLECTION).doc(recipientId).get())
    );

    const allTokens = [];
    const userTokensMap = new Map();

    userSnapshots.forEach((userSnapshot, index) => {
      if (!userSnapshot.exists) {
        return;
      }

      const userData = userSnapshot.data() || {};
      const userId = recipientIds[index];
      const tokens = uniqueTokens(userData.notificationTokens || userData.tokens || []);

      if (!tokens.length) {
        return;
      }

      userTokensMap.set(userId, tokens);
      allTokens.push(...tokens);
    });

    if (!allTokens.length) {
      logger.info('No notification tokens found for recipients.', {
        conversationId,
        messageId,
        recipientIds,
      });
      return;
    }

    const payload = {
      tokens: uniqueTokens(allTokens),
      notification: {
        title: senderName,
        body: preview || 'You received a new message.',
      },
      data: {
        type: 'new_message',
        conversationId,
        messageId,
        senderId,
        senderName,
        senderAvatar,
        preview,
      },
      android: {
        priority: 'high',
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
            sound: 'default',
          },
        },
        headers: {
          'apns-push-type': 'alert',
          'apns-priority': '10',
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(payload);

    const invalidTokens = [];
    response.responses.forEach((sendResult, index) => {
      if (!sendResult.error) {
        return;
      }

      const code = sendResult.error.code;
      if (INVALID_TOKEN_CODES.has(code)) {
        invalidTokens.push(payload.tokens[index]);
      }
    });

    await removeInvalidTokens(userTokensMap, invalidTokens);

    logger.info('Processed new_message notification send.', {
      conversationId,
      messageId,
      recipients: recipientIds.length,
      tokenCount: payload.tokens.length,
      successCount: response.successCount,
      failureCount: response.failureCount,
      cleanedInvalidTokens: invalidTokens.length,
    });
  }
);

exports.sendBookingStatusNotification = onDocumentUpdated(
  {
    document: 'bookings/{bookingId}',
    region: 'us-central1',
    retry: true,
  },
  async (event) => {
    const before = event.data?.before?.data() || {};
    const after = event.data?.after?.data() || {};
    const bookingId = event.params.bookingId;

    if (!bookingId || before.status === after.status) return;

    let recipientId;
    let title;
    let body;
    if (after.status === 'awaiting_confirmation') {
      recipientId = after.requesterId;
      title = 'Service ready for your review';
      body = `${after.providerName || 'Your provider'} submitted the service for confirmation.`;
    } else if (before.status === 'awaiting_confirmation' && after.status === 'in_progress') {
      recipientId = after.providerId;
      title = 'Changes requested';
      body = `${after.requesterName || 'The requester'} requested changes before confirming the service.`;
    } else if (after.status === 'completed') {
      recipientId = after.providerId;
      title = 'Service confirmed';
      body = `${after.requesterName || 'The requester'} confirmed the service is complete.`;
    }

    if (!recipientId) return;
    const userSnapshot = await db.collection(USERS_COLLECTION).doc(recipientId).get();
    if (!userSnapshot.exists) return;
    const userData = userSnapshot.data() || {};
    const tokens = uniqueTokens(userData.notificationTokens || userData.tokens || []);
    if (!tokens.length) return;

    const payload = {
      tokens,
      notification: { title, body },
      data: {
        type: 'booking_status',
        bookingId,
        status: after.status,
      },
      android: { priority: 'high' },
      apns: {
        payload: { aps: { contentAvailable: true, sound: 'default' } },
        headers: { 'apns-push-type': 'alert', 'apns-priority': '10' },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(payload);
    const invalidTokens = response.responses
      .map((result, index) => result.error && INVALID_TOKEN_CODES.has(result.error.code) ? tokens[index] : null)
      .filter(Boolean);
    await removeInvalidTokens(new Map([[recipientId, tokens]]), invalidTokens);
  }
);

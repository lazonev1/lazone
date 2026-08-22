# LaZone Cloud Functions

Contains server-side Firebase Cloud Functions for push notifications.

## What is implemented

- `sendNewMessageNotification`
  - Trigger: `conversations/{conversationId}/messages/{messageId}` document create
  - Sends FCM notification/data payload to recipient device tokens
  - Cleans invalid tokens from user documents (`notificationTokens`)
- `sendBookingStatusNotification`
  - Trigger: `bookings/{bookingId}` document update
  - Notifies the requester when delivery is submitted for review, and notifies
    the provider when changes are requested or completion is confirmed

## Expected Firestore fields

- Conversation doc (`conversations/{conversationId}`):
  - `participants: string[]`
  - `participantDetails: { [userId]: { name: string, avatar?: string } }`
- User doc (`users/{userId}`):
  - `notificationTokens: string[]`

## Install

- `pnpm install` 
- The `RNFirebase` module also require an EAS build. Android is already built and tested.


## Local Emulation & Testing

### 1. Install Firebase CLI
Install the Firebase CLI (globally):
```bash
pnpm install -g firebase-tools
```
### 2. Configure Environment Variables
Inside `apps/mobile`, create `.env.local` file.
```env
EXPO_PUBLIC_USE_FIRESTORE_EMULATOR=true
EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST=192.168.1.126
```
- Using `localhost` or `127.0.0.1` works for iOS simulators but fails on physical devices and Android emulators. Using `10.0.2.2` works for Android but breaks iOS. Binding to your machine's local IP address (e.g., `192.168.1.126`) ensures that **both** physical devices on the same WiFi and emulators can successfully reach the local database. `firebase.json` already binds the emulators to `0.0.0.0` to allow external network traffic.*

### 3. Start the Emulator
Run the functions and firebase emulators in `apps/mobile`. (This also saves generated user data on exit and loads on start):
```bash
pnpm run serve
```
### 4. Test Notification Functionality
1. Local database firestore emulator is initially blank. Generate new test users manually.
2. Send message between the users and check notification on receiving device.

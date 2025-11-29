# LaZone Monorepo

This is the monorepo for the LaZone project, managed with `pnpm`.

## Architecture

The project follows a monorepo structure using `pnpm workspaces`:

- **apps/**: Contains deployable applications.
  - `mobile`: The mobile application source code (Expo + Firebase).
- **packages/**: Shared libraries, UI components, and utilities used across applications.

## Prerequisites

- **Node.js** (v20+)
- **pnpm** (v10+)
- **Expo Account** - Sign up at [expo.dev](https://expo.dev)
- **EAS CLI** - Installed locally in the project
- **Firebase Project** - For backend services

## Firebase Setup (One-time by Project Owner)

These steps have already been completed for this project, but are documented here for reference:

1. **Create Firebase Project** at [console.firebase.google.com](https://console.firebase.google.com)
2. **Create 3 Apps in Firebase Console:**
   - **iOS App**: Bundle ID `com.lazone.serviceApp`
   - **Android App**: Package name `com.lazone.serviceApp`
   - **Web App**: For the JS SDK configuration
3. **Enable Firestore Database:**
   - Go to Firestore Database → Create database
   - Start in **test mode** for development
4. **Download config files:**
   - `google-services.json` (from Android app)
   - `GoogleService-Info.plist` (from iOS app)

## Getting Started (For New Team Members)

### Step 1: Clone and Install

```bash
git clone <repository-url>
cd lazone
pnpm install
```

### Step 2: Get Firebase Config Files

**⚠️ These files are NOT in git (they contain API keys).**

Ask the project owner for:

- `google-services.json`
- `GoogleService-Info.plist`

Place both files in:

```
apps/mobile/google-services.json
apps/mobile/GoogleService-Info.plist
```

### Step 3: Login to EAS

```bash
pnpm eas:login
```

Enter your Expo account credentials.

### Step 4: Install the App on Simulator/Emulator

**For iOS Simulator:**

```bash
pnpm --filter ./apps/mobile exec eas build:run --platform ios
```

**For Android Emulator:**

```bash
pnpm --filter ./apps/mobile exec eas build:run --platform android
```

This downloads the latest build from EAS and installs it on your simulator/emulator.

### Step 5: Start Development Server

```bash
pnpm dev:mobile
```

The app on your simulator will connect to the dev server. Code changes will hot-reload automatically.

## Available Scripts

| Script                   | Description                                                       |
| ------------------------ | ----------------------------------------------------------------- |
| `pnpm dev:mobile`        | Start the Expo development server                                 |
| `pnpm eas:login`         | Login to your Expo/EAS account                                    |
| `pnpm prebuild:mobile`   | Generate native iOS/Android folders locally                       |
| `pnpm build:simulator`   | Build for iOS Simulator + Android APK (no Apple account needed)   |
| `pnpm build:android`     | Build Android only                                                |
| `pnpm build:ios`         | Build iOS only (requires Apple account for real devices)          |
| `pnpm build:mobile:dev`  | Build for real devices (requires Apple Developer account for iOS) |
| `pnpm build:mobile:prod` | Production build for App Store / Play Store                       |

## Build Profiles (eas.json)

| Profile       | iOS                   | Android               | Use Case                            |
| ------------- | --------------------- | --------------------- | ----------------------------------- |
| `simulator`   | Simulator only        | APK                   | Local testing without Apple account |
| `development` | Real device           | APK                   | Testing on physical devices         |
| `preview`     | Internal distribution | Internal distribution | Beta testing                        |
| `production`  | App Store             | Play Store            | Release                             |

## When Do I Need to Rebuild?

**NO rebuild needed for:**

- JavaScript/TypeScript code changes
- React component changes
- Styling changes
- Adding new screens/routes

**Rebuild IS needed for:**

- Adding/removing native packages (e.g., `react-native-*`)
- Changing `app.json` native settings
- Changing `eas.json` build configuration
- Modifying native code (ios/ or android/ folders)

## Troubleshooting

### "Command eas not found"

Run `pnpm eas:login` from the root directory, not inside `apps/mobile`.

### App doesn't connect to dev server

1. Make sure dev server is running: `pnpm dev:mobile`
2. Shake device or press `m` in terminal to open menu
3. Check that your computer and simulator are on the same network

### Firebase errors

1. Verify `google-services.json` and `GoogleService-Info.plist` exist in `apps/mobile/`
2. Check that Firestore is enabled in Firebase Console
3. Ensure Firestore rules allow read/write (test mode)

### iOS build asks for Apple ID

Use the `simulator` profile instead:

```bash
pnpm build:simulator
```

## Project Structure

```
lazone/
├── apps/
│   └── mobile/
│       ├── app/                    # Expo Router screens
│       │   ├── (auth)/             # Auth screens
│       │   ├── (tabs)/             # Tab screens
│       │   └── _layout.tsx         # Root layout
│       ├── components/             # React components
│       ├── contexts/               # React contexts (auth, etc.)
│       ├── hooks/                  # Custom hooks
│       ├── constants/              # Colors, config
│       ├── firebaseConfig.js       # Firebase initialization
│       ├── app.json                # Expo config
│       ├── eas.json                # EAS Build config
│       └── metro.config.js         # Metro bundler config
├── packages/                       # Shared packages
├── package.json                    # Root package.json with scripts
└── pnpm-workspace.yaml             # Workspace config
```

# LaZone Monorepo

This is the monorepo for the LaZone project, managed with `pnpm`.

## Architecture

The project follows a monorepo structure using `pnpm workspaces`:

- **apps/**: Contains deployable applications.
  - `mobile`: The mobile application source code (Expo + Firebase).
- **packages/**: Shared libraries, UI components, and utilities used across applications.

## Getting Started

### Prerequisites

- Node.js
- pnpm
- Firebase Project (for backend services)

### Environment Setup

1. Copy the Firebase configuration keys from your Firebase Console.
2. Update `apps/mobile/firebaseConfig.js` with your credentials.

### Scripts

- `pnpm dev:mobile`: Starts the mobile application development server.
- `pnpm build:mobile:dev`: Creates a Development Build on EAS (for testing on device).
- `pnpm build:mobile:prod`: Creates a Production Build on EAS (for App Store/Play Store).

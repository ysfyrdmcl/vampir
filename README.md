# Vampir Köylü

A real-time social deduction party game for iOS and Android. Players take on hidden roles in a village, gather information, debate suspicious behavior, and vote to uncover the vampires before they take control.

The mobile app guides each match through private role reveals, night actions, daytime discussion, and voting. A dedicated server manages the rules and game state. Players discuss the game in person or through an external voice call while the app handles the match.

**Status:** Early playable version. The current app interface and game text are in Turkish; this README is in English.

## Features

- **Room-based multiplayer:** Create a room, share its code, and join from multiple devices.
- **Human and bot players:** Fill empty seats with random, balanced, or deceptive bots, with distinct personalities and contextual dialogue.
- **Configurable matches:** Choose Beginner, Classic+, or Social Chaos role presets and customize rules and phase timers.
- **Private information:** Secret role reveals, detective results, protection history, and vampire team coordination.
- **Special mechanics:** Mayor elections, daytime protection, a Hunter's last-breath action, and linked Lovers.
- **Game journal:** Review public events, private information, and personal player notes.
- **Session recovery:** Rejoin a surviving room from the same device, with host migration to another connected human player.
- **Gothic presentation:** Illustrated role cards, animated phase transitions, and atmospheric visual effects.
- **Optional AI services:** LLM-generated bot dialogue and embedding-based memory can be enabled on the server. Basic bot play works without external API services.

## How a match works

1. **Create or join a room.** The host chooses the setup. Players join with the room code, and bots can fill the room to its minimum player count.
2. **Get ready and reveal your role.** Each player privately learns their role and relevant team information.
3. **Act at night, discuss during the day.** Active night roles choose their actions. During the day, players compare claims and vote to eliminate a suspect.
4. **Find the winning team.** The village wins when all vampires are eliminated. Vampires win when their surviving numbers equal or exceed the other surviving players.

### Roles

| Role | Ability |
| --- | --- |
| Villager | Uses discussion and daytime votes to identify vampires. |
| Vampire | Chooses a night target with the vampire team while keeping its identity hidden. |
| Detective | Receives a private investigation result about a player. |
| Doctor | Protects a player at night, subject to the room's protection rules. |
| Hunter | Gets a last-breath targeting action when eliminated during the day. |
| Guard | Can protect a player from daytime voting once per game. |

The **Mayor** is an elected position with a double-weight daytime vote. **Lovers** are a hidden link between two players: when one dies, the other dies as well. These are optional mechanics rather than separate night roles.

## Architecture

A TypeScript monorepo managed with npm workspaces:

| Directory | Responsibility | Main technologies |
| --- | --- | --- |
| `apps/mobile` | Mobile UI, navigation, animations, and local session storage | Expo SDK 57, React Native, React Navigation, Reanimated, Zustand |
| `apps/server` | Rooms, authoritative game rules, phase progression, private events, and bots | Node.js, Fastify, Socket.IO, Zod |
| `packages/shared` | Event contracts, game types, role definitions, and rule settings | TypeScript |

The server validates player actions and advances the match. The client renders public state and per-player private updates delivered over Socket.IO.

## Local development

### Prerequisites

- Node.js 22.13 or newer on the 22.x release line, or 24.3 or newer on the 24.x release line, with npm.
- Expo Go compatible with the project's Expo SDK, or a development build.
- An iOS simulator, Android emulator, or physical device. Local native builds require Xcode on macOS for iOS, or the Android toolchain for Android.

### 1. Install dependencies

```bash
git clone https://github.com/ysfyrdmcl/vampir.git
cd vampir
npm install
```

The install script builds `packages/shared` automatically. Run `npm run build:shared` to rebuild it separately.

### 2. Start the server

Create the local server environment file if it does not already exist:

```bash
cp -n apps/server/.env.example apps/server/.env
npm run dev:server
```

The server listens on port `3000` by default and accepts connections on all network interfaces.

### 3. Start the mobile app

Run one of these commands from the repository root in a separate terminal:

```bash
# iOS simulator
EXPO_PUBLIC_SOCKET_URL=http://127.0.0.1:3000 npm run dev:mobile -- --go

# Android emulator
EXPO_PUBLIC_SOCKET_URL=http://10.0.2.2:3000 npm run dev:mobile -- --go

# Physical device: replace the example address with your computer's LAN IP
EXPO_PUBLIC_SOCKET_URL=http://192.168.1.100:3000 npm run dev:mobile -- --go --lan
```

For physical devices, connect the computer and phones to the same Wi-Fi network, keep the computer awake, and allow local network access to port `3000`. Use the computer's LAN address; `localhost` on a phone refers to the phone itself.

Create a room, add bots if needed, mark human players as ready, and start a match.

## Configuration

See [`apps/server/.env.example`](apps/server/.env.example) and [`apps/mobile/.env.example`](apps/mobile/.env.example) for the complete environment templates.

| Variable | Purpose |
| --- | --- |
| `PORT` | Backend listening port. |
| `CORS_ORIGIN` | Allowed client origin; production requires a restricted value. |
| `SOCKET_PATH` | Server Socket.IO path; defaults to `/socket.io`. |
| `EXPO_PUBLIC_SOCKET_URL` | Backend URL reachable from the device; required for preview and production builds. |
| `EXPO_PUBLIC_SOCKET_PATH` | Client Socket.IO path; must match the server. |
| `BOT_AI_ENABLED` | Master switch for optional AI services; disabled in the example configuration. |
| `BOT_LLM_ENABLED` / `BOT_EMBEDDING_ENABLED` | Enable the optional dialogue and embedding services. |
| `OPENAI_API_KEY` | Server-side credential for the optional AI provider. |

Keep credentials in the server environment. Values prefixed with `EXPO_PUBLIC_` are client configuration and must contain no secrets. Local environment files, runtime logs, and signing credentials are excluded from Git.

For production server deployments, set `NODE_ENV=production`, restrict `CORS_ORIGIN`, and expose the backend through HTTPS/WSS.

## Checks and server builds

```bash
# Build the backend, type-check the mobile app, and run server tests
npm run check

# Build and run the backend without the development watcher
npm run build:server
npm run start:server
```

The existing tests cover game rules, rooms and sessions, socket behavior, bot systems, and selected mobile utilities.

## Mobile builds

Build profiles are defined in [`apps/mobile/eas.json`](apps/mobile/eas.json):

| Profile | Purpose |
| --- | --- |
| `development` | Development client used with Metro. |
| `preview` | Internal testing: Android APK and an internally distributed iOS build. |
| `production` | Store distribution: Android AAB and an iOS store build. |

Sign in to Expo/EAS, link the project from `apps/mobile`, and set `EXPO_PUBLIC_SOCKET_URL` in the selected build environment. The example environment file does not configure a remote EAS build.

```bash
cd apps/mobile
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform ios --profile preview
```

Preview builds can use a reachable LAN HTTP server. Production builds require an HTTPS/WSS backend URL and `EAS_PROJECT_ID`. Set `IOS_BUNDLE_IDENTIFIER` and `ANDROID_PACKAGE` to match your store registrations; the current default is `com.vampirkoylu.game`. Internal iOS distribution requires signing and registered test devices.

## Current limitations and testing

Room state is held in memory, so restarting the server clears active rooms. Reconnection restores a player's session while the room remains alive within its configured timeout.

Before distributing a test build, verify a full match, a rematch, background/foreground transitions, network interruptions, and host departure on two physical devices.

## License and artwork

This repository is published for source inspection. The project's code, artwork, logos, and documentation are subject to the usage notice in [`LICENSE`](LICENSE); no open-source or commercial reuse license is granted. Rights under applicable law and GitHub's Terms of Service remain unaffected.

Third-party components retain their own licenses. The [asset source record](apps/mobile/src/assets/ASSET_LICENSE_LOG.md) documents recorded generation and source information; it is not an independent rights-clearance certificate or an asset reuse license.

# Vampir Koylu

Monorepo:

- `apps/mobile`: Expo + React Native istemci
- `apps/server`: Fastify + Socket.IO backend
- `packages/shared`: Ortak tipler ve socket event isimleri

## Baslangic

```bash
npm install
```

Shared package build:

```bash
npm run build:shared
```

Backend server:

```bash
npm run dev:server
```

Mobil client:

```bash
# iOS simulator icin
EXPO_PUBLIC_SOCKET_URL=http://127.0.0.1:3000 npm run dev:mobile

# Android emulator icin
EXPO_PUBLIC_SOCKET_URL=http://10.0.2.2:3000 npm run dev:mobile
```

Fiziksel cihazla testte `EXPO_PUBLIC_SOCKET_URL` degerini backend'in LAN adresiyle ver:

```bash
EXPO_PUBLIC_SOCKET_URL=http://192.168.x.x:3000 npm run dev:mobile
```


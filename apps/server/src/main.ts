import { Server } from "socket.io";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { SocketRuntime } from "./socket/socket-runtime.js";

const app = await createApp();
await app.ready();

const io = new Server(app.server, {
  path: env.SOCKET_PATH,
  maxHttpBufferSize: 64 * 1024,
  cors: {
    origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN
  }
});

const runtime = new SocketRuntime(io, app.log);

io.use((socket, next) => {
  const peers = [...io.sockets.sockets.values()];
  if (peers.length >= env.SOCKET_MAX_CONNECTIONS ||
      peers.filter((peer) => peer.handshake.address === socket.handshake.address).length >= env.SOCKET_MAX_CONNECTIONS_PER_IP) {
    next(new Error("SERVER_FULL"));
    return;
  }
  next();
});

io.on("connection", (socket) => {
  app.log.info({ socketId: socket.id }, "socket connected");
  runtime.registerConnection(socket);
});

const tickInterval = setInterval(() => {
  try {
    runtime.tick();
  } catch (error) {
    app.log.error({ err: error }, "runtime tick crashed");
  }
}, 500);

process.on("uncaughtException", (error) => {
  app.log.error({ err: error }, "uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  app.log.error({ err: reason }, "unhandledRejection");
});

const shutdown = async (signal: string) => {
  app.log.info({ signal }, "shutdown signal received");
  clearInterval(tickInterval);
  io.close();
  await app.close();
  process.exit(0);
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

await app.listen({
  port: env.PORT,
  host: "0.0.0.0"
});

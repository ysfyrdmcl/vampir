import { Server } from "socket.io";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { SocketRuntime } from "./socket/socket-runtime.js";

const app = await createApp();
await app.ready();

const io = new Server(app.server, {
  path: env.SOCKET_PATH,
  cors: {
    origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN
  }
});

const runtime = new SocketRuntime(io);

io.on("connection", (socket) => {
  app.log.info({ socketId: socket.id }, "socket connected");
  runtime.registerConnection(socket);
});

setInterval(() => {
  runtime.tick();
}, 500);

await app.listen({
  port: env.PORT,
  host: "0.0.0.0"
});

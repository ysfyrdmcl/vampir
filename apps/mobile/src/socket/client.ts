import { io, type Socket } from "socket.io-client";
import { runtimeEnv } from "../config/env";

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(runtimeEnv.socketUrl, {
      path: runtimeEnv.socketPath,
      transports: ["websocket"],
      autoConnect: false,
      forceNew: true
    });
  }
  return socketInstance;
}


export const SOCKET_EVENTS = {
  SERVER_CONNECTED: "server:connected",
  ROOM_CREATE: "room:create",
  ROOM_JOIN: "room:join",
  ROOM_LEAVE: "room:leave",
  ROOM_READY_TOGGLE: "room:ready-toggle",
  ROOM_CONFIG_UPDATE: "room:config-update",
  ROOM_START: "room:start",
  ROOM_RESET_TO_LOBBY: "room:reset-to-lobby",
  ROOM_BOT_ADD: "room:bot:add",
  ROOM_BOT_REMOVE: "room:bot:remove",
  ROOM_BOT_SET_INTELLIGENCE: "room:bot:set-intelligence",
  ROOM_BOT_FILL_MINIMUM: "room:bot:fill-minimum",
  GAME_PAUSE: "game:pause",
  GAME_RESUME: "game:resume",
  GAME_ACTION_SUBMIT: "game:action:submit",
  ROOM_STATE: "room:state",
  GAME_PHASE: "game:phase",
  GAME_PRIVATE_ROLE: "game:private-role",
  GAME_PRIVATE_RESULT: "game:private-result",
  GAME_OVER: "game:over",
  GAME_BOT_SPEECH: "game:bot:speech",
  ERROR_EVENT: "error:event"
} as const;

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

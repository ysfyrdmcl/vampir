export type RoomCode = string;

export interface RoomPlayer {
  id: string;
  nickname: string;
  isAlive: boolean;
}

export interface RoomState {
  roomCode: RoomCode;
  players: RoomPlayer[];
  minPlayers: number;
  maxPlayers: number;
}


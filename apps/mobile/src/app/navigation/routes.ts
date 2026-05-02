import type { RoleGuideId } from "../../data/role-guide";

export type RootStackParamList = {
  Welcome: undefined;
  RoleGuide: { focusActiveOnly?: boolean; source?: "lobby" | "menu" } | undefined;
  RoleCard: { roleId: RoleGuideId; source?: "lobby" | "menu" };
  SimulationLab: undefined;
  TestModeSetup: undefined;
  GameLog: undefined;
  GameSettings: undefined;
  CreateRoom: undefined;
  JoinRoom: undefined;
  Lobby: undefined;
  RoleReveal: undefined;
  Night: undefined;
  Vote: undefined;
  GameOver: undefined;
};

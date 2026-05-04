import type { ActionType, GamePhase } from "@vampir-koylu/shared";

export const NO_LYNCH_TARGET = "__NO_LYNCH__" as const;

export function actionTypeForBotPhase(phase: GamePhase): ActionType | null {
  switch (phase) {
    case "VampireVote":
      return "vampire-target";
    case "DetectiveInspect":
      return "detective-inspect";
    case "DoctorProtect":
      return "doctor-protect";
    case "GuardProtect":
      return "guard-protect";
    case "MayorElection":
      return "mayor-vote";
    case "DayVote":
      return "day-vote";
    case "HunterLastBreath":
      return "hunter-shot";
    default:
      return null;
  }
}

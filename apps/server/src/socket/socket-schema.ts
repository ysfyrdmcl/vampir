import { z } from "zod";

const phaseDurationsSchema = z.object({
  roleReveal: z.number().int().min(3).max(180),
  nightStart: z.number().int().min(3).max(180),
  vampireVote: z.number().int().min(3).max(180),
  detectiveInspect: z.number().int().min(3).max(180),
  doctorProtect: z.number().int().min(3).max(180),
  dayStart: z.number().int().min(3).max(180),
  dayDiscussion: z.number().int().min(3).max(180),
  dayVote: z.number().int().min(3).max(180)
});
const ruleSettingsSchema = z.object({
  firstNightNoKill: z.boolean().optional(),
  revealEliminatedRole: z.boolean().optional(),
  allowDoctorSelfProtect: z.boolean().optional(),
  allowDoctorConsecutiveProtectSameTarget: z.boolean().optional(),
  allowDetectiveRepeatInspectSameTarget: z.boolean().optional(),
  tiePolicy: z.enum(["RevoteThenNoExecution", "RevoteThenRandomExecution"]).optional(),
  noLynchEnabled: z.boolean().optional(),
  mayorEnabled: z.boolean().optional(),
  loversEnabled: z.boolean().optional()
});

export const identitySchema = z.object({
  deviceId: z.string().min(6),
  playerSessionToken: z.string().optional()
});

export const createRoomSchema = z.object({
  identity: identitySchema,
  nickname: z.string().min(2).max(24),
  phaseDurations: phaseDurationsSchema.optional(),
  gameMode: z.enum(["Classic", "SafeFirstNight", "FastParty", "MysteryVillage"]).optional(),
  rolePreset: z.enum(["beginner", "classicPlus", "socialChaos"]).optional(),
  rules: ruleSettingsSchema.optional()
});

export const joinRoomSchema = z.object({
  identity: identitySchema,
  roomCode: z.string().min(4).max(8),
  nickname: z.string().min(2).max(24).optional()
});

export const leaveRoomSchema = z.object({
  identity: identitySchema,
  roomCode: z.string().min(4).max(8)
});

export const readyToggleSchema = z.object({
  identity: identitySchema,
  roomCode: z.string().min(4).max(8),
  isReady: z.boolean()
});

export const startRoomSchema = z.object({
  identity: identitySchema,
  roomCode: z.string().min(4).max(8),
  phaseDurations: phaseDurationsSchema.optional(),
  gameMode: z.enum(["Classic", "SafeFirstNight", "FastParty", "MysteryVillage"]).optional(),
  rolePreset: z.enum(["beginner", "classicPlus", "socialChaos"]).optional(),
  rules: ruleSettingsSchema.optional()
});

export const actionSubmitSchema = z.object({
  identity: identitySchema,
  roomCode: z.string().min(4).max(8),
  actionType: z.enum(["vampire-target", "detective-inspect", "doctor-protect", "day-vote", "hunter-shot", "mayor-vote", "guard-protect"]),
  targetPlayerId: z.string().optional(),
  phase: z.enum([
    "Lobby",
    "RoleReveal",
    "NightStart",
    "VampireVote",
    "DetectiveInspect",
    "DoctorProtect",
    "NightResolve",
    "DayStart",
    "MayorElection",
    "GuardProtect",
    "DayDiscussion",
    "DayVote",
    "ExecutionResolve",
    "HunterLastBreath",
    "WinCheck",
    "GameOver"
  ]),
  round: z.number().int().positive()
});

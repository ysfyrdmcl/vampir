import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import type { GamePhase, GameResultEvent } from "@vampir-koylu/shared";
import {
  DayStartTransition,
  DeathTransition,
  ExecutionTransition,
  LoverChainTransition,
  MayorSelectedTransition,
  NightStartTransition,
  NoDeathTransition
} from "../animations";
import { CinematicMajorOverlay, type CinematicInfoPayload } from "./CinematicInfoOverlay";
import { navigationRef } from "../app/navigation/navigation-ref";
import { useLogFeedStore } from "../logging/log-feed-store";
import { useGameStore } from "../store/game-store";
import { typography } from "../theme/typography";
import { toRoleLabel } from "../utils/role-label";
import { useMotionEnabled } from "../motion/MotionPreferences";

interface PhaseTransitionOverlayProps {
  phase: GamePhase | null;
}

type SvgTransitionKind = "night-start" | "day-start" | "death" | "no-death" | "execution" | "mayor-selected" | "lover-chain";

interface SvgTransition {
  key: string;
  dedupeKey: string;
  kind: SvgTransitionKind;
  payload: CinematicInfoPayload;
  resultKind: string | null;
  resultEventId?: string;
}

type PlayerNameLookup = { playerId: string; nickname: string };

const MIN_TRANSITION_MS = 4600;
const MAX_TRANSITION_MS = 7600;
const OVERLAY_FADE_IN_MS = 420;
const OVERLAY_FADE_OUT_MS = 420;
const ROLE_REVEAL_TO_NIGHT_OVERLAY_DELAY_MS = 720;
const DEBUG_SVG_OVERLAY = typeof __DEV__ !== "undefined" && __DEV__ && false;
const EMPTY_PLAYERS: PlayerNameLookup[] = [];

function phaseTransition(phase: GamePhase | null, round: number | null, roomCode: string | null): SvgTransition | null {
  const keySuffix = `${phase}:${round ?? "unknown"}`;
  const room = roomCode ?? "room";
  if (phase === "NightStart") {
    return {
      key: `phase:${keySuffix}`,
      dedupeKey: `${room}:${round ?? "unknown"}:phase:night-start`,
      kind: "night-start",
      payload: {
        title: "Gece Çöküyor",
        subtitle: round ? `Tur ${round}` : "Gece",
        body: "Köy sessizliğe bürünüyor. Roller sırayla uyanacak.",
        visualTone: "night"
      },
      resultKind: null
    };
  }
  if (phase === "DayStart") {
    return {
      key: `phase:${keySuffix}`,
      dedupeKey: `${room}:${round ?? "unknown"}:phase:day-start`,
      kind: "day-start",
      payload: {
        title: "Gün Doğuyor",
        subtitle: round ? `Tur ${round}` : "Gündüz",
        body: "Köy gece olanları öğrenmek üzere meydanda toplanıyor.",
        visualTone: "day"
      },
      resultKind: null
    };
  }
  if (phase === "ExecutionResolve") {
    return {
      key: `phase:${keySuffix}`,
      dedupeKey: `${room}:${round ?? "unknown"}:phase:execution-resolve`,
      kind: "execution",
      payload: {
        title: "Köy Kararını Verdi",
        subtitle: round ? `Tur ${round}` : "Oylama",
        body: "Oylama sonucu açıklanıyor.",
        visualTone: "blood"
      },
      resultKind: null
    };
  }
  if (phase === "MayorElection") {
    return {
      key: `phase:${keySuffix}`,
      dedupeKey: `${room}:${round ?? "unknown"}:mayor-election`,
      kind: "day-start",
      payload: {
        title: "Başkan Seçimi",
        subtitle: round ? `Tur ${round}` : "Gündüz",
        body: "Köy yeni başkanını seçmek için meydana dönüyor.",
        visualTone: "gold"
      },
      resultKind: null
    };
  }
  return null;
}

function renderTransition(kind: SvgTransitionKind | null, phase: GamePhase | null) {
  if (kind === "night-start") return <NightStartTransition />;
  if (kind === "day-start") return <DayStartTransition />;
  if (kind === "death") return <DeathTransition />;
  if (kind === "no-death") return <NoDeathTransition />;
  if (kind === "execution") return <ExecutionTransition />;
  if (kind === "mayor-selected") return <MayorSelectedTransition />;
  if (kind === "lover-chain") return <LoverChainTransition />;
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.warn("[SVG_TRANSITION_NULL]", { phase, transitionKind: kind });
  }
  return null;
}

function playerNames(event: GameResultEvent, players: PlayerNameLookup[]): string[] {
  return (event.playerIds ?? []).map((id) => players.find((player) => player.playerId === id)?.nickname ?? id);
}

function readingDurationMs(payload: CinematicInfoPayload): number {
  const text = [
    payload.title,
    payload.subtitle,
    payload.body,
    payload.playerName,
    payload.roleName,
    ...(payload.chips ?? []),
    ...(payload.voteRows ?? []).map((row) => `${row.label} ${row.value}`)
  ]
    .filter(Boolean)
    .join(" ");
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(MAX_TRANSITION_MS, Math.max(MIN_TRANSITION_MS, 2600 + wordCount * 115));
}

function transitionVisibleMs(transition: SvgTransition, phaseEndsAt: number | null): number {
  const readingMs = readingDurationMs(transition.payload);
  if (transition.kind !== "night-start" || !phaseEndsAt) return readingMs;
  return Math.max(readingMs, Math.max(0, phaseEndsAt - Date.now()));
}

function resultDedupeKey(event: GameResultEvent, roomCode: string | null): string {
  const room = roomCode ?? event.id.split(":")[1] ?? "room";
  const playerId = event.playerIds?.[0];
  if (event.kind === "night") return playerId ? `${room}:${event.round}:night:death:${playerId}` : `${room}:${event.round}:night:no-death`;
  if (event.kind === "day") return playerId ? `${room}:${event.round}:day:execution:${playerId}` : `${room}:${event.round}:day:no-execution`;
  if (event.kind === "mayor") return playerId ? `${room}:${event.round}:mayor-selected:${playerId}` : `${room}:${event.round}:mayor-selected`;
  return `${room}:${event.round}:${event.kind}:${event.playerIds?.join("-") || "none"}`;
}

function personalEliminationTransition(
  event: GameResultEvent,
  players: PlayerNameLookup[],
  currentPlayerId: string | null,
  roomCode: string | null
): SvgTransition | null {
  if (!currentPlayerId || !event.playerIds?.includes(currentPlayerId)) return null;
  const playerName = players.find((player) => player.playerId === currentPlayerId)?.nickname;
  const loverChain = event.message.includes("Aşık bağı");
  const source = loverChain ? "lover-chain" : event.kind === "night" ? "night" : event.kind === "day" ? "day" : event.kind;
  if (event.kind !== "night" && event.kind !== "day" && !loverChain) return null;
  const copy = loverChain
    ? { title: "Aşık Bağı Koptu", body: "Sevdiğinle birlikte elendin. Artık oyunu izleyebilirsin." }
    : event.kind === "night"
      ? { title: "Karanlık Seni Buldu", body: "Bu gece öldün. Artık oyunu izleyebilirsin." }
      : { title: "Köy Seni Gönderdi", body: "Oylama sonucu elendin. Artık oyunu izleyebilirsin." };
  return {
    key: `personal:${event.id}:${currentPlayerId}`,
    dedupeKey: `${roomCode ?? "room"}:${event.round}:personal-eliminated:${currentPlayerId}:${source}`,
    kind: event.kind === "day" ? "execution" : "death",
    payload: {
      title: copy.title,
      subtitle: `Tur ${event.round}`,
      body: copy.body,
      playerName,
      visualTone: "blood"
    },
    resultKind: "personal.eliminated"
  };
}

function eventTransition(event: GameResultEvent, players: PlayerNameLookup[], roomCode: string | null): SvgTransition | null {
  const names = playerNames(event, players);
  const hasVictim = names.length > 0;
  const hasLoverChain = event.message.includes("Aşık bağı");
  const selectedPlayerId = event.playerIds?.[0];
  const voteRows = event.voteBreakdown
    ?.slice()
    .sort((a, b) => b.votes - a.votes || (players.find((player) => player.playerId === a.playerId)?.nickname ?? a.playerId).localeCompare(players.find((player) => player.playerId === b.playerId)?.nickname ?? b.playerId, "tr"))
    .map((entry) => ({
      label: players.find((player) => player.playerId === entry.playerId)?.nickname ?? entry.playerId,
      value: `${entry.votes} oy`,
      highlighted: entry.playerId === selectedPlayerId
    }));
  const roundChip = `Tur ${event.round}`;
  const common = {
    body: event.message,
    playerName: names.length === 1 ? names[0] : undefined,
    roleName: event.role ? toRoleLabel(event.role) : undefined,
    chips: [roundChip, ...(names.length > 1 ? names : []), ...(hasLoverChain ? ["Aşık bağı"] : [])]
  };

  if (event.kind === "night") {
    if (hasLoverChain && hasVictim) {
      return {
        key: `result:${event.id}`,
        dedupeKey: resultDedupeKey(event, roomCode),
        kind: "lover-chain",
        payload: {
          ...common,
          title: "Aşık Bağı Koptu",
          subtitle: event.title || "Gece Sonucu",
          body: event.message,
          playerName: undefined,
          visualTone: "blood"
        },
        resultKind: event.kind,
        resultEventId: event.id
      };
    }
    return {
      key: `result:${event.id}`,
      dedupeKey: resultDedupeKey(event, roomCode),
      kind: hasVictim ? "death" : "no-death",
      payload: {
        ...common,
        title: hasVictim ? "Bu Gece Bir Kayıp Var" : "Kimse Ölmedi",
        subtitle: event.title || "Gece Sonucu",
        visualTone: hasVictim ? "blood" : "gold"
      },
      resultKind: event.kind,
      resultEventId: event.id
    };
  }

  if (event.kind === "day") {
    if (hasLoverChain && hasVictim) {
      return {
        key: `result:${event.id}`,
        dedupeKey: resultDedupeKey(event, roomCode),
        kind: "lover-chain",
        payload: {
          ...common,
          title: "Aşık Bağı Koptu",
          subtitle: event.title || "İnfaz Sonucu",
          body: event.message,
          playerName: undefined,
          visualTone: "blood"
        },
        resultKind: event.kind,
        resultEventId: event.id
      };
    }
    return {
      key: `result:${event.id}`,
      dedupeKey: resultDedupeKey(event, roomCode),
      kind: hasVictim ? "execution" : "no-death",
      payload: {
        ...common,
        title: hasVictim ? "İnfaz Gerçekleşti" : "Köy Kimseyi Göndermedi",
        subtitle: event.title || "Oylama Sonucu",
        visualTone: hasVictim ? "blood" : "gold"
      },
      resultKind: event.kind,
      resultEventId: event.id
    };
  }

  if (event.kind === "mayor") {
    return {
      key: `result:${event.id}`,
      dedupeKey: resultDedupeKey(event, roomCode),
      kind: "mayor-selected",
      payload: {
        ...common,
        title: "Köy Başkanını Seçti",
        subtitle: event.title,
        voteRows,
        visualTone: "gold"
      },
      resultKind: event.kind,
      resultEventId: event.id
    };
  }

  if (event.kind === "guard") {
    return {
      key: `result:${event.id}`,
      dedupeKey: resultDedupeKey(event, roomCode),
      kind: "no-death",
      payload: {
        ...common,
        title: "Gardiyan Koruması Başarılı",
        subtitle: event.title,
        visualTone: "gold"
      },
      resultKind: event.kind,
      resultEventId: event.id
    };
  }

  if (event.kind === "tie") {
    return {
      key: `result:${event.id}`,
      dedupeKey: resultDedupeKey(event, roomCode),
      kind: "execution",
      payload: {
        ...common,
        title: "Oylar Eşitlendi",
        subtitle: "Son Tartışma",
        visualTone: "neutral"
      },
      resultKind: event.kind,
      resultEventId: event.id
    };
  }

  if (event.kind === "hunter") {
    return {
      key: `result:${event.id}`,
      dedupeKey: resultDedupeKey(event, roomCode),
      kind: hasVictim ? "death" : "no-death",
      payload: {
        ...common,
        title: "Son Nefes",
        subtitle: event.title,
        visualTone: hasVictim ? "blood" : "neutral"
      },
      resultKind: event.kind,
      resultEventId: event.id
    };
  }

  return null;
}

export function PhaseTransitionOverlay({ phase }: PhaseTransitionOverlayProps) {
  const motionEnabled = useMotionEnabled();
  const opacity = useRef(new Animated.Value(0)).current;
  const round = useGameStore((s) => s.gameState?.round ?? null);
  const phaseEndsAt = useGameStore((s) => s.gameState?.phaseEndsAt ?? null);
  const activeResultEvent = useGameStore((s) => s.activeResultEvent);
  const dismissActiveResultEvent = useGameStore((s) => s.dismissActiveResultEvent);
  const winner = useGameStore((s) => s.gameWinner);
  const roomCode = useGameStore((s) => s.roomState?.roomCode ?? s.roomCode);
  const currentPlayerId = useGameStore((s) => s.playerId);
  const players = useGameStore((s) => s.roomState?.players ?? EMPTY_PLAYERS);
  const latestElimination = useLogFeedStore((s) => s.latestEliminationEntry);
  const latestNoDeath = useLogFeedStore((s) => s.latestNoDeathEntry);
  const [activeTransition, setActiveTransition] = useState<SvgTransition | null>(null);
  const activeKey = useRef<string | null>(null);
  const shownKeys = useRef(new Set<string>());
  const queuedKeys = useRef(new Set<string>());
  const transitionQueue = useRef<SvgTransition[]>([]);
  const isAnimating = useRef(false);
  const startTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const finishing = useRef(false);
  const resetScope = useRef<string | null>(null);
  const nextFrame = useRef<number | null>(null);

  useEffect(() => () => {
    if (startTimer.current) clearTimeout(startTimer.current);
    if (nextFrame.current !== null) cancelAnimationFrame(nextFrame.current);
    activeAnimation.current?.stop();
  }, []);

  function clearOverlayQueue() {
    if (nextFrame.current !== null) cancelAnimationFrame(nextFrame.current);
    nextFrame.current = null;
    startTimer.current && clearTimeout(startTimer.current);
    startTimer.current = null;
    activeAnimation.current?.stop();
    activeAnimation.current = null;
    transitionQueue.current = [];
    queuedKeys.current.clear();
    shownKeys.current.clear();
    activeKey.current = null;
    isAnimating.current = false;
    finishing.current = false;
    setActiveTransition(null);
    opacity.setValue(0);
  }

  useEffect(() => {
    if (!roomCode || !phase) {
      clearOverlayQueue();
      resetScope.current = null;
      return;
    }
    const scope = `${roomCode ?? "no-room"}:${round ?? "no-round"}`;
    if (resetScope.current === scope) return;
    if (phase === "RoleReveal" && round === 1) {
      clearOverlayQueue();
    }
    resetScope.current = scope;
  }, [opacity, phase, roomCode, round]);

  useEffect(() => {
    if (phase !== "GameOver") return;
    clearOverlayQueue();
  }, [opacity, phase, winner]);

  const candidateTransitions = useMemo(() => {
    if (activeResultEvent) {
      const redirected = eventTransition(activeResultEvent, players, roomCode);
      if (redirected) {
        if (typeof __DEV__ !== "undefined" && __DEV__) {
          console.log("[CINEMATIC_OVERLAY] popup_redirected", {
            id: activeResultEvent.id,
            kind: activeResultEvent.kind,
            phase: activeResultEvent.phase
          });
        }
        const personal =
          winner || phase === "GameOver"
            ? null
            : personalEliminationTransition(activeResultEvent, players, currentPlayerId, roomCode);
        return personal ? [redirected, personal] : [redirected];
      }
    }

    const source = latestElimination?.payload?.source;
    const playerId = latestElimination?.payload?.playerId;
    const playerName = typeof playerId === "string" ? players.find((player) => player.playerId === playerId)?.nickname ?? playerId : undefined;
    const eliminationTs = latestElimination?.ts;
    if (source === "Night" && phase === "DayStart" && eliminationTs) {
      return [{
        key: `summary:${eliminationTs}:Night`,
        dedupeKey: `${roomCode ?? "room"}:${round ?? "unknown"}:night:death:${playerId ?? "unknown"}`,
        kind: "death",
        payload: {
          title: "Bu Gece Bir Kayıp Var",
          subtitle: round ? `Tur ${round}` : "Gece Sonucu",
          body: playerName ? `${playerName} bu gece köyden eksildi.` : "Gece sonucunda bir oyuncu elendi.",
          playerName,
          visualTone: "blood"
        },
        resultKind: "summary.elimination"
      } satisfies SvgTransition];
    }
    if (source === "Day" && phase === "ExecutionResolve" && eliminationTs) {
      return [{
        key: `summary:${eliminationTs}:Day`,
        dedupeKey: `${roomCode ?? "room"}:${round ?? "unknown"}:day:execution:${playerId ?? "unknown"}`,
        kind: "execution",
        payload: {
          title: "İnfaz Gerçekleşti",
          subtitle: round ? `Tur ${round}` : "İnfaz Sonucu",
          body: playerName ? `${playerName} köy kararıyla gönderildi.` : "Köyün oylama sonucu açıklandı.",
          playerName,
          visualTone: "blood"
        },
        resultKind: "summary.elimination"
      } satisfies SvgTransition];
    }
    if (phase === "DayStart" && latestNoDeath?.payload?.round === round && latestNoDeath.ts) {
      return [{
        key: `summary:${latestNoDeath.ts}:NoDeath`,
        dedupeKey: `${roomCode ?? "room"}:${round ?? "unknown"}:night:no-death`,
        kind: "no-death",
        payload: {
          title: "Kimse Ölmedi",
          subtitle: round ? `Tur ${round}` : "Gece Sonucu",
          body: "Bu gece köyden kimse eksilmedi.",
          visualTone: "gold"
        },
        resultKind: "summary.night_no_elimination"
      } satisfies SvgTransition];
    }

    const phaseCandidate = phaseTransition(phase, round, roomCode);
    return phaseCandidate ? [phaseCandidate] : [];
  }, [activeResultEvent, currentPlayerId, latestElimination, latestNoDeath, phase, players, roomCode, round, winner]);

  function completeTransition(transition: SvgTransition) {
    if (finishing.current) return;
    finishing.current = true;
    activeAnimation.current = null;
    isAnimating.current = false;
    setActiveTransition(null);
    activeKey.current = null;
    shownKeys.current.add(transition.dedupeKey);
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.log("[CINEMATIC_OVERLAY] complete", {
        key: transition.key,
        resultKind: transition.resultKind,
        transitionKind: transition.kind
      });
    }
    if (transition.resultEventId && activeResultEvent?.id === transition.resultEventId) {
      dismissActiveResultEvent();
    }
    nextFrame.current = requestAnimationFrame(() => {
      nextFrame.current = null;
      finishing.current = false;
      startNextQueuedTransition();
    });
  }

  function startTransition(transition: SvgTransition) {
    activeKey.current = transition.dedupeKey;
    isAnimating.current = true;
    finishing.current = false;
    setActiveTransition(transition);
    opacity.setValue(0);

    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.log("[CINEMATIC_OVERLAY] show", {
        phase,
        round,
        resultKind: transition.resultKind,
        transitionKind: transition.kind,
        winner
      });
    }

    const visibleMs = transitionVisibleMs(transition, phaseEndsAt);
    const animation = Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: motionEnabled ? OVERLAY_FADE_IN_MS : 0,
        isInteraction: false,
        useNativeDriver: true
      }),
      Animated.delay(Math.max(0, visibleMs - OVERLAY_FADE_IN_MS - OVERLAY_FADE_OUT_MS)),
      Animated.timing(opacity, {
        toValue: 0,
        duration: motionEnabled ? OVERLAY_FADE_OUT_MS : 0,
        isInteraction: false,
        useNativeDriver: true
      })
    ]);
    activeAnimation.current = animation;
    animation.start(({ finished }) => {
      if (!finished) return;
      completeTransition(transition);
    });
  }

  function enqueueOrStart(transition: SvgTransition) {
    if (shownKeys.current.has(transition.dedupeKey) || queuedKeys.current.has(transition.dedupeKey) || activeKey.current === transition.dedupeKey) {
      if (typeof __DEV__ !== "undefined" && __DEV__) {
        console.log("[CINEMATIC_OVERLAY] deduped", {
          key: transition.key,
          dedupeKey: transition.dedupeKey,
          resultKind: transition.resultKind,
          transitionKind: transition.kind
        });
      }
      return;
    }
    if (isAnimating.current) {
      transitionQueue.current.push(transition);
      queuedKeys.current.add(transition.dedupeKey);
      if (typeof __DEV__ !== "undefined" && __DEV__) {
        console.log("[CINEMATIC_OVERLAY] enqueue", {
          key: transition.key,
          dedupeKey: transition.dedupeKey,
          resultKind: transition.resultKind,
          transitionKind: transition.kind
        });
      }
      return;
    }

    startTransition(transition);
  }

  function startNextQueuedTransition() {
    const next = transitionQueue.current.shift();
    if (!next) return;
    queuedKeys.current.delete(next.dedupeKey);
    if (shownKeys.current.has(next.dedupeKey)) {
      startNextQueuedTransition();
      return;
    }
    startTransition(next);
  }

  useEffect(() => {
    if (!candidateTransitions.length) return;
    if (startTimer.current) {
      clearTimeout(startTimer.current);
      startTimer.current = null;
    }

    const currentRoute = navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : undefined;
    const delayMs =
      candidateTransitions[0]?.kind === "night-start" && currentRoute === "RoleReveal"
        ? ROLE_REVEAL_TO_NIGHT_OVERLAY_DELAY_MS
        : 0;

    if (delayMs > 0) {
      if (typeof __DEV__ !== "undefined" && __DEV__) {
        console.log("[CINEMATIC_OVERLAY] delayed", {
          key: candidateTransitions[0]?.key,
          resultKind: candidateTransitions[0]?.resultKind,
          transitionKind: candidateTransitions[0]?.kind,
          delayMs
        });
      }
      startTimer.current = setTimeout(() => {
        startTimer.current = null;
        candidateTransitions.forEach(enqueueOrStart);
      }, delayMs);
      return () => {
        if (startTimer.current) {
          clearTimeout(startTimer.current);
          startTimer.current = null;
        }
      };
    }

    candidateTransitions.forEach(enqueueOrStart);
  }, [activeResultEvent?.id, candidateTransitions, dismissActiveResultEvent, opacity, phase, phaseEndsAt, round, winner]);

  const dismissActiveTransition = () => {
    if (!activeTransition || finishing.current) return;
    const transition = activeTransition;
    activeAnimation.current?.stop();
    activeAnimation.current = null;
    const animation = Animated.timing(opacity, {
      toValue: 0,
      duration: motionEnabled ? 260 : 0,
      isInteraction: false,
      useNativeDriver: true
    });
    activeAnimation.current = animation;
    animation.start(({ finished }) => {
      if (finished) completeTransition(transition);
    });
  };

  if (!activeTransition && !DEBUG_SVG_OVERLAY) return null;

  return (
    <Animated.View
      pointerEvents="auto"
      style={[
        styles.wrap,
        {
          opacity: DEBUG_SVG_OVERLAY
            ? 1
            : opacity.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] })
        }
      ]}
    >
      <Pressable style={styles.pressable} onPress={dismissActiveTransition}>
        {DEBUG_SVG_OVERLAY ? (
          <View style={styles.debugOverlay}>
            <Text style={styles.debugText}>SVG OVERLAY TEST</Text>
          </View>
        ) : null}
        {activeTransition ? (
          <CinematicMajorOverlay
            payload={activeTransition.payload}
            visual={renderTransition(activeTransition.kind, phase)}
          />
        ) : (
          renderTransition(null, phase)
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(4,4,6,0.42)",
    zIndex: 99999,
    elevation: 99999,
    overflow: "visible"
  },
  pressable: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center"
  },
  debugOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 99999,
    elevation: 99999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,0,0,0.45)"
  },
  debugText: {
    color: "#ffffff",
    fontFamily: typography.sansBold,
    fontSize: 22,
    textAlign: "center"
  }
});

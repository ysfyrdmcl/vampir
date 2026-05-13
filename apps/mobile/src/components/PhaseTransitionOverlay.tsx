import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import type { GamePhase, GameResultEvent } from "@vampir-koylu/shared";
import { DayStartTransition, DeathTransition, ExecutionTransition, NightStartTransition, NoDeathTransition } from "../animations";
import { CinematicMajorOverlay, type CinematicInfoPayload } from "./CinematicInfoOverlay";
import { useLogFeedStore } from "../logging/log-feed-store";
import { useGameStore } from "../store/game-store";
import { typography } from "../theme/typography";
import { toRoleLabel } from "../utils/role-label";

interface PhaseTransitionOverlayProps {
  phase: GamePhase | null;
}

type SvgTransitionKind = "night-start" | "day-start" | "death" | "no-death" | "execution";

interface SvgTransition {
  key: string;
  kind: SvgTransitionKind;
  payload: CinematicInfoPayload;
  resultKind: string | null;
  resultEventId?: string;
}

type PlayerNameLookup = { playerId: string; nickname: string };

const MIN_TRANSITION_MS = 1400;
const DEBUG_SVG_OVERLAY = typeof __DEV__ !== "undefined" && __DEV__ && false;
const EMPTY_PLAYERS: PlayerNameLookup[] = [];

function phaseTransition(phase: GamePhase | null, round: number | null): SvgTransition | null {
  const keySuffix = `${phase}:${round ?? "unknown"}`;
  if (phase === "NightStart") {
    return {
      key: `phase:${keySuffix}`,
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
  return null;
}

function renderTransition(kind: SvgTransitionKind | null, phase: GamePhase | null) {
  if (kind === "night-start") return <NightStartTransition />;
  if (kind === "day-start") return <DayStartTransition />;
  if (kind === "death") return <DeathTransition />;
  if (kind === "no-death") return <NoDeathTransition />;
  if (kind === "execution") return <ExecutionTransition />;
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.warn("[SVG_TRANSITION_NULL]", { phase, transitionKind: kind });
  }
  return null;
}

function playerNames(event: GameResultEvent, players: PlayerNameLookup[]): string[] {
  return (event.playerIds ?? []).map((id) => players.find((player) => player.playerId === id)?.nickname ?? id);
}

function eventTransition(event: GameResultEvent, players: PlayerNameLookup[]): SvgTransition | null {
  const names = playerNames(event, players);
  const hasVictim = names.length > 0;
  const hasLoverChain = event.message.includes("Aşık bağı");
  const roundChip = `Tur ${event.round}`;
  const common = {
    body: event.message,
    playerName: names.length === 1 ? names[0] : undefined,
    roleName: event.role ? toRoleLabel(event.role) : undefined,
    chips: [roundChip, ...(names.length > 1 ? names : []), ...(hasLoverChain ? ["Aşık bağı"] : [])]
  };

  if (event.kind === "night") {
    return {
      key: `result:${event.id}`,
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
    return {
      key: `result:${event.id}`,
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
      kind: "day-start",
      payload: {
        ...common,
        title: "Köy Başkanını Seçti",
        subtitle: event.title,
        visualTone: "gold"
      },
      resultKind: event.kind,
      resultEventId: event.id
    };
  }

  if (event.kind === "guard") {
    return {
      key: `result:${event.id}`,
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
  const opacity = useRef(new Animated.Value(0)).current;
  const round = useGameStore((s) => s.gameState?.round ?? null);
  const activeResultEvent = useGameStore((s) => s.activeResultEvent);
  const dismissActiveResultEvent = useGameStore((s) => s.dismissActiveResultEvent);
  const winner = useGameStore((s) => s.gameWinner);
  const players = useGameStore((s) => s.roomState?.players ?? EMPTY_PLAYERS);
  const logEntries = useLogFeedStore((s) => s.entries);
  const latestElimination = useMemo(
    () => [...logEntries].reverse().find((entry) => entry.event === "summary.elimination") ?? null,
    [logEntries]
  );
  const latestNoDeath = useMemo(
    () => [...logEntries].reverse().find((entry) => entry.event === "summary.night_no_elimination") ?? null,
    [logEntries]
  );
  const [activeTransition, setActiveTransition] = useState<SvgTransition | null>(null);
  const activeKey = useRef<string | null>(null);
  const pendingTransition = useRef<SvgTransition | null>(null);
  const isAnimating = useRef(false);

  const candidateTransition = useMemo(() => {
    if (activeResultEvent) {
      const redirected = eventTransition(activeResultEvent, players);
      if (redirected) {
        if (typeof __DEV__ !== "undefined" && __DEV__) {
          console.log("[CINEMATIC_OVERLAY] popup_redirected", {
            id: activeResultEvent.id,
            kind: activeResultEvent.kind,
            phase: activeResultEvent.phase
          });
        }
        return redirected;
      }
    }

    const source = latestElimination?.payload?.source;
    const playerId = latestElimination?.payload?.playerId;
    const playerName = typeof playerId === "string" ? players.find((player) => player.playerId === playerId)?.nickname ?? playerId : undefined;
    const eliminationTs = latestElimination?.ts;
    if (source === "Night" && phase === "DayStart" && eliminationTs) {
      return {
        key: `summary:${eliminationTs}:Night`,
        kind: "death",
        payload: {
          title: "Bu Gece Bir Kayıp Var",
          subtitle: round ? `Tur ${round}` : "Gece Sonucu",
          body: playerName ? `${playerName} bu gece köyden eksildi.` : "Gece sonucunda bir oyuncu elendi.",
          playerName,
          visualTone: "blood"
        },
        resultKind: "summary.elimination"
      } satisfies SvgTransition;
    }
    if (source === "Day" && phase === "ExecutionResolve" && eliminationTs) {
      return {
        key: `summary:${eliminationTs}:Day`,
        kind: "execution",
        payload: {
          title: "İnfaz Gerçekleşti",
          subtitle: round ? `Tur ${round}` : "İnfaz Sonucu",
          body: playerName ? `${playerName} köy kararıyla gönderildi.` : "Köyün oylama sonucu açıklandı.",
          playerName,
          visualTone: "blood"
        },
        resultKind: "summary.elimination"
      } satisfies SvgTransition;
    }
    if (phase === "DayStart" && latestNoDeath?.payload?.round === round && latestNoDeath.ts) {
      return {
        key: `summary:${latestNoDeath.ts}:NoDeath`,
        kind: "no-death",
        payload: {
          title: "Kimse Ölmedi",
          subtitle: round ? `Tur ${round}` : "Gece Sonucu",
          body: "Bu gece köyden kimse eksilmedi.",
          visualTone: "gold"
        },
        resultKind: "summary.night_no_elimination"
      } satisfies SvgTransition;
    }

    return phaseTransition(phase, round);
  }, [activeResultEvent, latestElimination, latestNoDeath, phase, players, round]);
  useEffect(() => {
    if (!candidateTransition) return;
    if (candidateTransition.key === activeKey.current) return;

    const startTransition = (transition: SvgTransition) => {
      activeKey.current = transition.key;
      isAnimating.current = true;
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

      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true
        }),
        Animated.delay(MIN_TRANSITION_MS - 520),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true
        })
      ]).start(() => {
        isAnimating.current = false;
        setActiveTransition(null);
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
        const pending = pendingTransition.current;
        pendingTransition.current = null;
        if (pending && pending.key !== activeKey.current) {
          startTransition(pending);
        }
      });
    };

    if (isAnimating.current) {
      pendingTransition.current = candidateTransition;
      if (typeof __DEV__ !== "undefined" && __DEV__) {
        console.log("[CINEMATIC_OVERLAY] enqueue", {
          key: candidateTransition.key,
          resultKind: candidateTransition.resultKind,
          transitionKind: candidateTransition.kind
        });
      }
      return;
    }

    startTransition(candidateTransition);
  }, [activeResultEvent?.id, candidateTransition, dismissActiveResultEvent, opacity, phase, round, winner]);

  if (!activeTransition && !DEBUG_SVG_OVERLAY) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          opacity: DEBUG_SVG_OVERLAY
            ? 1
            : opacity.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] })
        }
      ]}
    >
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(4,4,6,0.42)",
    zIndex: 99999,
    elevation: 99999,
    overflow: "visible"
  },
  debugOverlay: {
    ...StyleSheet.absoluteFillObject,
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

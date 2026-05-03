import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import type { RoomPlayerView } from "@vampir-koylu/shared";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { GothicCard } from "./GothicCard";
import { StatusBadge } from "./StatusBadge";

function initialsFromName(name: string): string {
  return name
    .split(" ")
    .map((part) => part.trim().charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface PlayerRosterCardProps {
  players: RoomPlayerView[];
  mePlayerId: string | null;
  compact?: boolean;
  hostPlayerId?: string | null;
  selectablePlayerIds?: Set<string>;
  disabledPlayerIds?: Set<string>;
}

function PlayerRow({
  player,
  isMe,
  compact,
  isHost,
  isSelectable,
  isDisabled
}: {
  player: RoomPlayerView;
  isMe: boolean;
  compact: boolean;
  isHost: boolean;
  isSelectable: boolean;
  isDisabled: boolean;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(8)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(y, { toValue: 0, duration: 260, useNativeDriver: true })
    ]).start();
  }, [opacity, y]);

  return (
    <Animated.View
      style={[
        styles.playerCard,
        compact ? styles.playerCardCompact : null,
        isMe ? styles.playerCardMe : null,
        isHost ? styles.playerCardHost : null,
        player.isReady ? styles.playerCardReady : null,
        isSelectable ? styles.playerCardSelectable : null,
        isDisabled ? styles.playerCardDisabled : null,
        { opacity, transform: [{ translateY: y }] }
      ]}
    >
      <View style={styles.playerTop}>
        <View style={[styles.avatar, compact ? styles.avatarCompact : null]}>
          <Text style={styles.avatarLabel}>{initialsFromName(player.nickname)}</Text>
        </View>
        <View style={styles.playerIdentity}>
          <Text style={[styles.name, compact ? styles.nameCompact : null]} numberOfLines={1}>{player.nickname}</Text>
          <Text style={styles.stateLine}>{player.isConnected ? "Bağlı" : "Bağlantı yok"} · {player.isReady ? "Hazır" : "Bekliyor"}</Text>
        </View>
        {isHost ? <Text style={styles.badgeHost}>HOST</Text> : null}
        {isMe ? <Text style={styles.badgeSelf}>SEN</Text> : null}
        <View style={[styles.stateDot, player.isReady ? styles.stateDotReady : styles.stateDotPending, !player.isConnected ? styles.stateDotOffline : null]} />
      </View>
      {compact ? null : (
      <View style={styles.statusRow}>
        <StatusBadge
          label={player.isConnected ? "Bağlı" : "Bağlantı Yok"}
          tone={player.isConnected ? "connected" : "disconnected"}
          compact
        />
        <StatusBadge
          label={player.isReady ? "Hazır" : "Bekliyor"}
          tone={player.isReady ? "ready" : "pending"}
          compact
        />
      </View>
      )}
    </Animated.View>
  );
}

export function PlayerRosterCard({ players, mePlayerId, compact = false, hostPlayerId = null, selectablePlayerIds, disabledPlayerIds }: PlayerRosterCardProps) {
  return (
    <GothicCard style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>OYUNCULAR</Text>
        <Text style={styles.count}>{players.length} kişi lobide</Text>
      </View>
      <View style={styles.grid}>
        {players.length === 0 ? <Text style={styles.empty}>Oyuncular bağlanıyor...</Text> : null}
        {players.map((player) => (
          <PlayerRow
            key={player.playerId}
            player={player}
            isMe={player.playerId === mePlayerId}
            compact={compact}
            isHost={player.playerId === hostPlayerId}
            isSelectable={selectablePlayerIds?.has(player.playerId) ?? false}
            isDisabled={disabledPlayerIds?.has(player.playerId) ?? !player.isConnected}
          />
        ))}
      </View>
    </GothicCard>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 12,
    gap: 10
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  title: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 12,
    letterSpacing: 1.5
  },
  count: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 12
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 8
  },
  playerCard: {
    width: "48.5%",
    minHeight: 172,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.25)",
    padding: 12,
    gap: 8,
    backgroundColor: colors.surfaceGlow
  },
  playerCardCompact: {
    width: "100%",
    minHeight: 0,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 0
  },
  playerCardMe: {
    borderColor: colors.secondary,
    shadowColor: colors.secondary,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }
  },
  playerCardHost: {
    borderColor: "rgba(233,195,73,0.4)"
  },
  playerCardReady: {
    backgroundColor: "rgba(20,30,24,0.84)"
  },
  playerCardSelectable: {
    borderColor: colors.secondary,
    shadowColor: colors.secondary,
    shadowOpacity: 0.16,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 }
  },
  playerCardDisabled: {
    opacity: 0.52,
    backgroundColor: "rgba(14,14,16,0.7)"
  },
  playerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9
  },
  badgeSelf: {
    color: colors.backgroundDeep,
    backgroundColor: colors.secondary,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    fontSize: 11,
    fontFamily: typography.sansBold
  },
  badgeHost: {
    color: colors.secondary,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.28)",
    overflow: "hidden",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    fontSize: 10,
    fontFamily: typography.sansBold
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.55)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8,8,8,0.92)"
  },
  avatarCompact: {
    width: 40,
    height: 40,
    borderRadius: 10
  },
  avatarLabel: {
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 16
  },
  playerIdentity: {
    flex: 1,
    minWidth: 0,
    gap: 2
  },
  name: {
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 34 / 1.8
  },
  nameCompact: {
    fontSize: 16
  },
  stateLine: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 11
  },
  stateDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.textDim
  },
  stateDotReady: {
    backgroundColor: colors.success
  },
  stateDotPending: {
    backgroundColor: colors.secondary
  },
  stateDotOffline: {
    backgroundColor: colors.danger
  },
  statusRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap"
  },
  empty: {
    color: colors.textDim,
    fontFamily: typography.sansMedium
  }
});

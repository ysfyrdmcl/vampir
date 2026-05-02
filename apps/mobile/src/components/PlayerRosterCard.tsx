import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import type { RoomPlayerView } from "@vampir-koylu/shared";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
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
}

function PlayerRow({ player, isMe }: { player: RoomPlayerView; isMe: boolean }) {
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
        isMe ? styles.playerCardMe : null,
        { opacity, transform: [{ translateY: y }] }
      ]}
    >
      <View style={styles.playerTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLabel}>{initialsFromName(player.nickname)}</Text>
        </View>
        <View style={styles.badges}>
          {isMe ? <Text style={styles.badgeSelf}>SEN</Text> : null}
          {player.isReady ? (
            <View style={styles.iconBadge}>
              <Ionicons name="checkmark-done-outline" size={12} color={colors.secondary} />
            </View>
          ) : null}
        </View>
      </View>
      <Text style={styles.name}>{player.nickname}</Text>
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
    </Animated.View>
  );
}

export function PlayerRosterCard({ players, mePlayerId }: PlayerRosterCardProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>OYUNCULAR</Text>
      <Text style={styles.count}>{players.length} kişi lobide</Text>
      <View style={styles.grid}>
        {players.length === 0 ? <Text style={styles.empty}>Oyuncular bağlanıyor...</Text> : null}
        {players.map((player) => (
          <PlayerRow key={player.playerId} player={player} isMe={player.playerId === mePlayerId} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.24)",
    borderRadius: 14,
    backgroundColor: "rgba(18,19,21,0.86)",
    padding: 12,
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
    rowGap: 10
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
  playerCardMe: {
    borderColor: colors.secondary,
    shadowColor: colors.secondary,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }
  },
  playerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  badges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
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
  iconBadge: {
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.35)",
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: "rgba(43,36,20,0.65)"
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
  avatarLabel: {
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 22
  },
  name: {
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 34 / 1.8
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

import { useEffect } from "react";
import type { PrivateResultKind } from "../store/game-store";
import { CinematicMinorRibbon, type CinematicOverlayTone } from "./CinematicInfoOverlay";

const TITLES: Record<PrivateResultKind, string> = {
  detective: "Gece bilgisi",
  lover: "Kişisel bilgi",
  info: "Bilgi"
};

const TONES: Record<PrivateResultKind, CinematicOverlayTone> = {
  detective: "night",
  lover: "blood",
  info: "neutral"
};

interface Props {
  kind: PrivateResultKind;
  body: string;
}

export function PrivateInfoCard({ kind, body }: Props) {
  useEffect(() => {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.log("[CINEMATIC_OVERLAY] compact_show", { kind: `private-${kind}` });
    }
  }, [kind, body]);

  return (
    <CinematicMinorRibbon
      title={TITLES[kind]}
      subtitle="Kişisel"
      body={body}
      tone={TONES[kind]}
    />
  );
}

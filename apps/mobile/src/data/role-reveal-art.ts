import type { ImageSourcePropType } from "react-native";
export const ROLE_REVEAL_FRAME = require("../assets/role-reveal/card-frame.png") as ImageSourcePropType;
export const ROLE_REVEAL_MIST = require("../assets/role-reveal/mist-overlay.png") as ImageSourcePropType;

export const ROLE_REVEAL_ART: Record<string, ImageSourcePropType> = {
  Villager: require("../assets/roles/villager.png"),
  Vampire: require("../assets/roles/vampire.png"),
  Detective: require("../assets/roles/detective.png"),
  Doctor: require("../assets/roles/doctor.png"),
  Hunter: require("../assets/roles/hunter.png"),
  Mayor: require("../assets/roles/mayor.png"),
  Guard: require("../assets/roles/guard.png"),
  Lover: require("../assets/roles/lover.png")
};

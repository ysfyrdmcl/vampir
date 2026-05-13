import type { ComponentType } from "react";
import type { SvgProps } from "react-native-svg";

import MoonCrestSvg from "./brand/moon-crest.svg";
import VampirLogoMarkSvg from "./brand/vampir-logo-mark.svg";
import VillageSilhouetteSvg from "./brand/village-silhouette.svg";

import NightMoonSvg from "./phase/night-moon.svg";
import DaySunSvg from "./phase/day-sun.svg";
import VoteScaleSvg from "./phase/vote-scale.svg";
import ExecutionSealSvg from "./phase/execution-seal.svg";
import GameOverVampireSvg from "./phase/game-over-vampire.svg";
import GameOverVillagerSvg from "./phase/game-over-villager.svg";

import BatSvg from "./effects/bat.svg";
import MistLayerSvg from "./effects/mist-layer.svg";
import BloodDropSvg from "./effects/blood-drop.svg";
import CandleFlameSvg from "./effects/candle-flame.svg";
import GoldSparkSvg from "./effects/gold-spark.svg";
import RedVignetteShapeSvg from "./effects/red-vignette-shape.svg";
import ShieldGlowSvg from "./effects/shield-glow.svg";

import VampireIconSvg from "./roles/vampire-icon.svg";
import VillagerIconSvg from "./roles/villager-icon.svg";
import DetectiveEyeSvg from "./roles/detective-eye.svg";
import DoctorCrossSvg from "./roles/doctor-cross.svg";
import MayorCrownSvg from "./roles/mayor-crown.svg";
import HunterMarkSvg from "./roles/hunter-mark.svg";
import GuardShieldSvg from "./roles/guard-shield.svg";
import LoverIconSvg from "./roles/lover-icon.svg";

import GothicDividerSvg from "./ui/gothic-divider.svg";
import ParchmentCornerSvg from "./ui/parchment-corner.svg";
import TargetReticleSvg from "./ui/target-reticle.svg";

export {
  BatSvg,
  BloodDropSvg,
  CandleFlameSvg,
  DaySunSvg,
  DetectiveEyeSvg,
  DoctorCrossSvg,
  ExecutionSealSvg,
  GameOverVampireSvg,
  GameOverVillagerSvg,
  GoldSparkSvg,
  GothicDividerSvg,
  GuardShieldSvg,
  HunterMarkSvg,
  LoverIconSvg,
  MayorCrownSvg,
  MistLayerSvg,
  MoonCrestSvg,
  NightMoonSvg,
  ParchmentCornerSvg,
  RedVignetteShapeSvg,
  ShieldGlowSvg,
  TargetReticleSvg,
  VampireIconSvg,
  VampirLogoMarkSvg,
  VillageSilhouetteSvg,
  VillagerIconSvg,
  VoteScaleSvg
};

export const roleSvgIconMap = {
  Vampire: VampireIconSvg,
  Villager: VillagerIconSvg,
  Detective: DetectiveEyeSvg,
  Doctor: DoctorCrossSvg,
  Mayor: MayorCrownSvg,
  Hunter: HunterMarkSvg,
  Guard: GuardShieldSvg,
  Lover: LoverIconSvg
} satisfies Record<string, ComponentType<SvgProps>>;

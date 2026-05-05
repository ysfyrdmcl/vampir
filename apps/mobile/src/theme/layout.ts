import { PixelRatio } from "react-native";

const PHONE_BASE_WIDTH = 390;

export interface ResponsiveMetrics {
  shortestSide: number;
  isTablet: boolean;
  isCompactHeight: boolean;
  pagePadding: number;
  contentMaxWidth?: number;
  controlScale: number;
  topBarBaseHeight: number;
  bottomNavBaseHeight: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round(value: number) {
  return PixelRatio.roundToNearestPixel(value);
}

export function getResponsiveMetrics(width: number, height: number): ResponsiveMetrics {
  const shortestSide = Math.min(width, height);
  const isTablet = shortestSide >= 600;
  const isCompactHeight = height < 700;
  const controlScale = clamp(shortestSide / PHONE_BASE_WIDTH, isCompactHeight ? 0.9 : 0.94, isTablet ? 1.08 : 1);
  const sideGutter = isTablet ? clamp(width * 0.08, 32, 72) : clamp(width * 0.052, 16, 24);

  return {
    shortestSide,
    isTablet,
    isCompactHeight,
    pagePadding: round(sideGutter),
    contentMaxWidth: isTablet ? round(Math.min(720, width - sideGutter * 2)) : undefined,
    controlScale,
    topBarBaseHeight: round(isCompactHeight ? 58 : 64),
    bottomNavBaseHeight: round(isCompactHeight ? 68 : 74)
  };
}

export function scaledSize(value: number, scale: number, min = value * 0.9, max = value * 1.08) {
  return round(clamp(value * scale, min, max));
}

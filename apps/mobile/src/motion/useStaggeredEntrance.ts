import { useSoftReveal } from "./useSoftReveal";

export function useStaggeredEntrance(index = 0, enabled = true, baseDelayMs = 70) {
  return useSoftReveal(enabled, index * baseDelayMs);
}

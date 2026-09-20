import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import { AccessibilityInfo, AppState } from "react-native";
import { ReduceMotion, ReducedMotionConfig, useReducedMotion } from "react-native-reanimated";

const AppActiveContext = createContext(true);
const MotionActivityContext = createContext(true);
const MotionEnabledContext = createContext(true);

export function MotionPreferencesProvider({ children }: PropsWithChildren) {
  const initialReduceMotion = useReducedMotion();
  const [reduceMotion, setReduceMotion] = useState(initialReduceMotion);
  const [appActive, setAppActive] = useState(AppState.currentState === "active");

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => setAppActive(state === "active"));
    setAppActive(AppState.currentState === "active");
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let pendingInitialValue = true;
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (enabled) => {
      pendingInitialValue = false;
      setReduceMotion(enabled);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (pendingInitialValue) setReduceMotion(enabled);
    }).catch(() => {});
    return () => {
      pendingInitialValue = false;
      subscription.remove();
    };
  }, []);

  return (
    <AppActiveContext.Provider value={appActive}>
      <MotionEnabledContext.Provider value={appActive && !reduceMotion}>
        <ReducedMotionConfig mode={reduceMotion ? ReduceMotion.Always : ReduceMotion.Never} />
        {children}
      </MotionEnabledContext.Provider>
    </AppActiveContext.Provider>
  );
}

export function MotionActivityProvider({ active, children }: PropsWithChildren<{ active: boolean }>) {
  const parentActive = useContext(MotionActivityContext);
  return <MotionActivityContext.Provider value={parentActive && active}>{children}</MotionActivityContext.Provider>;
}

export function useMotionEnabled() {
  const enabled = useContext(MotionEnabledContext);
  const active = useContext(MotionActivityContext);
  return enabled && active;
}

export function useAppActive() {
  return useContext(AppActiveContext);
}

export function useMotionActive() {
  const appActive = useAppActive();
  const active = useContext(MotionActivityContext);
  return appActive && active;
}

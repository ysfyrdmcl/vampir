import { create } from "zustand";

export type ToastVariant = "gold" | "danger";

export interface GameToastPayload {
  id: number;
  text: string;
  variant: ToastVariant;
  durationMs: number;
}

interface ToastStoreState {
  toast: GameToastPayload | null;
  showToast: (text: string, variant?: ToastVariant, durationMs?: number) => void;
  clearToast: (id: number) => void;
}

let nextToastId = 1;
let lastToast: { text: string; at: number } | null = null;

export const useToastStore = create<ToastStoreState>((set) => ({
  toast: null,
  showToast: (text, variant = "gold", durationMs = 1600) => {
    const now = Date.now();
    if (lastToast?.text === text && now - lastToast.at < 2200) return;
    lastToast = { text, at: now };
    set({
      toast: {
        id: nextToastId++,
        text,
        variant,
        durationMs
      }
    });
  },
  clearToast: (id) =>
    set((state) => ({
      toast: state.toast?.id === id ? null : state.toast
    }))
}));

export function showToast(text: string, variant: ToastVariant = "gold", durationMs = 1600): void {
  useToastStore.getState().showToast(text, variant, durationMs);
}

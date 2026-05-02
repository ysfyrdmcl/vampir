import { create } from "zustand";

export interface LogFeedEntry {
  ts: string;
  event: string;
  payload?: Record<string, unknown>;
  scope: "general" | "personal";
}

interface LogFeedState {
  entries: LogFeedEntry[];
  push: (entry: LogFeedEntry) => void;
  clear: () => void;
}

const MAX_ENTRIES = 300;

export const useLogFeedStore = create<LogFeedState>((set) => ({
  entries: [],
  push: (entry) =>
    set((state) => ({
      entries: [...state.entries, entry].slice(-MAX_ENTRIES)
    })),
  clear: () => set({ entries: [] })
}));

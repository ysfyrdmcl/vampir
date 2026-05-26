import { create } from "zustand";

export interface LogFeedEntry {
  ts: string;
  event: string;
  payload?: Record<string, unknown>;
  scope: "general" | "personal";
}

interface LogFeedState {
  entries: LogFeedEntry[];
  unreadCount: number;
  latestEliminationEntry: LogFeedEntry | null;
  latestNoDeathEntry: LogFeedEntry | null;
  push: (entry: LogFeedEntry) => void;
  markAllRead: () => void;
  clear: () => void;
}

const MAX_ENTRIES = 300;

export const useLogFeedStore = create<LogFeedState>((set) => ({
  entries: [],
  unreadCount: 0,
  latestEliminationEntry: null,
  latestNoDeathEntry: null,
  push: (entry) =>
    set((state) => {
      const latestEliminationEntry =
        entry.event === "summary.elimination" ? entry : state.latestEliminationEntry;
      const latestNoDeathEntry =
        entry.event === "summary.night_no_elimination" ? entry : state.latestNoDeathEntry;
      return {
        entries: [...state.entries, entry].slice(-MAX_ENTRIES),
        unreadCount: state.unreadCount + 1,
        latestEliminationEntry,
        latestNoDeathEntry
      };
    }),
  markAllRead: () => set({ unreadCount: 0 }),
  clear: () => set({ entries: [], unreadCount: 0, latestEliminationEntry: null, latestNoDeathEntry: null })
}));

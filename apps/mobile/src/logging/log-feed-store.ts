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
  push: (entry: LogFeedEntry) => void;
  markAllRead: () => void;
  clear: () => void;
}

const MAX_ENTRIES = 300;

export const useLogFeedStore = create<LogFeedState>((set) => ({
  entries: [],
  unreadCount: 0,
  push: (entry) =>
    set((state) => ({
      entries: [...state.entries, entry].slice(-MAX_ENTRIES),
      unreadCount: state.unreadCount + 1
    })),
  markAllRead: () => set({ unreadCount: 0 }),
  clear: () => set({ entries: [], unreadCount: 0 })
}));

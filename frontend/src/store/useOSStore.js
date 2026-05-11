import { create } from "zustand";

const initialWindows = {
  terminal: {
    id: "terminal",
    title: "Terminal",
    isOpen: true,
    isMinimized: false,
    zIndex: 3,
    position: { x: 96, y: 108 },
    size: { width: 640, height: 380 },
  },
  browser: {
    id: "browser",
    title: "Browser",
    isOpen: true,
    isMinimized: false,
    zIndex: 2,
    position: { x: 420, y: 156 },
    size: { width: 700, height: 440 },
  },
  tasks: {
    id: "tasks",
    title: "Tasks",
    isOpen: false,
    isMinimized: false,
    zIndex: 1,
    position: { x: 230, y: 210 },
    size: { width: 420, height: 420 },
  },
  explorer: {
    id: "explorer",
    title: "File Explorer",
    isOpen: true,
    isMinimized: false,
    zIndex: 4,
    position: { x: 760, y: 118 },
    size: { width: 520, height: 430 },
  },
  settings: {
    id: "settings",
    title: "Settings",
    isOpen: false,
    isMinimized: false,
    zIndex: 1,
    position: { x: 330, y: 126 },
    size: { width: 780, height: 520 },
  },
};

export const useOSStore = create((set, get) => ({
  windows: initialWindows,
  focusedWindowId: "terminal",
  nextZIndex: 5,
  command: "",

  setCommand: (command) => set({ command }),

  focusWindow: (id) => {
    const { nextZIndex } = get();

    set((state) => ({
      focusedWindowId: id,
      nextZIndex: nextZIndex + 1,
      windows: {
        ...state.windows,
        [id]: {
          ...state.windows[id],
          isMinimized: false,
          zIndex: nextZIndex,
        },
      },
    }));
  },

  openWindow: (id) => {
    const { nextZIndex } = get();

    set((state) => ({
      focusedWindowId: id,
      nextZIndex: nextZIndex + 1,
      windows: {
        ...state.windows,
        [id]: {
          ...state.windows[id],
          isOpen: true,
          isMinimized: false,
          zIndex: nextZIndex,
        },
      },
    }));
  },

  openPreviewWindow: (file) => {
    const { nextZIndex } = get();
    const id = `preview:${file.filename}`;

    set((state) => ({
      focusedWindowId: id,
      nextZIndex: nextZIndex + 1,
      windows: {
        ...state.windows,
        [id]: {
          id,
          title: file.displayName || "Preview",
          kind: "preview",
          file,
          isOpen: true,
          isMinimized: false,
          zIndex: nextZIndex,
          position: {
            x: 180 + (Object.keys(state.windows).length % 4) * 34,
            y: 132 + (Object.keys(state.windows).length % 4) * 28,
          },
          size: { width: 720, height: 560 },
        },
      },
    }));
  },

  closeWindow: (id) => {
    set((state) => ({
      windows: {
        ...state.windows,
        [id]: {
          ...state.windows[id],
          isOpen: false,
          isMinimized: false,
        },
      },
    }));
  },

  minimizeWindow: (id) => {
    set((state) => ({
      focusedWindowId:
        state.focusedWindowId === id ? null : state.focusedWindowId,
      windows: {
        ...state.windows,
        [id]: {
          ...state.windows[id],
          isMinimized: true,
        },
      },
    }));
  },

  updateWindowPosition: (id, position) => {
    set((state) => ({
      windows: {
        ...state.windows,
        [id]: {
          ...state.windows[id],
          position,
        },
      },
    }));
  },

  updateWindowSize: (id, size) => {
    set((state) => ({
      windows: {
        ...state.windows,
        [id]: {
          ...state.windows[id],
          size: {
            width: Math.max(320, size.width),
            height: Math.max(240, size.height),
          },
        },
      },
    }));
  },
}));

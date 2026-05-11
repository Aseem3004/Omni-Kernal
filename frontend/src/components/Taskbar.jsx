import { motion } from "framer-motion";
import { FolderOpen, Globe2, ListChecks, Settings, Terminal } from "lucide-react";
import { useOSStore } from "../store/useOSStore";

const apps = [
  { id: "terminal", label: "Terminal", icon: Terminal },
  { id: "browser", label: "Browser", icon: Globe2 },
  { id: "explorer", label: "Files", icon: FolderOpen },
  { id: "tasks", label: "Tasks", icon: ListChecks },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Taskbar() {
  const windows = useOSStore((state) => state.windows);
  const focusedWindowId = useOSStore((state) => state.focusedWindowId);
  const openWindow = useOSStore((state) => state.openWindow);

  return (
    <motion.nav
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 26 }}
      className="fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 shadow-2xl backdrop-blur-2xl"
      aria-label="Taskbar"
    >
      {apps.map((app) => {
        const Icon = app.icon;
        const isActive = windows[app.id]?.isOpen && !windows[app.id]?.isMinimized;
        const isFocused = focusedWindowId === app.id;

        return (
          <button
            key={app.id}
            type="button"
            title={app.label}
            aria-label={app.label}
            onClick={() => openWindow(app.id)}
            className={`group relative grid h-12 w-12 place-items-center rounded-xl border transition ${
              isFocused
                ? "border-white/30 bg-white/20 text-white"
                : "border-white/10 bg-slate-950/30 text-slate-300 hover:bg-white/15 hover:text-white"
            }`}
          >
            <Icon size={22} strokeWidth={1.7} />
            {isActive && (
              <span className="absolute bottom-1 h-1 w-1 rounded-full bg-sky-300" />
            )}
          </button>
        );
      })}
    </motion.nav>
  );
}

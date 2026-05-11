import { motion } from "framer-motion";
import { Command, Search, Sparkles } from "lucide-react";
import { getSocket } from "../socket/client";
import { SOCKET_EVENTS, TERMINAL_EVENTS } from "../socket/events";
import { useOSStore } from "../store/useOSStore";

export function CommandSearch() {
  const command = useOSStore((state) => state.command);
  const setCommand = useOSStore((state) => state.setCommand);
  const openWindow = useOSStore((state) => state.openWindow);

  const submitCommand = (event) => {
    event.preventDefault();

    const prompt = command.trim();

    if (!prompt) {
      return;
    }

    openWindow("terminal");
    window.dispatchEvent(
      new CustomEvent(TERMINAL_EVENTS.RESET, {
        detail: { prompt },
      }),
    );
    getSocket().emit(SOCKET_EVENTS.START_TASK, { prompt });
    setCommand("");
  };

  return (
    <motion.form
      initial={{ y: -18, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="fixed left-1/2 top-8 z-[90] flex w-[min(720px,calc(100vw-32px))] -translate-x-1/2 items-center gap-3 rounded-2xl border border-white/15 bg-slate-950/55 px-4 py-3 shadow-2xl backdrop-blur-2xl"
      onSubmit={submitCommand}
    >
      <Search className="shrink-0 text-slate-400" size={20} strokeWidth={1.8} />
      <input
        value={command}
        onChange={(event) => setCommand(event.target.value)}
        placeholder="Ask Omni-Kernel anything..."
        className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-slate-500"
      />
      <div className="flex shrink-0 items-center gap-2 text-slate-500">
        <Sparkles size={17} strokeWidth={1.7} />
        <span className="hidden items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-400 sm:flex">
          <Command size={13} strokeWidth={1.8} /> K
        </span>
      </div>
    </motion.form>
  );
}

import { AnimatePresence } from "framer-motion";
import { Activity, Cpu } from "lucide-react";
import { BrowserContent } from "./BrowserContent";
import { CommandSearch } from "./CommandSearch";
import { FileExplorerContent } from "./FileExplorerContent";
import { PreviewContent } from "./PreviewContent";
import { SettingsWindow } from "./SettingsWindow";
import { Taskbar } from "./Taskbar";
import { TerminalContent } from "./TerminalContent";
import { Window } from "./Window";
import { useOSStore } from "../store/useOSStore";

function TasksContent() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Activity size={20} strokeWidth={1.7} className="text-emerald-300" />
        <h2 className="text-lg font-semibold text-white">Active Workflows</h2>
      </div>
      {["Plan objective", "Run research loop", "Review artifacts"].map((task, index) => (
        <div
          key={task}
          className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3"
        >
          <span className="text-sm text-slate-200">{task}</span>
          <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-400">
            {index === 0 ? "ready" : "queued"}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Desktop() {
  const windows = useOSStore((state) => state.windows);
  const previewWindows = Object.values(windows).filter((windowData) => {
    return windowData.kind === "preview";
  });

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:64px_64px] opacity-25" />
      <div className="absolute inset-x-0 top-0 h-px bg-white/20" />

      <CommandSearch />

      <section className="pointer-events-none absolute left-8 top-32 z-0 hidden max-w-sm select-none lg:block">
        <div className="flex items-center gap-3 text-slate-500">
          <Cpu size={18} strokeWidth={1.6} />
          <span className="text-sm uppercase">Omni-Kernel</span>
        </div>
        <h1 className="mt-4 text-5xl font-semibold tracking-normal text-white/85">
          Virtual Desktop
        </h1>
      </section>

      <AnimatePresence>
        <Window id="terminal">
          <TerminalContent />
        </Window>
        <Window id="browser">
          <BrowserContent />
        </Window>
        <Window id="explorer">
          <FileExplorerContent />
        </Window>
        <Window id="tasks">
          <TasksContent />
        </Window>
        <Window id="settings">
          <SettingsWindow />
        </Window>
        {previewWindows.map((windowData) => (
          <Window key={windowData.id} id={windowData.id}>
            <PreviewContent file={windowData.file} />
          </Window>
        ))}
      </AnimatePresence>

      <Taskbar />
    </main>
  );
}

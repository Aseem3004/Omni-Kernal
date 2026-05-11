import { CheckCircle2, ExternalLink, Loader2, Terminal, XCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSocket } from "../socket/client";
import { SOCKET_EVENTS, TERMINAL_EVENTS } from "../socket/events";

const bootLogs = [
  {
    id: "boot-1",
    agent: "Kernel",
    status: "completed",
    message: "Runtime online. Socket layer listening for kernel_log events.",
  },
];

const createLog = (log) => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  timestamp: new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }),
  ...log,
});

const getArtifactTitle = (artifact = {}) => {
  return (
    artifact.title ||
    artifact.name ||
    artifact.hotelName ||
    artifact.url ||
    artifact.bookingLink ||
    "Artifact"
  );
};

const getArtifactUrl = (artifact = {}) => {
  return (
    artifact.url ||
    artifact.bookingLink ||
    artifact.link ||
    Object.values(artifact).find(
      (value) => typeof value === "string" && /^https?:\/\//i.test(value),
    )
  );
};

const getArtifactLinks = (artifacts = []) => {
  return artifacts.flatMap((artifact) => {
    if (Array.isArray(artifact.results)) {
      return artifact.results
        .map((result) => ({
          title: result.title || result.url,
          url: result.url,
          description: result.description,
        }))
        .filter((result) => result.url);
    }

    if (Array.isArray(artifact.content)) {
      return artifact.content
        .map((item) => ({
          title: getArtifactTitle(item),
          url: getArtifactUrl(item),
          description: item.description || item.summary || item.topReview,
        }))
        .filter((item) => item.url);
    }

    if (artifact.url) {
      return [
        {
          title: artifact.title || artifact.url,
          url: artifact.url,
          description: artifact.description,
        },
      ];
    }

    return [];
  });
};

function TerminalLog({ log }) {
  const isThinking = log.status === "thinking";
  const isCompleted = log.status === "completed";
  const isError = log.type === "error" || log.status === "error";
  const links = useMemo(() => getArtifactLinks(log.artifacts), [log.artifacts]);

  return (
    <article className="rounded-lg border border-white/10 bg-black/25 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border ${
              isError
                ? "border-rose-400/30 bg-rose-400/10 text-rose-200"
                : isCompleted
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                : "border-sky-400/30 bg-sky-400/10 text-sky-300"
            }`}
          >
            {isError ? (
              <XCircle size={16} strokeWidth={1.8} />
            ) : isCompleted ? (
              <CheckCircle2 size={16} strokeWidth={1.8} />
            ) : (
              <Loader2
                size={16}
                strokeWidth={1.8}
                className={isThinking ? "animate-spin" : ""}
              />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-100">
                {log.agent || "Kernel"}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] uppercase ${
                  isError
                    ? "border-rose-300/20 bg-rose-300/10 text-rose-200"
                    : "border-white/10 bg-white/5 text-slate-500"
                }`}
              >
                {log.status}
              </span>
            </div>

            {isThinking && (
              <p className="mt-2 animate-pulse text-sm text-sky-200">
                Agent is working...
              </p>
            )}

            <p
              className={`mt-2 whitespace-pre-wrap break-words text-sm leading-6 ${
                isError ? "text-rose-100" : "text-slate-300"
              }`}
            >
              {log.message}
            </p>
          </div>
        </div>

        {log.timestamp && (
          <time className="shrink-0 text-xs text-slate-600">{log.timestamp}</time>
        )}
      </div>

      {links.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-2 rounded-md border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-medium text-emerald-100 transition hover:border-emerald-200/40 hover:bg-emerald-300/15"
              title={link.description || link.title}
            >
              <span className="truncate">{link.title}</span>
              <ExternalLink size={13} strokeWidth={1.8} className="shrink-0" />
            </a>
          ))}
        </div>
      )}
    </article>
  );
}

export function TerminalContent() {
  const [logs, setLogs] = useState(bootLogs);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const scrollRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => setConnectionStatus("connected");
    const handleDisconnect = () => setConnectionStatus("offline");
    const handleKernelLog = (log) => {
      setLogs((currentLogs) => currentLogs.concat(createLog(log)));
    };
    const handleTaskError = (payload) => {
      setLogs((currentLogs) =>
        currentLogs.concat(
          createLog({
            agent: "Kernel",
            status: "completed",
            message: payload?.message || "Task failed.",
          }),
        ),
      );
    };
    const handleReset = (event) => {
      const prompt = event.detail?.prompt || "";

      setLogs([
        createLog({
          agent: "User",
          status: "completed",
          message: `$ ${prompt}`,
        }),
      ]);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on(SOCKET_EVENTS.KERNEL_LOG, handleKernelLog);
    socket.on(SOCKET_EVENTS.TASK_ERROR, handleTaskError);
    window.addEventListener(TERMINAL_EVENTS.RESET, handleReset);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off(SOCKET_EVENTS.KERNEL_LOG, handleKernelLog);
      socket.off(SOCKET_EVENTS.TASK_ERROR, handleTaskError);
      window.removeEventListener(TERMINAL_EVENTS.RESET, handleReset);
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [logs]);

  return (
    <div className="flex h-full min-h-0 flex-col font-mono text-sm leading-6 text-slate-300">
      <div className="mb-5 flex items-center justify-between gap-4 text-slate-100">
        <div className="flex items-center gap-3">
          <Terminal size={18} strokeWidth={1.7} />
          <span>omni-kernel://runtime</span>
        </div>
        <span
          className={`rounded-full border px-2 py-1 text-xs ${
            connectionStatus === "connected"
              ? "border-emerald-400 bg-emerald-500 text-white"
              : connectionStatus === "offline"
                ? "border-rose-400/30 bg-rose-400/10 text-rose-200"
              : "border-amber-400/20 bg-amber-400/10 text-amber-300"
          }`}
        >
          {connectionStatus}
        </span>
      </div>

      <div className="minimal-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {logs.map((log) => (
          <TerminalLog key={log.id} log={log} />
        ))}
        <div ref={scrollRef} />
      </div>
    </div>
  );
}

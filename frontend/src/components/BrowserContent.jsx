import { AnimatePresence, motion } from "framer-motion";
import { Circle, Globe2, Lock, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getSocket } from "../socket/client";
import { SOCKET_EVENTS, TERMINAL_EVENTS } from "../socket/events";
import { UniversalArtifactCard } from "./UniversalArtifactCard";

const HOME_URL = "omni://search";
const COLLABORATION_AGENTS = ["Planner", "Researcher", "Reviewer"];
const AGENT_NODE_POSITIONS = ["16.666%", "50%", "83.333%"];

const normalizeAgentName = (agent = "") => {
  if (agent === "Executor" || agent === "Scraper") {
    return "Researcher";
  }

  return agent;
};

function HomeScreen() {
  return (
    <div className="grid h-full place-items-center px-6 text-center">
      <div>
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-sky-200 shadow-2xl">
          <Search size={27} strokeWidth={1.7} />
        </div>
        <h2 className="mt-5 text-3xl font-semibold text-white">Omni-Search</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
          Agent browser feed is idle. Search activity and scraper screenshots will
          appear here as the kernel works.
        </p>
      </div>
    </div>
  );
}

function BrowserFrame({ frame }) {
  const base64Image =
    frame.base64 && frame.base64.startsWith("data:")
      ? frame.base64
      : frame.base64
        ? `data:image/png;base64,${frame.base64}`
        : "";
  const imageSource = frame.screenshotUrl || base64Image;

  if (frame.htmlSnapshotUrl) {
    return (
      <AnimatePresence mode="wait">
        <motion.iframe
          key={frame.htmlSnapshotUrl}
          title={`Agent browser snapshot for ${frame.url}`}
          src={frame.htmlSnapshotUrl}
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.985 }}
          transition={{ duration: 0.22 }}
          className="h-full w-full border-0 bg-white"
          sandbox=""
        />
      </AnimatePresence>
    );
  }

  if (!imageSource) {
    return (
      <div className="grid h-full place-items-center px-6 text-center">
        <div className="max-w-md">
          <Globe2
            size={36}
            strokeWidth={1.6}
            className="mx-auto text-slate-500"
          />
          <h2 className="mt-4 text-xl font-semibold text-white">
            {frame.source === "firecrawl"
              ? "Reading page"
              : frame.source === "tavily"
                ? "Searching web"
                : "Tool activity"}
          </h2>
          <p className="mt-2 break-words text-sm leading-6 text-slate-500">
            {frame.message || frame.url}
          </p>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={imageSource}
        initial={{ opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.985 }}
        transition={{ duration: 0.22 }}
        className="minimal-scrollbar h-full w-full overflow-auto bg-slate-950"
      >
        <img
          src={imageSource}
          alt={`Agent screenshot for ${frame.url}`}
          className="min-h-full w-full object-contain"
        />
      </motion.div>
    </AnimatePresence>
  );
}

function CollaborationMap({ activity }) {
  const activeAgent = activity?.activeAgent || "Planner";
  const previousAgent = activity?.previousAgent;
  const currentTask = activity?.currentTask || "Coordinating the next step.";
  const handoffKey = activity?.handoffKey || 0;
  const activeIndex = COLLABORATION_AGENTS.indexOf(activeAgent);
  const previousIndex = COLLABORATION_AGENTS.indexOf(previousAgent);
  const shouldShowHandoff = previousIndex >= 0 && activeIndex >= 0;
  const beamVariants = {
    initial: {
      left: AGENT_NODE_POSITIONS[previousIndex],
      opacity: 0,
      scale: 0.7,
      x: "-50%",
    },
    animate: {
      left: AGENT_NODE_POSITIONS[activeIndex],
      opacity: [0, 1, 0],
      scale: 1,
      x: "-50%",
    },
  };

  return (
    <motion.div
      key="collaboration-map"
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.985 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="grid h-full place-items-center px-5 py-8 text-center"
    >
      <div className="w-full max-w-2xl">
        <div className="relative mx-auto min-h-48 rounded-lg border border-white/10 bg-black/25 px-4 py-8 shadow-2xl shadow-black/25">
          <div className="absolute left-[14%] right-[14%] top-[5.8rem] h-px bg-gradient-to-r from-transparent via-sky-300/35 to-transparent" />

          {shouldShowHandoff && (
            <motion.div
              key={handoffKey}
              variants={beamVariants}
              initial="initial"
              animate="animate"
              transition={{ duration: 0.75, ease: "easeInOut" }}
              className="absolute top-[5.55rem] h-2 w-2 rounded-full bg-cyan-200 shadow-[0_0_18px_rgba(125,211,252,0.95)]"
            />
          )}

          <div className="relative grid grid-cols-3 gap-3">
            {COLLABORATION_AGENTS.map((agent) => {
              const isActive = agent === activeAgent;

              return (
                <div key={agent} className="flex flex-col items-center gap-4">
                  <motion.div
                    animate={
                      isActive
                        ? {
                            scale: [1, 1.1, 1],
                            boxShadow: [
                              "0 0 0 0 rgba(125, 211, 252, 0.24)",
                              "0 0 0 12px rgba(125, 211, 252, 0)",
                              "0 0 0 0 rgba(125, 211, 252, 0)",
                            ],
                          }
                        : { scale: 1, boxShadow: "0 0 0 0 rgba(125, 211, 252, 0)" }
                    }
                    transition={
                      isActive
                        ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
                        : { duration: 0.2 }
                    }
                    className={`grid h-20 w-20 place-items-center rounded-full border text-sm font-semibold ${
                      isActive
                        ? "border-cyan-200/70 bg-cyan-300/15 text-cyan-100"
                        : "border-white/10 bg-white/[0.04] text-slate-400"
                    }`}
                  >
                    {agent}
                  </motion.div>

                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isActive ? "bg-cyan-200" : "bg-slate-700"
                    }`}
                    aria-hidden="true"
                  />
                </div>
              );
            })}
          </div>
        </div>

        <motion.p
          key={currentTask}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="mx-auto mt-5 max-w-xl text-sm leading-6 text-slate-300"
        >
          {currentTask}
        </motion.p>
      </div>
    </motion.div>
  );
}

function ArtifactGrid({ artifacts }) {
  return (
    <motion.div
      key="artifact-grid"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      className="minimal-scrollbar h-full overflow-auto bg-slate-950 p-4"
    >
      <div className="mx-auto grid w-full max-w-xl gap-3">
        <AnimatePresence initial={false}>
          {artifacts.map((artifact, index) => (
            <UniversalArtifactCard
              key={artifact.id}
              agent={artifact.agent}
              action={artifact.action}
              data={artifact.data}
              index={index}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

const normalizeArtifactPayload = (payload) => {
  if (Array.isArray(payload)) {
    return {
      agent: "Researcher",
      action: "found this",
      items: payload,
    };
  }

  if (payload && typeof payload === "object") {
    return {
      agent: payload.agent || payload.producedBy || "Researcher",
      action: payload.action || "found this",
      items: Array.isArray(payload.items)
        ? payload.items
        : Array.isArray(payload.data)
          ? payload.data
          : Array.isArray(payload.artifacts)
            ? payload.artifacts
            : [payload.data ?? payload],
    };
  }

  return {
    agent: "Agent",
    action: "found this",
    items: [payload],
  };
};

function BrowserViewport({ frame, artifacts, activity }) {
  const hasArtifacts = artifacts.length > 0;
  const hasActiveAgent = Boolean(activity?.activeAgent);

  if (!frame && !hasArtifacts && !hasActiveAgent) {
    return <HomeScreen />;
  }

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-slate-950">
      <AnimatePresence mode="wait">
        {hasArtifacts ? (
          <ArtifactGrid artifacts={artifacts} />
        ) : hasActiveAgent ? (
          <CollaborationMap activity={activity} />
        ) : frame ? (
          <motion.div
            key="browser-frame"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
            className="h-full"
          >
            <BrowserFrame frame={frame} />
          </motion.div>
        ) : (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
            className="h-full"
          >
            <HomeScreen />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function BrowserContent() {
  const [frame, setFrame] = useState(null);
  const [artifacts, setArtifacts] = useState([]);
  const [activity, setActivity] = useState(null);
  const timersRef = useRef([]);

  useEffect(() => {
    const socket = getSocket();

    const handleScreenshot = (payload) => {
      setFrame({
        url: payload?.url || payload?.currentUrl || HOME_URL,
        screenshotUrl: payload?.screenshotUrl || payload?.imageUrl || "",
        htmlSnapshotUrl: payload?.htmlSnapshotUrl || "",
        base64: payload?.base64 || "",
        source: payload?.source || "agent",
        message: payload?.message || "",
        capturedAt: payload?.capturedAt || new Date().toISOString(),
      });
    };

    const handleKernelLog = (log) => {
      const agent = normalizeAgentName(log?.agent);

      if (
        log?.status !== "thinking" ||
        !COLLABORATION_AGENTS.includes(agent)
      ) {
        return;
      }

      setActivity((currentActivity) => {
        const previousAgent =
          currentActivity?.activeAgent && currentActivity.activeAgent !== agent
            ? currentActivity.activeAgent
            : currentActivity?.previousAgent;

        return {
          activeAgent: agent,
          previousAgent,
          currentTask: log.message || "Coordinating the next step.",
          handoffKey:
            currentActivity?.activeAgent && currentActivity.activeAgent !== agent
              ? Date.now()
              : currentActivity?.handoffKey || 0,
        };
      });
    };

    const handleDataRefined = (payload) => {
      const normalized = normalizeArtifactPayload(payload);

      normalized.items.forEach((item, index) => {
        const timer = setTimeout(() => {
          setArtifacts((currentArtifacts) =>
            currentArtifacts.concat({
              id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
              agent: normalized.agent,
              action: normalized.action,
              data: item,
            }),
          );
        }, index * 140);

        timersRef.current.push(timer);
      });
    };

    const handleReset = () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current = [];
      setFrame(null);
      setArtifacts([]);
      setActivity(null);
    };

    socket.on(SOCKET_EVENTS.AGENT_SCREENSHOT, handleScreenshot);
    socket.on(SOCKET_EVENTS.KERNEL_LOG, handleKernelLog);
    socket.on(SOCKET_EVENTS.DATA_REFINED, handleDataRefined);
    window.addEventListener(TERMINAL_EVENTS.RESET, handleReset);

    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      socket.off(SOCKET_EVENTS.AGENT_SCREENSHOT, handleScreenshot);
      socket.off(SOCKET_EVENTS.KERNEL_LOG, handleKernelLog);
      socket.off(SOCKET_EVENTS.DATA_REFINED, handleDataRefined);
      window.removeEventListener(TERMINAL_EVENTS.RESET, handleReset);
    };
  }, []);

  const currentUrl = frame?.url || HOME_URL;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-white/10 bg-slate-950/55">
      <div className="border-b border-white/10 bg-white/[0.035] px-4 py-3">
        <div className="mb-3 flex items-center gap-2">
          <Circle size={10} fill="#ff5f57" className="text-[#ff5f57]" />
          <Circle size={10} fill="#ffbd2e" className="text-[#ffbd2e]" />
          <Circle size={10} fill="#28c840" className="text-[#28c840]" />
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-slate-400">
          <Lock size={14} strokeWidth={1.8} className="shrink-0 text-slate-600" />
          <span className="truncate">{currentUrl}</span>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <BrowserViewport frame={frame} artifacts={artifacts} activity={activity} />
      </div>
    </div>
  );
}

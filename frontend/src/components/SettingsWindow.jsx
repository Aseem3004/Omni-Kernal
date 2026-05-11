import {
  Bot,
  CheckCircle2,
  Globe2,
  RefreshCw,
  Server,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import { useEffect, useState } from "react";
import { BACKEND_URL } from "../config/backend";

const categories = [
  {
    id: "ai",
    label: "AI Configuration",
    icon: Bot,
    description: ".env managed",
  },
  {
    id: "browser",
    label: "Browser Tools",
    icon: Globe2,
    description: ".env managed",
  },
];

export function SettingsWindow() {
  const [selectedCategory, setSelectedCategory] = useState("ai");
  const [health, setHealth] = useState(null);
  const [status, setStatus] = useState("checking");

  const checkHealth = async () => {
    setStatus("checking");

    try {
      const response = await fetch(`${BACKEND_URL}/health`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Backend responded with HTTP ${response.status}`);
      }

      const data = await response.json();
      setHealth(data);
      setStatus("online");
    } catch (error) {
      setHealth({
        status: "offline",
        service: error.message || "Backend unreachable",
      });
      setStatus("offline");
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const isOnline = status === "online";
  const StatusIcon = isOnline ? CheckCircle2 : WifiOff;

  return (
    <div className="flex h-full min-h-0 overflow-hidden rounded-lg border border-white/10 bg-slate-950/45">
      <aside className="w-56 shrink-0 border-r border-white/10 bg-white/[0.07] p-3 shadow-2xl backdrop-blur-2xl">
        <div className="mb-4 px-2">
          <div className="grid h-10 w-10 place-items-center rounded-lg border border-cyan-200/20 bg-cyan-200/10 text-cyan-100">
            <ShieldCheck size={20} strokeWidth={1.8} />
          </div>
          <h2 className="mt-3 text-lg font-semibold text-white">Settings</h2>
        </div>

        <div className="space-y-2">
          {categories.map((category) => {
            const Icon = category.icon;
            const isSelected = selectedCategory === category.id;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.id)}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition ${
                  isSelected
                    ? "border-cyan-200/25 bg-cyan-200/[0.12] text-white shadow-lg shadow-cyan-950/20"
                    : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.06] hover:text-slate-100"
                }`}
              >
                <Icon size={18} strokeWidth={1.7} className="shrink-0" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {category.label}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {category.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="min-w-0 flex-1 overflow-auto p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase text-cyan-200/70">
              System Status
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              {selectedCategory === "ai" ? "AI Configuration" : "Browser Tools"}
            </h3>
          </div>

          <button
            type="button"
            onClick={checkHealth}
            title="Refresh backend status"
            aria-label="Refresh backend status"
            className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <RefreshCw
              size={17}
              strokeWidth={1.8}
              className={status === "checking" ? "animate-spin" : ""}
            />
          </button>
        </div>

        <div className="grid gap-4">
          <div
            className={`rounded-lg border p-5 ${
              isOnline
                ? "border-emerald-300/25 bg-emerald-300/10"
                : "border-rose-300/25 bg-rose-300/10"
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg border ${
                  isOnline
                    ? "border-emerald-300/25 bg-emerald-300/15 text-emerald-100"
                    : "border-rose-300/25 bg-rose-300/15 text-rose-100"
                }`}
              >
                <StatusIcon size={23} strokeWidth={1.8} />
              </div>

              <div className="min-w-0">
                <h4 className="text-base font-semibold text-white">
                  Backend {isOnline ? "connected" : "unreachable"}
                </h4>
                <p className="mt-2 break-words text-sm leading-6 text-slate-300">
                  {isOnline
                    ? `${health?.service || "omni-kernel-backend"} is responding at ${BACKEND_URL}/health. Provider secrets are read from the backend .env file.`
                    : health?.service || "Unable to reach the backend health endpoint."}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/25 p-5">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300">
                <Server size={22} strokeWidth={1.7} />
              </div>
              <div>
                <h4 className="text-base font-semibold text-white">
                  Environment source
                </h4>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  API keys are configured server-side through `.env`; the browser
                  no longer accepts, tests, or saves provider secrets.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

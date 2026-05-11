import { FileJson2, SearchCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { BACKEND_URL } from "../config/backend";
import { UniversalArtifactCard } from "./UniversalArtifactCard";

const getArtifactItems = (artifact) => {
  if (Array.isArray(artifact.content)) {
    return artifact.content;
  }

  if (Array.isArray(artifact.results)) {
    return artifact.results;
  }

  if (Array.isArray(artifact.sourceResults)) {
    return artifact.sourceResults;
  }

  return [artifact.content ?? artifact];
};

function ArtifactSection({ artifact }) {
  const items = getArtifactItems(artifact);
  const agent = artifact.agent || artifact.producedBy || "Researcher";

  return (
    <section className="rounded-lg border border-white/10 bg-slate-950/35 p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg border border-sky-300/15 bg-sky-300/10 text-sky-200">
          <SearchCheck size={18} strokeWidth={1.7} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase text-slate-500">
            {artifact.type || "artifact"}
          </p>
          <h3 className="mt-1 break-words text-base font-semibold text-white">
            {artifact.query || artifact.step || "Research artifact"}
          </h3>
        </div>
      </div>

      {artifact.step && (
        <p className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3 text-sm leading-6 text-slate-400">
          {artifact.step}
        </p>
      )}

      <div className="mt-4 grid gap-3">
        {items.map((item, index) => (
          <UniversalArtifactCard
            key={item?.url || item?.bookingLink || item?.hotelName || item?.title || index}
            agent={agent}
            action="found this"
            data={item}
            index={index}
            animate={false}
          />
        ))}
      </div>
    </section>
  );
}

export function PreviewContent({ file }) {
  const [report, setReport] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const loadReport = async () => {
      setStatus("loading");

      try {
        const response = await fetch(
          `${BACKEND_URL}/api/files/${encodeURIComponent(file.filename)}`,
        );

        if (!response.ok) {
          throw new Error("Unable to open report.");
        }

        setReport(await response.json());
        setStatus("ready");
      } catch (error) {
        setStatus(error.message || "Unable to open report.");
      }
    };

    loadReport();
  }, [file.filename]);

  if (status === "loading") {
    return (
      <div className="grid h-full place-items-center text-sm text-slate-500">
        Opening report...
      </div>
    );
  }

  if (status !== "ready") {
    return (
      <div className="rounded-lg border border-rose-300/20 bg-rose-300/10 p-4 text-sm text-rose-100">
        {status}
      </div>
    );
  }

  const artifacts = Array.isArray(report.artifacts) ? report.artifacts : [];

  return (
    <article className="space-y-5">
      <header className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-lg border border-emerald-300/15 bg-emerald-300/10 text-emerald-200">
            <FileJson2 size={24} strokeWidth={1.6} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase text-slate-500">
              Kernel Export
            </p>
            <h2 className="mt-1 break-words text-2xl font-semibold text-white">
              {report.displayName || file.displayName}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {report.goal}
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase text-slate-500">Artifacts</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {artifacts.length}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 sm:col-span-2">
          <p className="text-xs uppercase text-slate-500">Reviewer Note</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {report.review || "No review note was saved."}
          </p>
        </div>
      </section>

      {artifacts.map((artifact) => (
        <ArtifactSection key={artifact.id || artifact.query} artifact={artifact} />
      ))}
    </article>
  );
}

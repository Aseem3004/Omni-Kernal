import { FileJson2, FileText, FolderOpen, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { BACKEND_URL } from "../config/backend";
import { getSocket } from "../socket/client";
import { SOCKET_EVENTS } from "../socket/events";

const formatDate = (value) => {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

export function FileExplorerContent() {
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("loading");

  const loadFiles = useCallback(async () => {
    setStatus("loading");

    try {
      const response = await fetch(`${BACKEND_URL}/api/files`);

      if (!response.ok) {
        throw new Error("Unable to load exports.");
      }

      const data = await response.json();

      setFiles(data.files || []);
      setStatus("ready");
    } catch (error) {
      setStatus(error.message || "Unable to load exports.");
    }
  }, []);

  const downloadFile = (file) => {
    window.location.href = `${BACKEND_URL}/api/download/${encodeURIComponent(
      file.filename,
    )}`;
  };

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    const socket = getSocket();
    const handleFileCreated = () => {
      loadFiles();
    };

    socket.on(SOCKET_EVENTS.FILE_CREATED, handleFileCreated);

    return () => {
      socket.off(SOCKET_EVENTS.FILE_CREATED, handleFileCreated);
    };
  }, [loadFiles]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-sky-200">
            <FolderOpen size={20} strokeWidth={1.7} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Exports</h2>
            <p className="text-sm text-slate-500">Saved kernel task reports</p>
          </div>
        </div>

        <button
          type="button"
          title="Refresh exports"
          aria-label="Refresh exports"
          onClick={loadFiles}
          className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          <RefreshCw size={16} strokeWidth={1.8} />
        </button>
      </div>

      {status === "loading" && (
        <div className="grid flex-1 place-items-center text-sm text-slate-500">
          Loading exports...
        </div>
      )}

      {status !== "loading" && status !== "ready" && (
        <div className="rounded-lg border border-rose-300/20 bg-rose-300/10 p-4 text-sm text-rose-100">
          {status}
        </div>
      )}

      {status === "ready" && files.length === 0 && (
        <div className="grid flex-1 place-items-center rounded-lg border border-dashed border-white/10 bg-white/[0.025] text-center">
          <div>
            <FileJson2
              size={34}
              strokeWidth={1.6}
              className="mx-auto text-slate-600"
            />
            <p className="mt-3 text-sm font-medium text-slate-300">
              No saved reports yet
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Completed tasks will appear here.
            </p>
          </div>
        </div>
      )}

      {status === "ready" && files.length > 0 && (
        <div className="grid min-h-0 flex-1 auto-rows-max grid-cols-2 gap-3 overflow-auto pr-1 sm:grid-cols-3">
          {files.map((file) => (
            <button
              key={file.filename}
              type="button"
              title={`Download ${file.displayName}`}
              onClick={() => downloadFile(file)}
              className="group rounded-lg border border-white/10 bg-white/[0.035] p-4 text-left transition hover:border-sky-300/30 hover:bg-sky-300/10"
            >
              <div className="grid h-14 w-14 place-items-center rounded-lg border border-sky-300/15 bg-sky-300/10 text-sky-200">
                {file.extension === ".md" ? (
                  <FileText size={28} strokeWidth={1.5} />
                ) : (
                  <FileJson2 size={28} strokeWidth={1.5} />
                )}
              </div>
              <p className="mt-3 break-words text-sm font-medium leading-5 text-slate-100">
                {file.displayName}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {formatDate(file.savedAt)}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {file.artifactCount} artifact{file.artifactCount === 1 ? "" : "s"}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

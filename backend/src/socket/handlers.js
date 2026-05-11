import { demoExport, demoLogs, demoScreenshot } from "../kernel/demoData.js";
import { runKernelTask } from "../kernel/graph.js";
import { formatJsonSheet, saveExportFile } from "../services/fileService.js";

const DEMO_INTERVAL_MS = 2000;

const saveDemoExport = async () => {
  const content = formatJsonSheet({
    goal: demoExport.goal,
    review: demoExport.review,
    artifacts: demoExport.artifacts,
  });

  return saveExportFile({
    filename: "demo_report.json",
    content,
    goal: demoExport.goal,
    review: demoExport.review,
    artifacts: demoExport.artifacts,
  });
};

const runDemoTask = (socket) => {
  let index = 0;

  socket.emit("kernel_log", {
    agent: "Demo",
    status: "completed",
    message: "Simulation mode activated. Replaying a Mumbai hotel research run.",
  });

  const timer = setInterval(async () => {
    if (index === 2) {
      socket.emit("agent_screenshot", {
        ...demoScreenshot,
        capturedAt: new Date().toISOString(),
      });
    }

    if (index < demoLogs.length) {
      socket.emit("kernel_log", demoLogs[index]);
      index += 1;
      return;
    }

    clearInterval(timer);

    try {
      const exportRecord = await saveDemoExport();

      socket.emit("file_created", {
        filename: exportRecord.filename,
        metadata: exportRecord,
      });
      socket.emit("kernel_log", {
        agent: "Demo",
        status: "completed",
        message: `Demo export saved as ${exportRecord.displayName}. Open File Explorer to preview it.`,
        artifacts: exportRecord.artifacts,
        exportFile: {
          filename: exportRecord.filename,
          displayName: exportRecord.displayName,
        },
      });
      socket.emit("task_complete", {
        status: "completed",
        mode: "demo",
        result: exportRecord,
      });
    } catch (error) {
      socket.emit("task_error", {
        message: error.message || "Demo export failed.",
      });
    }
  }, DEMO_INTERVAL_MS);

  socket.once("disconnect", () => clearInterval(timer));
};

export const registerSocketHandlers = (socket) => {
  socket.on("start_task", async ({ prompt } = {}) => {
    const cleanPrompt = typeof prompt === "string" ? prompt.trim() : "";

    if (!cleanPrompt) {
      socket.emit("task_error", {
        message: "Please enter a task before starting the kernel.",
      });
      return;
    }

    socket.emit("kernel_log", {
      agent: "Planner",
      status: "thinking",
      message: `Starting workflow for: ${cleanPrompt}`,
    });

    if (cleanPrompt.toLowerCase() === "run demo") {
      runDemoTask(socket);
      return;
    }

    try {
      const result = await runKernelTask(cleanPrompt, socket.id);

      socket.emit("task_complete", {
        status: "completed",
        result,
      });
    } catch (error) {
      socket.emit("kernel_log", {
        agent: "Kernel",
        status: "error",
        type: "error",
        message: error.message || "Kernel task failed.",
      });
      socket.emit("task_error", {
        message: error.message || "Kernel task failed.",
      });
    }
  });
};

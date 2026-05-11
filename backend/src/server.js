import dotenv from "dotenv";

dotenv.config();

import http from "node:http";
import express from "express";
import {
  getExportFilePath,
  listExportFiles,
  readJsonExport,
} from "./services/fileService.js";
import { initSocketServer } from "./socket/index.js";

const PORT = Number(process.env.PORT || 5000);

const app = express();
const server = http.createServer(app);
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

app.use((request, response, next) => {
  const origin = request.headers.origin;

  if (!origin || allowedOrigins.has(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin || "http://localhost:5173");
  }

  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Allow-Credentials", "true");

  if (request.method === "OPTIONS") {
    response.sendStatus(204);
    return;
  }

  next();
});

app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "omni-kernel-backend",
  });
});

app.get("/api/files", async (_request, response) => {
  try {
    response.json({ files: await listExportFiles() });
  } catch (error) {
    response.status(500).json({
      message: error.message || "Unable to list files.",
    });
  }
});

app.get("/api/files/:filename", async (request, response) => {
  try {
    response.json(await readJsonExport(request.params.filename));
  } catch (error) {
    response.status(error.statusCode || (error.code === "ENOENT" ? 404 : 500)).json({
      message: error.code === "ENOENT" ? "File not found." : error.message,
    });
  }
});

app.get("/api/download/:filename", (request, response) => {
  const filePath = getExportFilePath(request.params.filename);

  if (!filePath) {
    response.status(400).json({ message: "Invalid export filename." });
    return;
  }

  response.download(filePath, request.params.filename, (error) => {
    if (error && !response.headersSent) {
      response.status(error.code === "ENOENT" ? 404 : 500).json({
        message: error.code === "ENOENT" ? "File not found." : error.message,
      });
    }
  });
});

initSocketServer(server);

server.listen(PORT, () => {
  console.log(`Omni-Kernel backend listening on http://localhost:${PORT}`);
});

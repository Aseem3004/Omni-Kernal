import { Server } from "socket.io";
import { registerSocketHandlers } from "./handlers.js";

let io = null;

export const initSocketServer = (httpServer, options = {}) => {
  io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
    ...options,
  });

  io.on("connection", (socket) => {
    console.log("Kernel Socket Connected:", socket.id);

    socket.emit("kernel_log", {
      agent: "Socket",
      status: "completed",
      message: "Real-time channel connected.",
    });

    registerSocketHandlers(socket);
  });

  return io;
};

export const getSocketServer = () => io;

export const emitAgentUpdate = (userId, data) => {
  if (!io || !userId) {
    return false;
  }

  io.to(userId).emit("kernel_log", data);
  return true;
};

export const emitAgentScreenshot = (userId, data) => {
  if (!io || !userId) {
    return false;
  }

  io.to(userId).emit("agent_screenshot", data);
  return true;
};

export const emitDataRefined = (userId, data) => {
  if (!io || !userId) {
    return false;
  }

  io.to(userId).emit("data_refined", data);
  return true;
};

export const emitFileCreated = (userId, data) => {
  if (!io || !userId) {
    return false;
  }

  io.to(userId).emit("file_created", data);
  return true;
};

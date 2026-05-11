import { io } from "socket.io-client";
import { BACKEND_URL } from "../config/backend";

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(BACKEND_URL, {
      autoConnect: true,
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
  }

  return socket;
};

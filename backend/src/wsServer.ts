// backend/src/wsServer.ts
import { WebSocketServer, WebSocket } from "ws";

type Client = WebSocket;

// We'll export this so resolvers can broadcast
let clients = new Set<Client>();

export function createWsServer(httpServer: import("http").Server) {
  const wss = new WebSocketServer({
    server: httpServer,
    path: "/ws", // separate from /graphql
  });

  wss.on("connection", (socket) => {
    console.log("[WS] client connected");
    clients.add(socket);

    socket.on("close", () => {
      console.log("[WS] client disconnected");
      clients.delete(socket);
    });

    socket.on("error", (err) => {
      console.error("[WS] socket error:", err);
      clients.delete(socket);
    });

    // Optional: handle messages from clients later if you want
    socket.on("message", (message) => {
      console.log("[WS] message from client:", message.toString());
    });
  });

  console.log("🔌 Plain WebSocket server listening on /ws");
}

export function broadcastDocumentUpdate(id: string, content: string) {
  const payload = JSON.stringify({
    type: "doc-update",
    id,
    content,
  });

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

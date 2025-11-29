// src/index.ts
// import "reflect-metadata";
import express from "express";
import http from "http";
import { ApolloServer } from "apollo-server-express";
import { schema } from "./schema";

// WebSocket stuff
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/lib/use/ws";

// (Optional) your DB or context imports
// import { db } from "./db";

async function startServer() {
  const app = express();

  // Create HTTP server
  const httpServer = http.createServer(app);

  // Create WebSocket server on top of the same HTTP server
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/graphql", // MUST match frontend ws URL path
  });

  // Bind graphql-ws to WebSocket server
  const serverCleanup = useServer(
    {
      schema,
      // Optional: pass context if you need (db, redis, user, etc.)
      // context: async (ctx, msg, args) => ({ db }),
      onConnect: async () => {
        console.log("[WS] client connected");
      },
      onDisconnect: async () => {
        console.log("[WS] client disconnected");
      },
    },
    wsServer
  );

  // Create ApolloServer for HTTP (queries + mutations)
  const apolloServer = new ApolloServer({
    schema,
    // context: () => ({ db }),
    plugins: [
      {
        // Proper shutdown of the WebSocket server when Apollo stops
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  await apolloServer.start();

  apolloServer.applyMiddleware({
    app,
    path: "/graphql",
  });

  const PORT = 4000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 HTTP GraphQL:  http://localhost:${PORT}/graphql`);
    console.log(`🔌 WS GraphQL:    ws://localhost:${PORT}/graphql`);
  });
}

startServer().catch((err) => {
  console.error("Server failed to start:", err);
});
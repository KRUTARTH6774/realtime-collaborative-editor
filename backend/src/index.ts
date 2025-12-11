// src/index.ts
// import "reflect-metadata";
import express from "express";
import http from "http";
import { ApolloServer } from "apollo-server-express";
import { schema } from "./schema";

// WebSocket stuff
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/lib/use/ws";

import cors from "cors";

// (Optional) your DB or context imports
// import { db } from "./db";

async function startServer() {
  const app = express();

  // Create HTTP server
  const httpServer = http.createServer(app);

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/graphql",
  });
  const serverCleanup = useServer(
    {
      schema,
      onConnect: async () => {
        console.log("[WS] client connected");
      },
      onDisconnect: async () => {
        console.log("[WS] client disconnected");
      },
    },
    wsServer
  );
  const FRONTEND_ORIGIN =
    process.env.FRONTEND_ORIGIN || "http://localhost:5173";

  // ⭐ attach CORS middleware *before* Apollo
  app.use(
    "/graphql",
    cors({
      origin: FRONTEND_ORIGIN.split(","), // allows one or more origins
      // credentials: true, // only if you later need cookies
    })
  );
  const apolloServer = new ApolloServer({
    schema,
    plugins: [
      {
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
    cors:false

  });

  const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 HTTP GraphQL:  http://localhost:${PORT}/graphql`);
    console.log(`🔌 WS GraphQL:    ws://localhost:${PORT}/graphql`);
  });
}

startServer().catch((err) => {
  console.error("Server failed to start:", err);
});
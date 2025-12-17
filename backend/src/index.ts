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

  const allowedOrigins = FRONTEND_ORIGIN.split(",").map((s) => s.trim());
  // ⭐ attach CORS middleware *before* Apollo
  app.use(
    "/graphql",
    cors({
      origin: (origin, cb) => {
        // allow non-browser tools (no Origin header), like curl/postman
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`CORS blocked for origin: ${origin}`));
      },
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["content-type", "apollo-require-preflight"],
    })
  );
  app.options("/graphql", cors());

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
    cors: false
  });

  const PORT = Number(process.env.PORT) || 4000;
  httpServer.listen(PORT, () => {
    console.log(`HTTP: http://localhost:${PORT}/graphql`);
    console.log(`WS: ws://localhost:${PORT}/graphql`);
    console.log("Allowed origins:", allowedOrigins);
  });
}

startServer().catch((err) => {
  console.error("Server failed to start:", err);
});
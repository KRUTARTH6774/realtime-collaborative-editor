import prisma from "./prisma";
import { PubSub } from "graphql-subscriptions";

const pubsub = new PubSub();


// import { RedisPubSub } from "graphql-redis-subscriptions";
// import { redisPublisher, redisSubscriber } from "./redis";

// const pubsub = new RedisPubSub({
//   publisher: redisPublisher,
//   subscriber: redisSubscriber
// });

interface Doc {
  id: string;
  title: String;
  content: string;
  ownerId: string;
}

// In-memory docs
// const documents: Record<string, Doc> = {
//   "1": {
//     id: "1",
//     title: "Welcome Doc",
//     content:
//       "Hello from server 👋<br/><br/>This is your first collaborative document.",
//   },
// };

// // simple incremental ID
// let nextDocId = 2;


type Presence = {
  userId: string;
  name: string;
  color: string;
  isTyping: boolean;
  cursorPos?: number | null;
};

const presenceByDoc: Record<string, Record<string, Presence>> = {};

// ---- Resolvers ----
export const resolvers = {
  Query: {
    getDocument: async (_: unknown, { id }: { id: string }) => {
      console.log("[Query] getDocument", id);
      return prisma.document.findUnique({ where: { id } });
    },

    listDocuments: async (_: unknown, { ownerId }: { ownerId: string }) => {
      return prisma.document.findMany({
        where: { ownerId },
        orderBy: { updatedAt: "desc" },
      });
    },
  },

  Mutation: {
    updateDocument: async (
      _parent: unknown,
      args: {
        id: string;
        content: string;
        userId: string;
      },
      // context: { db: any; }
    ) => {
      const { id, content, userId } = args; // extract mutation inputs
      // console.log("[Mutation] updateDocument", id, "len:", content.length);

      const existing = await prisma.document.findUnique({ where: { id } });
      if (!existing) {
        console.warn("[updateDocument] doc not found", id);
        return false;
      }

      const updatedDoc = await prisma.document.update({
        where: { id },
        data: { content },
      });

      console.log("[Mutation] updateDocument", id, "by", userId);

      await pubsub.publish(`DOCUMENT_UPDATED_${id}`, {
        documentUpdated: updatedDoc,
      });

      return true;
    },
    deleteDocument: async (
      _parent: unknown,
      args: {
        id: string;
        userId: string;
      },
      // context: { db: any; }
    ) => {
      const { id, userId } = args; // extract mutation inputs
      // console.log("[Mutation] updateDocument", id, "len:", content.length);

      const existing = await prisma.document.findUnique({ where: { id } });
      if (!existing) {
        console.warn("[updateDocument] doc not found", id);
        return false;
      }

      if (existing.ownerId !== userId) {
        console.warn(
          "[deleteDocument] user not owner, denying delete",
          id,
          userId
        );
        return false;
      };

      await prisma.document.delete({
        where: { id }
      });

      console.log("[deleteDocument] deleted", id, "by", userId);
      return true;
    },

    createDocument: async (
      _parent: unknown,
      { title, ownerId }: { title: string; ownerId: string }
    ) => {
      const doc = await prisma.document.create({
        data: {
          title: title || "Untitled",
          content: "",
          ownerId,
        },
      });

      console.log("[Mutation] createDocument", doc.id, doc.title);

      await pubsub.publish("DOCUMENT_CREATED", {
        documentCreated: doc,
      });

      return doc;
    },

    updatePresence: async (
      _: unknown,
      args: {
        docId: string;
        userId: string;
        name: string;
        color: string;
        isTyping: boolean;
        cursorPos?: number | null;
      }
    ) => {
      const { docId, userId, name, color, isTyping, cursorPos } = args;
      if (!presenceByDoc[docId]) presenceByDoc[docId] = {};

      presenceByDoc[docId][userId] = {
        userId,
        name,
        color,
        isTyping,
        cursorPos: cursorPos ?? null,
      };

      const users = Object.values(presenceByDoc[docId]);

      await pubsub.publish(`PRESENCE_UPDATED_${docId}`, {
        presenceUpdated: {
          docId,
          users,
        },
      });

      return true;
    },
  },

  Subscription: {
    documentUpdated: {
      subscribe: (_: unknown, { id }: { id: string }) => {
        console.log("[Subscription] client subscribed to DOCUMENT_UPDATED_", id);
        return pubsub.asyncIterator(`DOCUMENT_UPDATED_${id}`);
      },
    },
  
    presenceUpdated: {
      subscribe: (_: unknown, { docId }: { docId: string }) => {
        console.log("[Presence] client subscribed to PRESENCE_UPDATED_", docId);
        return pubsub.asyncIterator(`PRESENCE_UPDATED_${docId}`);
      },
    },
  
    documentCreated: {
      subscribe: () => {
        console.log("[Subscription] client subscribed to DOCUMENT_CREATED");
        return pubsub.asyncIterator("DOCUMENT_CREATED");
      },
    },
  },
  
};

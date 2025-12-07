import { PubSub } from "graphql-subscriptions";

// Simple in-memory PubSub (we'll later swap to RedisPubSub)
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
const documents: Record<string, Doc> = {
  "1": {
    id: "1",
    title: "Welcome Doc",
    content:
      "Hello from server 👋<br/><br/>This is your first collaborative document.",
  },
};

// simple incremental ID
let nextDocId = 2;


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
      return documents[id] ?? null;
    },

    listDocuments: async (_: unknown, { ownerId }: { ownerId: string }) => {
      return Object.values(documents).filter((d) => d.ownerId === ownerId);
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

      const doc = documents[id];
      if (!doc) return false;

      // 🔒 only owner can edit
      if (doc.ownerId !== userId) {
        console.warn("[updateDocument] user not owner, denying edit");
        return false;
      }

      doc.content = content;
      documents[id] = doc;

      await pubsub.publish(`DOCUMENT_UPDATED_${id}`, {
        documentUpdated: doc,
      });

      return true;
    },

    createDocument: async (
      _parent: unknown,
      { title, ownerId }: { title: string; ownerId: string }
    ) => {
      const id = String(nextDocId++);
      const doc: Doc = {
        id,
        title: title || `Untitled Document ${id}`,
        content: "",
        ownerId,
      };
      documents[id] = doc;
      console.log("[Mutation] createDocument", id, title);
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
      subscribe: (
        _parent: unknown,
        _args: { id: string; }
      ) => {
        // We are ignoring the specific id for now
        // Later we can filter by id if we want
        const { id } = _args;
        console.log("[Subscription] client subscribed to DOCUMENT_UPDATED_", id);
        return pubsub.asyncIterator(`DOCUMENT_UPDATED_${id}`);
      }
    },
    presenceUpdated: {
      subscribe: (_: unknown, { docId }: { docId: string }) => {
        console.log(
          "[Presence] client subscribed to PRESENCE_UPDATED_",
          docId
        );
        return pubsub.asyncIterator(`PRESENCE_UPDATED_${docId}`);
      },
    },
    documentCreated: {
      subscribe: () => {
        console.log("[Subscription] client subscribed to DOCUMENT_CREATED");
        return pubsub.asyncIterator("DOCUMENT_CREATED");
      },
    },
  }
};

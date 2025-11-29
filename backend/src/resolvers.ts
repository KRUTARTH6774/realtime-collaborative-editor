import { PubSub } from "graphql-subscriptions";

// Simple in-memory PubSub (we'll later swap to RedisPubSub)
const pubsub = new PubSub();

// import { RedisPubSub } from "graphql-redis-subscriptions";
// import { redisPublisher, redisSubscriber } from "./redis";

// const pubsub = new RedisPubSub({
//   publisher: redisPublisher,
//   subscriber: redisSubscriber
// });

type DocumentType = {
  id: string;
  content: string;
};

// Start with one example document
const documents: Record<string, DocumentType> = {
  "1": { id: "1", content: "Hello world from in-memory doc!" }
};

// ---- Resolvers ----
export const resolvers = {
  Query: {
    getDocument: async (
      _parent: unknown,
      args: { id: string; },
      context: { db: any; }
    ) => {
      const { id } = args;      // extract id from args
      const { db } = context;   // extract db from context
      const doc = documents[id] ?? null;
      return doc;
      //   const doc = await db.document.findUnique({
      //     where: { id }
      //   });

      //   return doc;
    }
  },

  Mutation: {
    updateDocument: async (
      _parent: unknown,
      args: {
        id: string;
        content: string;
      },
      // context: { db: any; }
    ) => {
      const { id, content } = args; // extract mutation inputs
      documents[id] = { id, content };
      const updatedDoc = documents[id];
      // console.log(updatedDoc);
      
      // Important: GraphQL subscriptions expect the payload shape
      // to match the field name in the subscription: documentUpdated
      await pubsub.publish(`DOCUMENT_UPDATED_${id}`, {
        documentUpdated: updatedDoc,
      });
      console.log("[Mutation] published DOCUMENT_UPDATED_", id);
      return true;

      // const { db } = context;       // extract db from context

      // await db.document.update({
      //   where: { id },
      //   data: { content }
      // });

      // const updatedDoc = { id, content };

      // // Notify all subscribers that the document was updated
      // pubsub.publish("DOCUMENT_UPDATED", updatedDoc);

      // return true;
    }
  },

  Subscription: {
    documentUpdated: {
      subscribe: (
        _parent: unknown,
        _args: { id: string; }
      ) => {
        // We are ignoring the specific id for now
        // Later we can filter by id if we want
        const { id} = _args;
        console.log("[Subscription] client subscribed to DOCUMENT_UPDATED_", id);
        return pubsub.asyncIterator(`DOCUMENT_UPDATED_${id}`);
      }
    }
  }
};

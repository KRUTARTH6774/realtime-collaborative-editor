// src/schema.ts
import { gql } from "apollo-server-express";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { resolvers } from "./resolvers";

const typeDefs = gql`
  type Document {
    id: ID!
    title: String!
    content: String!
    ownerId: ID!
  }

  type Query {
    getDocument(id: ID!): Document
    listDocuments(ownerId: ID!): [Document!]!
  }

  type Mutation {
    updateDocument(id: ID!, content: String!, userId: ID!): Boolean
    createDocument(title: String!, ownerId: ID!): Document!
    updatePresence(
      docId: ID!
      userId: ID!
      name: String!
      color: String!
      isTyping: Boolean!
      cursorPos: Int
    ): Boolean
  }

  type Presence {
    userId: ID!
    name: String!
    color: String!
    isTyping: Boolean!
    cursorPos: Int
  }

  type PresenceUpdate {
    docId: ID!
    users: [Presence!]!
  }

  type Subscription {
    documentUpdated(id: ID!): Document
    presenceUpdated(docId: ID!): PresenceUpdate
    documentCreated: Document      
  }  
`;



export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

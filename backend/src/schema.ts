// src/schema.ts
import { gql } from "apollo-server-express";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { resolvers } from "./resolvers";

export const typeDefs = gql`
  type Document {
    id: ID!
    content: String!
  }

  type Query {
    getDocument(id: ID!): Document
  }

  type Mutation {
    updateDocument(id: ID!, content: String!): Boolean
  }

  type Subscription {
    documentUpdated(id: ID!): Document
  }
`;

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

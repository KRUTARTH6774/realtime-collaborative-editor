// src/apolloClient.ts
import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
} from "@apollo/client";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";
import { getMainDefinition } from "@apollo/client/utilities";

const HTTP_URL = import.meta.env.VITE_GRAPHQL_HTTP_URL || "http://localhost:4000/graphql";
const WS_URL = import.meta.env.VITE_GRAPHQL_WS_URL || "ws://localhost:4000/graphql";

const httpLink = new HttpLink({ uri: HTTP_URL });

const wsLink = new GraphQLWsLink(
  createClient({
    url: WS_URL,
  })
);


// Route subscription operations to wsLink, others to httpLink
const splitLink = ApolloLink.split(
  ({ query }) => {
    const def = getMainDefinition(query);
    return (
      def.kind === "OperationDefinition" &&
      def.operation === "subscription"
    );
  },
  wsLink,
  httpLink
);

export const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

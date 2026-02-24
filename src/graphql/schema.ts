import { gql } from 'apollo-server-core';

const typeDefs = gql`
  scalar JSON

  type Configuration {
    key: ID!
    userId: ID!
    value: JSON!
    createdOnDateTime: String
    lastUpdatedOnDateTime: String
  }

  type Query {
    configurations(userId: ID!, keys: [String!]): [Configuration!]!
  }

  type Mutation {
    upsertConfiguration(key: String!, userId: ID!, value: JSON!): Configuration!
    deleteConfiguration(key: String!, userId: ID!): Boolean!
  }
`;

export default typeDefs;

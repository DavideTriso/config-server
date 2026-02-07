import { gql } from 'apollo-server-core';

const typeDefs = gql`
  scalar JSON

  type Configuration {
    key: String!
    userId: String
    value: JSON!
    createdAt: String
    updatedAt: String
  }

  type Query {
    configurations(userId: ID!, keys: [String!]): [Configuration!]!
  }

  type Mutation {
    upsertConfiguration(key: String!, value: JSON!, userId: ID): Configuration!
  }
`;

export default typeDefs;

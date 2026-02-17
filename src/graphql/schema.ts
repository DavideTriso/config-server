import { gql } from 'apollo-server-core';

const typeDefs = gql`
  scalar JSON

  type Configuration {
    key: String!
    userId: String!
    value: JSON!
    createdOnDateTime: String
    updatedOnDateTime: String
  }

  type Query {
    configurations(userId: ID!, keys: [String!]): [Configuration!]!
  }

  type Mutation {
    upsertConfiguration(key: String!, userId: ID!, value: JSON!): Configuration!
  }
`;

export default typeDefs;

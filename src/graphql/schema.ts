import { gql } from 'apollo-server-core';

const typeDefs = gql`
  scalar JSON

  type Configuration {
    key: String!
    userId: String
    value: JSON!
    createdAt: String
    updatedAt: String
    upserted: Boolean
  }

  input DefaultConfigurationInput {
    key: String!
    value: JSON!
  }

  type Query {
    configurations(userId: ID!, keys: [String!]): [Configuration!]!
  }

  type Mutation {
    upsertConfiguration(key: String!, userId: ID!, value: JSON!): Configuration!
    upsertDefaultConfigurations(configurations: [DefaultConfigurationInput!]!): [Configuration!]!
  }
`;

export default typeDefs;

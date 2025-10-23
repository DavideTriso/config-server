const { gql } = require('apollo-server-core');

const typeDefs = gql`
  scalar JSON

  type Configuration {
    key: String!
    userId: String!
    value: JSON!
    createdAt: String
    updatedAt: String
  }

  type Query {
    getConfiguration(key: String!): Configuration
    getUserConfigurations: [Configuration!]!
  }

  type Mutation {
    upsertConfiguration(key: String!, value: JSON!): Configuration!
  }
`;

module.exports = typeDefs;
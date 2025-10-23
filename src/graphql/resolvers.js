const { ConfigModel } = require('../database/models');
const { GraphQLJSON } = require('graphql-type-json');

const configModel = new ConfigModel();

const resolvers = {
  JSON: GraphQLJSON,

  Query: {
    async getConfiguration(_, { key }, { userId }) {
      if (!userId) {
        throw new Error('Authentication required');
      }
      
      return await configModel.findByKeyAndUserId(key, userId);
    },

    async getUserConfigurations(_, __, { userId }) {
      if (!userId) {
        throw new Error('Authentication required');
      }
      
      return await configModel.findByUserId(userId);
    }
  },

  Mutation: {
    async upsertConfiguration(_, { key, value }, { userId }) {
      if (!userId) {
        throw new Error('Authentication required');
      }
      
      return await configModel.upsert(key, userId, value);
    }
  }
};

module.exports = resolvers;
import { ConfigModel } from '../database/models';
import { GraphQLJSON } from 'graphql-type-json';
import { ResolverContext } from '../types';

const configModel = new ConfigModel();

interface ConfigurationsArgs {
  userId: string;
  keys?: string[];
}

interface UpsertConfigurationArgs {
  key: string;
  value: unknown;
  userId?: string;
}

const resolvers = {
  JSON: GraphQLJSON,

  Query: {
    async configurations(_: any, { userId, keys }: ConfigurationsArgs, { userId: contextUserId }: ResolverContext) {
      if (!contextUserId) {
        throw new Error('Authentication required');
      }
      
      return await configModel.findByUserIdAndKeys(userId, keys);
    }
  },

  Mutation: {
    async upsertConfiguration(_: any, { key, value, userId }: UpsertConfigurationArgs, { userId: contextUserId }: ResolverContext) {
      if (!contextUserId) {
        throw new Error('Authentication required');
      }
      
      // If userId is not provided, create a default configuration (no userId)
      return await configModel.upsert(key, userId || null, value);
    }
  }
};

export default resolvers;

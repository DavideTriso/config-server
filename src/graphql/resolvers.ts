import { ConfigModel } from '../database/models';
import { GraphQLJSON } from 'graphql-type-json';
import { ResolverContext } from '../types';

const configModel = new ConfigModel();

interface GetConfigurationArgs {
  key: string;
}

interface UpsertConfigurationArgs {
  key: string;
  value: unknown;
}

const resolvers = {
  JSON: GraphQLJSON,

  Query: {
    async getConfiguration(_: any, { key }: GetConfigurationArgs, { userId }: ResolverContext) {
      if (!userId) {
        throw new Error('Authentication required');
      }
      
      return await configModel.findByKeyAndUserId(key, userId);
    },

    async getUserConfigurations(_: any, __: any, { userId }: ResolverContext) {
      if (!userId) {
        throw new Error('Authentication required');
      }
      
      return await configModel.findByUserId(userId);
    }
  },

  Mutation: {
    async upsertConfiguration(_: any, { key, value }: UpsertConfigurationArgs, { userId }: ResolverContext) {
      if (!userId) {
        throw new Error('Authentication required');
      }
      
      return await configModel.upsert(key, userId, value);
    }
  }
};

export default resolvers;

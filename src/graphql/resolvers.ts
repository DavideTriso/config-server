import { ConfigModel } from '../database/ConfigModel';
import { GraphQLJSON } from 'graphql-type-json';
import { ResolverContextInterface } from '../types';
import { ConfigurationsArgsInterface } from './types/ConfigurationsArgsInterface';
import { UpsertConfigurationArgsInterface } from './types/UpsertConfigurationArgsInterface';
import { validateConfigurationInput } from './validation';
import { ZodError } from 'zod';

const configModel = new ConfigModel();

const resolvers = {
    JSON: GraphQLJSON,

    Query: {
        async configurations(_parent: unknown, { userId, keys }: ConfigurationsArgsInterface, { userId: contextUserId }: ResolverContextInterface) {
            if (!contextUserId) {
                throw new Error('Authentication required');
            }

            return await configModel.findByUserIdAndKeys(userId, keys);
        }
    },

    Mutation: {
        async upsertConfiguration(_parent: unknown, { key, value, userId }: UpsertConfigurationArgsInterface, { userId: contextUserId }: ResolverContextInterface) {
            if (!contextUserId) {
                throw new Error('Authentication required');
            }

            // Validate input
            try {
                validateConfigurationInput({ key, value, userId: userId || null });
            } catch (error) {
                if (error instanceof ZodError) {
                    const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; ');
                    throw new Error(`Validation failed: ${messages}`);
                }
                throw error;
            }

            // If userId is not provided, create a default configuration (no userId)
            return await configModel.upsert(key, userId || null, value);
        }
    }
};

export default resolvers;

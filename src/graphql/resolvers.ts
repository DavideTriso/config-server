import { ConfigurationSchema } from '../document/ConfigurationModel';
import { GraphQLJSON } from 'graphql-type-json';
import { ResolverContextInterface } from '../types';
import { ConfigurationsArgsInterface } from './types/ConfigurationsArgsInterface';
import { UpsertConfigurationArgsInterface } from './types/UpsertConfigurationArgsInterface';
import { validateConfigurationInput } from './validation';
import { ZodError } from 'zod';

const resolvers = {
    JSON: GraphQLJSON,

    Query: {
        async configurations(_parent: unknown, { userId, keys }: ConfigurationsArgsInterface, { userId: contextUserId }: ResolverContextInterface) {
            if (!contextUserId) {
                throw new Error('Authentication required');
            }

            return await ConfigurationSchema.findByUserIdAndKeys(userId, keys);
        }
    },

    Mutation: {
        async upsertConfiguration(_parent: unknown, { key, userId, value }: UpsertConfigurationArgsInterface, { userId: contextUserId }: ResolverContextInterface) {
            if (!contextUserId) {
                throw new Error('Authentication required');
            }

            try {
                validateConfigurationInput({ key, value, userId });
            } catch (error) {
                if (error instanceof ZodError) {
                    const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; ');
                    throw new Error(`Validation failed: ${messages}`);
                }
                throw error;
            }

            return await ConfigurationSchema.upsertConfiguration(key, userId, value);
        },

        async upsertDefaultConfigurations(
            _parent: unknown,
            { configurations }: { configurations: Array<{ key: string; value: unknown }> },
            { userId: contextUserId, isAdmin }: ResolverContextInterface
        ) {
            if (!contextUserId) {
                throw new Error('Authentication required');
            }

            if (!isAdmin) {
                throw new Error('Admin privileges required to manage default configurations');
            }

            // Validate all configurations
            for (const config of configurations) {
                try {
                    validateConfigurationInput({ key: config.key, value: config.value, userId: 'default' });
                } catch (error) {
                    if (error instanceof ZodError) {
                        const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; ');
                        throw new Error(`Validation failed for key "${config.key}": ${messages}`);
                    }
                    throw error;
                }
            }

            return await ConfigurationSchema.upsertDefaultConfigurations(configurations);
        }
    }
};

export default resolvers;

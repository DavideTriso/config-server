import ConfigurationModel from '../model/ConfigurationModel';
import { GraphQLJSON } from 'graphql-type-json';
import ConfigurationsResolverArgsInterface from './types/ConfigurationsResolverArgsInterface';
import UpsertConfigurationResolverArgsInterface from './types/UpsertConfigurationResolverArgsInterface';
import ResolverContextInterface from './types/ResolverContextInterface';
import handleError from './handleError';
import DeleteConfigurationResolverArgsInterface from './types/DeleteConfigurationResolverArgsInterface';

const resolvers = {
    JSON: GraphQLJSON,

    Query: {
        async configurations(
            _parent: unknown,
            args: ConfigurationsResolverArgsInterface,
            context: ResolverContextInterface
        ) {
            try {
                return await ConfigurationModel.findByUserIdAndKeys(
                    { userId: args.userId, keys: args.keys },
                    true,
                    context.authorizationToken
                );
            } catch (error) {
                handleError(error);
            }
        }
    },

    Mutation: {
        async upsertConfiguration(
            _parent: unknown,
            args: UpsertConfigurationResolverArgsInterface,
            context: ResolverContextInterface
        ) {
            try {
                return await ConfigurationModel
                    .upsert(
                        { key: args.key, userId: args.userId, value: args.value },
                        true,
                        context.authorizationToken
                    );
            } catch (error) {
                handleError(error);
            }
        },
        async deleteConfiguration(
            _parent: unknown,
            args: DeleteConfigurationResolverArgsInterface,
            context: ResolverContextInterface
        ) {
            try {
                await ConfigurationModel.deleteByKeyAndUserId(
                    { key: args.key, userId: args.userId },
                    true,
                    context.authorizationToken
                );
                return true;
            } catch (error) {
                handleError(error);
            }
        }
    }
};

export default resolvers;

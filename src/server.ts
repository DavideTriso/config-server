import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import dotenv from 'dotenv';

dotenv.config();

import databaseConnection from './database/DatabaseConnection';
import typeDefs from './graphql/schema';
import resolvers from './graphql/resolvers';
import authMiddleware from './middleware/auth';
import { ResolverContextInterface } from './types';

function createApolloServer(): ApolloServer<ResolverContextInterface> {
    return new ApolloServer<ResolverContextInterface>({
        typeDefs,
        resolvers,
    });
}

function setupGracefulShutdown(): void {
    const shutdownHandler = async (signal: string) => {
        console.log(`${signal} received, shutting down gracefully`);
        await databaseConnection.disconnect();
        process.exit(0);
    };

    process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
    process.on('SIGINT', () => shutdownHandler('SIGINT'));
}

async function startServer(): Promise<void> {
    await databaseConnection.connect();

    const server = createApolloServer();

    const { url } = await startStandaloneServer(server, {
        listen: { port: parseInt(process.env.PORT || '4000') },
        context: async ({ req: request }) => {
            return await authMiddleware(request);
        },
    });

    console.log(`Server ready at ${url}`);
    console.log(`Health check available at GraphQL playground`);

    setupGracefulShutdown();
}

startServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});

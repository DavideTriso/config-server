import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import dotenv from 'dotenv';

dotenv.config();

import db from './database/connection';
import typeDefs from './graphql/schema';
import resolvers from './graphql/resolvers';
import authMiddleware from './middleware/auth';

async function startServer(): Promise<void> {
  // Connect to database
  await db.connect();

  // Create Apollo Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: parseInt(process.env.PORT || '4000') },
    context: async ({ req }) => {
      return await authMiddleware(req);
    },
  });

  console.log(`🚀 Server ready at ${url}`);
  console.log(`📊 Health check available at GraphQL playground`);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await db.disconnect();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await db.disconnect();
    process.exit(0);
  });
}

// Start the server
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

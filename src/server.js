const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
require('dotenv').config();

const db = require('./database/connection');
const typeDefs = require('./graphql/schema');
const resolvers = require('./graphql/resolvers');
const authMiddleware = require('./middleware/auth');

async function startServer() {
  // Connect to database
  await db.connect();

  // Create Apollo Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: process.env.PORT || 4000 },
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
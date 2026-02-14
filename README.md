# Config Server

A GraphQL-based configuration server for storing user UI settings and preferences, such as theme preferences (light/dark mode), language settings, and other user-specific configurations.

## Features

- **GraphQL API** with Apollo Server
- **MongoDB persistence** with Mongoose ODM and connection pooling
- **Token-based authentication**
- **CLI for token management**
- **Configuration management** by key and user ID
- **Upsert operations** for seamless config updates

## Tech Stack

- **Node.js** - Runtime environment
- **Apollo Server** - GraphQL server
- **MongoDB** - Document database
- **Mongoose** - MongoDB ODM with connection pooling
- **Express** - Web framework
- **Commander.js** - CLI framework

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```
4. Update `.env` with your MongoDB connection string and other settings
5. Start the server:
   ```bash
   npm start
   ```

The server will be available at `http://localhost:4000/graphql`

## Docker Development Environment

You can run the application in a containerized development environment using Docker Compose.

### Prerequisites

- Docker Engine installed on your system
- Docker Compose v2.0 or higher

### Starting the Services

To start both the application and MongoDB in development mode:

```bash
docker compose -f docker-compose.dev.yaml up
```

Or to run in detached mode (background):

```bash
docker compose -f docker-compose.dev.yaml up -d
```

**Note**: The first startup will take a few minutes as it installs dependencies. Subsequent starts will be much faster as dependencies are cached in a Docker volume.

The services will be available at:
- **GraphQL Server**: `http://localhost:4000/graphql`
- **MongoDB**: `mongodb://localhost:27017/config-server`

### Stopping the Services

To stop the services:

```bash
docker compose -f docker-compose.dev.yaml down
```

To stop and remove volumes (this will delete all data):

```bash
docker compose -f docker-compose.dev.yaml down -v
```

### Viewing Logs

To view logs for all services:

```bash
docker compose -f docker-compose.dev.yaml logs -f
```

To view logs for a specific service:

```bash
docker compose -f docker-compose.dev.yaml logs -f app
```

### Development Features

- **Hot Reload**: Changes to source files are automatically detected and the server restarts
- **Persistent Data**: MongoDB data is persisted in Docker volumes
- **Isolated Environment**: All dependencies are contained within Docker containers

## Token Management

Use the CLI tool to manage authentication tokens. Tokens are global and used by client applications to authenticate with the GraphQL server.

### Create a token
```bash
npm run token create --name "My App Token"
```

### Create a token with expiration (30 days)
```bash
npm run token create --name "Temp Token" --expires 30
```

### List all tokens
```bash
npm run token list
```

### Revoke a token
```bash
npm run token revoke --token your-token-here
```

### Deactivate a token (without deleting)
```bash
npm run token deactivate --id token-id-here
```

## Database Seeding

For development and testing purposes, you can populate the database with sample data using the seeding tool.

### Bootstrap development environment (recommended)
```bash
npm run bootstrap-dev
```

This command will:
1. Drop existing Configurations and Tokens collections
2. Recreate collections with proper indexes
3. Automatically seed all collections with test data

This is the easiest way to reset your development database to a clean state with fresh test data.

### Seed all collections with test data
```bash
npm run seed
```

This will create:
- **Sample configurations** for 3 test users (alice, bob, charlie) with various settings like theme, language, notifications, etc.
- **Default/fallback configurations** for common settings
- **1000+ random configuration records** with diverse keys and values for performance testing
- **Test tokens** for client applications (tokens will be displayed in the console output for easy access)

### Seed specific collections only
```bash
# Seed only configurations
npm run seed -- --collections configurations

# Seed only tokens
npm run seed -- --collections tokens
```

### Clear existing data before seeding
```bash
npm run seed -- --clear
```

This will delete all existing data in the collections before inserting the seed data.

### Combine options
```bash
# Clear and seed only configurations
npm run seed -- --clear --collections configurations
```

### Sample Seed Data

The seeder creates the following test users:
- **alice** - Uses dark theme, English language, email notifications
- **bob** - Uses light theme, Spanish language, all notifications enabled
- **charlie** - Uses auto theme, French language, accessibility settings enabled

Additionally, the seeder generates **1000 random configuration records** using `@faker-js/faker` with:
- Approximately 200 unique random user IDs
- Various configuration keys (theme, language, timezone, notifications, dashboard settings, etc.)
- Diverse data types (strings, numbers, booleans, objects)
- Realistic test data for performance and load testing

Multiple authentication tokens are created for client applications to use during testing.

## GraphQL API

### Authentication

Include the token in the Authorization header:
```
Authorization: Bearer your-token-here
```

### Queries

#### Get configurations for a user
```graphql
query GetConfigurations($userId: ID!, $keys: [String!]) {
  configurations(userId: $userId, keys: $keys) {
    key
    userId
    value
    createdAt
    updatedAt
  }
}
```

#### Get specific configurations by keys
```graphql
query GetSpecificConfigurations($userId: ID!) {
  configurations(userId: $userId, keys: ["theme", "language"]) {
    key
    userId
    value
    createdAt
    updatedAt
  }
}
```

### Mutations

#### Upsert a user configuration
```graphql
mutation UpsertConfiguration($key: String!, $value: JSON!, $userId: ID!) {
  upsertConfiguration(key: $key, value: $value, userId: $userId) {
    key
    userId
    value
    updatedAt
  }
}
```

#### Upsert a default/fallback configuration
```graphql
mutation UpsertDefaultConfiguration($key: String!, $value: JSON!) {
  upsertConfiguration(key: $key, value: $value) {
    key
    userId
    value
    updatedAt
  }
}
```

## Example Usage

### Theme Configuration
```graphql
mutation SetTheme($userId: ID!) {
  upsertConfiguration(
    key: "theme"
    userId: $userId
    value: {
      mode: "dark"
      primaryColor: "#007acc"
      fontSize: "medium"
    }
  ) {
    key
    value
    updatedAt
  }
}
```

### Default Theme Configuration (Fallback)
```graphql
mutation SetDefaultTheme {
  upsertConfiguration(
    key: "theme"
    value: {
      mode: "light"
      primaryColor: "#ffffff"
      fontSize: "medium"
    }
  ) {
    key
    value
    updatedAt
  }
}
```

### Language Preference
```graphql
mutation SetLanguage($userId: ID!) {
  upsertConfiguration(
    key: "language"
    userId: $userId
    value: {
      locale: "en-US"
      timezone: "America/New_York"
    }
  ) {
    key
    value
    updatedAt
  }
}
```

## Environment Variables

- `MONGODB_URI` - MongoDB connection string
- `PORT` - Server port (default: 4000)
- `NODE_ENV` - Environment (development/production)

## Testing

Run the test suite:
```bash
npm test
```

## API Endpoints

- **GraphQL Endpoint**: `POST /graphql`
- **Health Check**: `GET /health`

## Security

- All GraphQL operations require authentication via Bearer token
- Tokens are stored in MongoDB with optional expiration
- Each configuration is isolated by user ID
- No sensitive data should be stored (this is for UI preferences only)

## License

ISC

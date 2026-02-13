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

Use the CLI tool to manage authentication tokens:

### Create a token
```bash
npm run token create --user-id user123 --name "My App Token"
```

### Create a token with expiration (30 days)
```bash
npm run token create --user-id user123 --name "Temp Token" --expires 30
```

### List all tokens
```bash
npm run token list
```

### List tokens for specific user
```bash
npm run token list --user-id user123
```

### Revoke a token
```bash
npm run token revoke --token your-token-here
```

### Deactivate a token (without deleting)
```bash
npm run token deactivate --id token-id-here
```

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

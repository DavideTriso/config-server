# Config Server

A GraphQL-based configuration server for storing user UI settings and preferences, such as theme preferences (light/dark mode), language settings, and other user-specific configurations.

## Features

- **GraphQL API** with Apollo Server
- **MongoDB persistence** (no ORMs/ODMs)
- **Token-based authentication**
- **CLI for token management**
- **Configuration management** by key and user ID
- **Upsert operations** for seamless config updates

## Tech Stack

- **Node.js** - Runtime environment
- **Apollo Server** - GraphQL server
- **MongoDB** - Document database
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

#### Get a specific configuration
```graphql
query GetConfiguration($key: String!) {
  getConfiguration(key: $key) {
    key
    userId
    value
    createdAt
    updatedAt
  }
}
```

#### Get all user configurations
```graphql
query GetUserConfigurations {
  getUserConfigurations {
    key
    userId
    value
    createdAt
    updatedAt
  }
}
```

### Mutations

#### Upsert a configuration
```graphql
mutation UpsertConfiguration($key: String!, $value: JSON!) {
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
mutation SetTheme {
  upsertConfiguration(
    key: "theme"
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

### Language Preference
```graphql
mutation SetLanguage {
  upsertConfiguration(
    key: "language"
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

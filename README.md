# Config Server

A lightweight GraphQL service for storing and retrieving non-sensitive, user-specific application settings, such as UI preferences and personalized state. Each configuration is identified by the combination of `userId` and `key`.

> Configuration `userId` values are supplied by API clients; they are not tied to the authorization token. Every valid token can access configurations for any user ID, so this service does not provide per-user access control.

## Requirements

- Node.js 20.19 or later
- MongoDB, locally or remotely

## Getting started

1. Install dependencies and create a local environment file:

   ```sh
   npm ci
   cp .env.example .env
   ```

2. Set `APP_SECRET` in `.env` to a strong, private value. The example file includes a placeholder; replace it before using the API. Keep this secret stable because it is used to validate authorization tokens.

   `.env.example` also sets the default port and MongoDB connection string:

   | Variable | Purpose | Default |
   | --- | --- | --- |
   | `PORT` | HTTP port for the GraphQL server | `4000` |
   | `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/config-server` |
   | `APP_SECRET` | Secret used to sign and verify authorization tokens | None; required |

3. Make sure MongoDB is running at the configured URI. To start the MongoDB service from the included Compose file:

   ```sh
   docker compose -f docker-compose.dev.yaml up -d db
   ```

4. Start the server:

   ```sh
   npm run dev
   ```

   The GraphQL endpoint is `http://localhost:4000/` by default. Use `PORT` to select another port.

For a compiled start, run `npm start`; this builds the TypeScript source and starts the server. `npm run build` builds without starting it.

The full development Compose stack is also available with `docker compose -f docker-compose.dev.yaml up`. The app service must be given `APP_SECRET` in its Compose environment before using token management or authenticated API requests.

## Authorization

All GraphQL queries and mutations require a valid, unexpired token in the `Authorization` HTTP header. Set its authentication scheme to `Bearer` and provide the token value printed by the token manager.

Tokens are system-wide and have no user-specific permissions or scopes. Treat them as credentials: keep them private, do not expose them in client-side code, and do not commit them to source control.

Create a token with the token manager (the generated token is printed only once):

```sh
npm run token-manager -- create local-development
```

Use the printed value in the `Authorization` header. Token names must be unique and 3–30 characters long.

### Token management

The token manager connects to the MongoDB database specified by `MONGODB_URI` and supports:

```sh
npm run token-manager -- list
npm run token-manager -- create <name>
npm run token-manager -- expire <name>
npm run token-manager -- delete <name>
npm run token-manager -- delete-all-expired
```

- `list` shows token names and expiration status.
- `create` prints the authorization token once. Store it securely; it cannot be retrieved later.
- `expire` immediately makes a token unusable.
- `delete` permanently removes a token only after it has been expired.
- `delete-all-expired` permanently removes every expired token.

## GraphQL API

Send GraphQL requests to the server endpoint with the bearer token above. The API provides one query and two mutations.

### Query configurations

Pass `keys` to retrieve only selected configurations. Omit it to retrieve all configurations for the user:

```graphql
query {
  configurations(userId: "user123", keys: ["theme", "language"]) {
    userId
    key
    value
    createdOnDateTime
    lastUpdatedOnDateTime
  }
}
```

Example response:

```json
{
  "data": {
    "configurations": [
      {
        "userId": "user123",
        "key": "theme",
        "value": {
          "mode": "dark",
          "primaryColor": "#3b82f6"
        },
        "createdOnDateTime": "2025-01-01T12:00:00.000Z",
        "lastUpdatedOnDateTime": "2025-01-01T12:00:00.000Z"
      }
    ]
  }
}
```

### Create or update a configuration

`upsertConfiguration` creates the configuration if it does not exist, or replaces its value if it does. The `value` field accepts JSON:

```graphql
mutation {
  upsertConfiguration(
    userId: "user123"
    key: "theme"
    value: { mode: "dark", primaryColor: "#3b82f6" }
  ) {
    userId
    key
    value
    createdOnDateTime
    lastUpdatedOnDateTime
  }
}
```

### Delete a configuration

```graphql
mutation {
  deleteConfiguration(userId: "user123", key: "theme")
}
```

The mutation returns `true` when the request succeeds.

Configuration keys and user IDs must be 1–200 characters and may contain letters, numbers, and the supported punctuation characters. A serialized configuration value may contain at most 50,000 characters. Do not store sensitive information in configuration values.

## Administrative commands

The configuration manager can delete configurations directly from the database without an API token. At least one filter is required; using only one filter deletes all configurations matching that key or user ID.

```sh
npm run configuration-manager -- delete --key theme --userId user123
npm run configuration-manager -- delete --key theme
npm run configuration-manager -- delete --userId user123
```

The seeder is intended for disposable development or test databases only. It deletes all existing tokens and configurations, then creates sample data and prints two new authorization tokens:

```sh
npm run seeder -- seed
```

## Tests

Run the test suite with:

```sh
npm test
```

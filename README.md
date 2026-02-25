# Config Server

A lightweight configuration management service that enables front-end applications to manage non-sensitive user-specific configurations through a GraphQL API. Ideal for persisting UI preferences, theme choices, and personalized application state across sessions and devices.

Configurations are uniquely identified by a combination of `userId` and `key`. Each user can maintain multiple configurations for different purposes.

## Getting Started

//TODO

## Authorization

The system implements a token-based authorization mechanism. Clients must include a valid token in the `Authorization` header of their requests with the format `Bearer <token>`.

Tokens are valid system-wide and grant access to all configurations. They are designed for simplicity and ease of use, without user-specific permissions or scopes, making them ideal for internal applications or trusted clients. 

> NOTE: since tokens grant access to all configurations, they should be treated as sensitive credentials and stored securely. Only share tokens with trusted parties and avoid exposing them in client-side code or public repositories.

For example:
```
Authorization: Bearer abcdecHJvdmE=:ZTgyM2E4NWU0MTAxYmZlNWJiMWJmMDRlNjhiODE1ODk0N2IxMWYxNDY4YWMyNDk0OGQ5MjY3NTU4ZGFjNWY1NDY0MjlmYTFjYThkYjkwYTA2N2YyNmQ4YzVkMGI5ZmIxMjJlZTQ2MDEwNTE3M2RlZjVhNjRmZDBkZjI5NmNkMWU=:m147wACXk+nMYv23TxiB4aDA7a1540MiA/O2sQxRpgZD+iwkFf4E1GL6eKEpbQwibkmvDNFWfKi0NJ4ETJ5Dhw==f1234567890
```

The access tokens are managed through a simple CLI tool that allows administrators to list, create, expire and delete tokens as needed. 
Tokens are identified by a unique name. The CLI commands are as follows:

* `npm run token-manager list`: outputs a table with informations about all existing tokens;
* `npm run token-manager create <name>`: creates a new token with the specified name; upon creation, the authorization token is displayed in the CLI output: copy and store it securely, as it will not be shown again;
* `npm run token-manager expire <name>`: expires the specified token, making it invalid for future API requests;
* `npm run token-manager delete <name>`: deletes an expired token permanently from the system;
* `npm run token-manager delete-all-expired`: deletes all expired tokens permanently from the system.


## GraphQL API

The GraphQL API is extremely simple. It comprises one query for retrieving configurations and two mutations for creating/updating and deleting configurations.

### Queries

**`configurations`** - Retrieve configurations for a user

Fetch specific configurations by providing keys:
```graphql
query {
    configurations(userId: "user123", keys: ["theme", "language"]) {
        userId
        key
        value
    }
}
```

Fetch all configurations for a user:
```graphql
query {
    configurations(userId: "user123") {
        userId
        key
        value
    }
}
```

**Response Example:**
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
                }
            },
            {
                "userId": "user123",
                "key": "language",
                "value": {
                    "locale": "en-US",
                    "timezone": "America/New_York"
                }
            }
        ]
    }
}
```

### Mutations

**`upsertConfiguration`** - Create or update a configuration
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
    }
}
```

**`deleteConfiguration`** - Delete a configuration
```graphql
mutation {
    deleteConfiguration(userId: "user123", key: "theme")
}
```
# Example GraphQL Queries and Mutations

## Setup

1. Create a token for a user:
```bash
npm run token create --user-id user123 --name "My App Token"
```

2. Use the returned token in your GraphQL requests:
```
Authorization: Bearer your-token-here
```

## Example Queries

### Get All Configurations for a User
```graphql
query GetAllConfigs($userId: ID!) {
  configurations(userId: $userId) {
    key
    value
    updatedAt
  }
}
```

### Get Specific Configurations by Keys
```graphql
query GetThemeAndLanguage($userId: ID!) {
  configurations(userId: $userId, keys: ["theme", "language"]) {
    key
    userId
    value
    updatedAt
  }
}
```

## Example Mutations

### Set User Theme (Dark Mode)
```graphql
mutation SetDarkTheme($userId: ID!) {
  upsertConfiguration(
    key: "theme"
    userId: $userId
    value: {
      mode: "dark"
      primaryColor: "#007acc"
      fontSize: "medium"
      sidebarCollapsed: false
    }
  ) {
    key
    value
    updatedAt
  }
}
```

### Set Default Theme (Fallback)
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

## Response Format

All responses follow this structure:

```json
{
  "data": {
    "upsertConfiguration": {
      "key": "theme",
      "value": {
        "mode": "dark",
        "primaryColor": "#007acc"
      },
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

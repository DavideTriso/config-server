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

### Get Theme Configuration
```graphql
query GetTheme {
  getConfiguration(key: "theme") {
    key
    userId
    value
    updatedAt
  }
}
```

### Get All User Configurations
```graphql
query GetAllConfigs {
  getUserConfigurations {
    key
    value
    updatedAt
  }
}
```

## Example Mutations

### Set Theme (Dark Mode)
```graphql
mutation SetDarkTheme {
  upsertConfiguration(
    key: "theme"
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

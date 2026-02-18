import { ApolloServer } from '@apollo/server';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import typeDefs from '../../src/graphql/schema';
import resolvers from '../../src/graphql/resolvers';
import contextMiddleware from '../../src/graphql/contextMiddleware';
import ResolverContextInterface from '../../src/graphql/types/ResolverContextInterface';
import TokenModel from '../../src/model/TokenModel';
import ConfigurationModel from '../../src/model/ConfigurationModel';

describe('GraphQL API Functional Tests', () => {
    let mongoServer: MongoMemoryServer;
    let server: ApolloServer<ResolverContextInterface>;
    let authorizationToken: string;

    beforeAll(async () => {
        // Set up APP_SECRET for HMAC validation
        process.env.APP_SECRET = 'test-secret-key-for-functional-tests';

        // Start in-memory MongoDB instance
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);

        // Create Apollo Server instance
        server = new ApolloServer<ResolverContextInterface>({
            typeDefs,
            resolvers,
        });
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        // Clean up database before each test
        await TokenModel.deleteAll(true);
        await ConfigurationModel.deleteAll(true);

        // Create a valid token for authenticated requests
        const tokenResult = await TokenModel.create({ name: 'test-token' });
        authorizationToken = tokenResult.authorizationToken;
    });

    describe('Query: configurations', () => {
        it('should return empty array when no configurations exist', async () => {
            const query = `
                query GetConfigurations($userId: ID!) {
                    configurations(userId: $userId) {
                        key
                        userId
                        value
                    }
                }
            `;

            const response = await server.executeOperation(
                {
                    query,
                    variables: { userId: 'user123' },
                },
                {
                    contextValue: contextMiddleware({
                        headers: { authorization: `Bearer ${authorizationToken}` },
                    } as any),
                }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeUndefined();
                expect(response.body.singleResult.data?.configurations).toEqual([]);
            }
        });

        it('should return all configurations for a user', async () => {
            // Setup: Create test configurations
            await ConfigurationModel.upsert(
                { key: 'theme', userId: 'user123', value: { mode: 'dark' } },
                false
            );
            await ConfigurationModel.upsert(
                { key: 'language', userId: 'user123', value: { language: 'en-US' } },
                false
            );
            await ConfigurationModel.upsert(
                { key: 'notifications', userId: 'user123', value: { email: true, sms: false } },
                false
            );

            const query = `
                query GetConfigurations($userId: ID!) {
                    configurations(userId: $userId) {
                        key
                        userId
                        value
                    }
                }
            `;

            const response = await server.executeOperation(
                {
                    query,
                    variables: { userId: 'user123' },
                },
                {
                    contextValue: contextMiddleware({
                        headers: { authorization: `Bearer ${authorizationToken}` },
                    } as any),
                }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeUndefined();
                const configurations = response.body.singleResult.data?.configurations;
                expect(configurations).toHaveLength(3);
                expect(configurations).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({
                            key: 'theme',
                            userId: 'user123',
                            value: { mode: 'dark' },
                        }),
                        expect.objectContaining({
                            key: 'language',
                            userId: 'user123',
                            value: { language: 'en-US' },
                        }),
                        expect.objectContaining({
                            key: 'notifications',
                            userId: 'user123',
                            value: { email: true, sms: false },
                        }),
                    ])
                );
            }
        });

        it('should return only specified configurations when keys filter is provided', async () => {
            // Setup: Create test configurations
            await ConfigurationModel.upsert(
                { key: 'theme', userId: 'user123', value: { mode: 'dark' } },
                false
            );
            await ConfigurationModel.upsert(
                { key: 'language', userId: 'user123', value: { language: 'en-US' } },
                false
            );
            await ConfigurationModel.upsert(
                { key: 'notifications', userId: 'user123', value: { email: true } },
                false
            );

            const query = `
                query GetConfigurations($userId: ID!, $keys: [String!]) {
                    configurations(userId: $userId, keys: $keys) {
                        key
                        userId
                        value
                    }
                }
            `;

            const response = await server.executeOperation(
                {
                    query,
                    variables: { userId: 'user123', keys: ['theme', 'language'] },
                },
                {
                    contextValue: contextMiddleware({
                        headers: { authorization: `Bearer ${authorizationToken}` },
                    } as any),
                }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeUndefined();
                const configurations = response.body.singleResult.data?.configurations as any[];
                expect(configurations).toHaveLength(2);
                expect(configurations?.map((c: any) => c.key).sort()).toEqual(['language', 'theme']);
            }
        });

        it('should only return configurations for the specified user', async () => {
            // Setup: Create configurations for multiple users
            await ConfigurationModel.upsert(
                { key: 'theme', userId: 'user123', value: { mode: 'dark' } },
                false
            );
            await ConfigurationModel.upsert(
                { key: 'theme', userId: 'user456', value: { mode: 'light' } },
                false
            );

            const query = `
                query GetConfigurations($userId: ID!) {
                    configurations(userId: $userId) {
                        key
                        userId
                        value
                    }
                }
            `;

            const response = await server.executeOperation(
                {
                    query,
                    variables: { userId: 'user123' },
                },
                {
                    contextValue: contextMiddleware({
                        headers: { authorization: `Bearer ${authorizationToken}` },
                    } as any),
                }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeUndefined();
                const configurations = response.body.singleResult.data?.configurations as any[];
                expect(configurations).toHaveLength(1);
                expect(configurations?.[0].userId).toBe('user123');
                expect(configurations?.[0].value).toEqual({ mode: 'dark' });
            }
        });

        it('should return configuration with timestamps', async () => {
            // Setup: Create a configuration
            await ConfigurationModel.upsert(
                { key: 'theme', userId: 'user123', value: { mode: 'dark' } },
                false
            );

            const query = `
                query GetConfigurations($userId: ID!) {
                    configurations(userId: $userId) {
                        key
                        userId
                        value
                        createdOnDateTime
                        lastUpdatedOnDateTime
                    }
                }
            `;

            const response = await server.executeOperation(
                {
                    query,
                    variables: { userId: 'user123' },
                },
                {
                    contextValue: contextMiddleware({
                        headers: { authorization: `Bearer ${authorizationToken}` },
                    } as any),
                }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeUndefined();
                const config = (response.body.singleResult.data?.configurations as any[])?.[0];
                expect(config.createdOnDateTime).toBeDefined();
                expect(config.lastUpdatedOnDateTime).toBeDefined();
            }
        });

        it('should fail without valid authorization token', async () => {
            const query = `
                query GetConfigurations($userId: ID!) {
                    configurations(userId: $userId) {
                        key
                        userId
                        value
                    }
                }
            `;

            const response = await server.executeOperation(
                {
                    query,
                    variables: { userId: 'user123' },
                },
                {
                    contextValue: contextMiddleware({ headers: {} } as any),
                }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeDefined();
                expect(response.body.singleResult.errors?.[0].message).toContain('Unauthorized');
                expect(response.body.singleResult.errors?.[0].extensions?.code).toBe('UNAUTHORIZED');
            }
        });

        it('should fail with invalid authorization token', async () => {
            const query = `
                query GetConfigurations($userId: ID!) {
                    configurations(userId: $userId) {
                        key
                        userId
                        value
                    }
                }
            `;

            const response = await server.executeOperation(
                {
                    query,
                    variables: { userId: 'user123' },
                },
                {
                    contextValue: contextMiddleware({
                        headers: { authorization: 'Bearer invalid-token' },
                    } as any),
                }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeDefined();
                expect(response.body.singleResult.errors?.[0].message).toContain('Unauthorized');
                expect(response.body.singleResult.errors?.[0].extensions?.code).toBe('UNAUTHORIZED');
            }
        });

        it('should fail with authorization token missing Bearer prefix', async () => {
            const query = `
                query GetConfigurations($userId: ID!) {
                    configurations(userId: $userId) {
                        key
                        userId
                        value
                    }
                }
            `;

            const response = await server.executeOperation(
                {
                    query,
                    variables: { userId: 'user123' },
                },
                {
                    contextValue: contextMiddleware({
                        headers: { authorization: authorizationToken },
                    } as any),
                }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeDefined();
                expect(response.body.singleResult.errors?.[0].message).toContain('Unauthorized');
                expect(response.body.singleResult.errors?.[0].extensions?.code).toBe('UNAUTHORIZED');
            }
        });

        it('should fail with malformed authorization token', async () => {
            const query = `
                query GetConfigurations($userId: ID!) {
                    configurations(userId: $userId) {
                        key
                        userId
                        value
                    }
                }
            `;

            const response = await server.executeOperation(
                {
                    query,
                    variables: { userId: 'user123' },
                },
                {
                    contextValue: contextMiddleware({
                        headers: { authorization: 'Bearer not:a:valid:token:format' },
                    } as any),
                }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeDefined();
                expect(response.body.singleResult.errors?.[0].message).toContain('Unauthorized');
                expect(response.body.singleResult.errors?.[0].extensions?.code).toBe('UNAUTHORIZED');
            }
        });

        it('should fail with expired token', async () => {
            // Create and immediately expire a token
            const tokenResult = await TokenModel.create({ name: 'expired-token' });
            await TokenModel.expire({ name: tokenResult.token.name });

            const query = `
                query GetConfigurations($userId: ID!) {
                    configurations(userId: $userId) {
                        key
                        userId
                        value
                    }
                }
            `;

            const response = await server.executeOperation(
                {
                    query,
                    variables: { userId: 'user123' },
                },
                {
                    contextValue: contextMiddleware({
                        headers: { authorization: `Bearer ${tokenResult.authorizationToken}` },
                    } as any),
                }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeDefined();
                expect(response.body.singleResult.errors?.[0].message).toContain('Unauthorized');
                expect(response.body.singleResult.errors?.[0].extensions?.code).toBe('UNAUTHORIZED');
            }
        });

        it('should fail with token containing invalid HMAC', async () => {
            // Create a token and tamper with it
            const parts = authorizationToken.split(':');
            const tamperedToken = `${parts[0]}:${parts[1]}:${parts[2]}:invalidhmac`;

            const query = `
                query GetConfigurations($userId: ID!) {
                    configurations(userId: $userId) {
                        key
                        userId
                        value
                    }
                }
            `;

            const response = await server.executeOperation(
                {
                    query,
                    variables: { userId: 'user123' },
                },
                {
                    contextValue: contextMiddleware({
                        headers: { authorization: `Bearer ${tamperedToken}` },
                    } as any),
                }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeDefined();
                expect(response.body.singleResult.errors?.[0].message).toContain('Unauthorized');
                expect(response.body.singleResult.errors?.[0].extensions?.code).toBe('UNAUTHORIZED');
            }
        });
    });

    describe('Mutation: upsertConfiguration', () => {
        it('should create a new configuration', async () => {
            const mutation = `
                mutation UpsertConfiguration($key: String!, $userId: ID!, $value: JSON!) {
                    upsertConfiguration(key: $key, userId: $userId, value: $value) {
                        key
                        userId
                        value
                        createdOnDateTime
                        lastUpdatedOnDateTime
                    }
                }
            `;

            const response = await server.executeOperation(
                {
                    query: mutation,
                    variables: {
                        key: 'theme',
                        userId: 'user123',
                        value: { mode: 'dark', primaryColor: '#007acc' },
                    },
                },
                {
                    contextValue: contextMiddleware({
                        headers: { authorization: `Bearer ${authorizationToken}` },
                    } as any),
                }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeUndefined();
                const config = response.body.singleResult.data?.upsertConfiguration as any;
                expect(config.key).toBe('theme');
                expect(config.userId).toBe('user123');
                expect(config.value).toEqual({ mode: 'dark', primaryColor: '#007acc' });
                expect(config.createdOnDateTime).toBeDefined();
                expect(config.lastUpdatedOnDateTime).toBeDefined();
            }
        });

        it('should update an existing configuration', async () => {
            // Setup: Create initial configuration
            await ConfigurationModel.upsert(
                { key: 'theme', userId: 'user123', value: { mode: 'light' } },
                false
            );

            const mutation = `
                mutation UpsertConfiguration($key: String!, $userId: ID!, $value: JSON!) {
                    upsertConfiguration(key: $key, userId: $userId, value: $value) {
                        key
                        userId
                        value
                        lastUpdatedOnDateTime
                    }
                }
            `;

            const response = await server.executeOperation(
                {
                    query: mutation,
                    variables: {
                        key: 'theme',
                        userId: 'user123',
                        value: { mode: 'dark' },
                    },
                },
                {
                    contextValue: contextMiddleware({
                        headers: { authorization: `Bearer ${authorizationToken}` },
                    } as any),
                }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeUndefined();
                const config = response.body.singleResult.data?.upsertConfiguration as any;
                expect(config.value).toEqual({ mode: 'dark' });
            }

            // Verify only one configuration exists
            const configs = await ConfigurationModel.findByUserIdAndKeys(
                { userId: 'user123' },
                false
            );
            expect(configs).toHaveLength(1);
        });

        it('should support various JSON value types', async () => {
            const testCases = [
                { key: 'string-value', value: 'simple string' },
                { key: 'number-value', value: 42 },
                { key: 'boolean-value', value: true },
                { key: 'array-value', value: [1, 2, 3, 'test'] },
                { key: 'object-value', value: { nested: { deeply: { value: 'test' } } } },
                {
                    key: 'complex-value',
                    value: {
                        users: ['user1', 'user2'],
                        settings: { enabled: true, count: 10 },
                        metadata: null,
                    },
                },
            ];

            const mutation = `
                mutation UpsertConfiguration($key: String!, $userId: ID!, $value: JSON!) {
                    upsertConfiguration(key: $key, userId: $userId, value: $value) {
                        key
                        value
                    }
                }
            `;

            for (const testCase of testCases) {
                const response = await server.executeOperation(
                    {
                        query: mutation,
                        variables: {
                            key: testCase.key,
                            userId: 'user123',
                            value: testCase.value,
                        },
                    },
                    {
                        contextValue: contextMiddleware({
                            headers: { authorization: `Bearer ${authorizationToken}` },
                        } as any),
                    }
                );

                expect(response.body.kind).toBe('single');
                if (response.body.kind === 'single') {
                    expect(response.body.singleResult.errors).toBeUndefined();
                    const config = response.body.singleResult.data?.upsertConfiguration as any;
                    expect(config.value).toEqual(testCase.value);
                }
            }
        });

        it('should fail without valid authorization token', async () => {
            const mutation = `
                mutation UpsertConfiguration($key: String!, $userId: ID!, $value: JSON!) {
                    upsertConfiguration(key: $key, userId: $userId, value: $value) {
                        key
                        value
                    }
                }
            `;

            const response = await server.executeOperation(
                {
                    query: mutation,
                    variables: {
                        key: 'theme',
                        userId: 'user123',
                        value: { mode: 'dark' },
                    },
                },
                {
                    contextValue: contextMiddleware({ headers: {} } as any),
                }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeDefined();
                expect(response.body.singleResult.errors?.[0].message).toContain('Unauthorized');
                expect(response.body.singleResult.errors?.[0].extensions?.code).toBe('UNAUTHORIZED');
            }
        });

        it('should fail with invalid authorization token', async () => {
            const mutation = `
                mutation UpsertConfiguration($key: String!, $userId: ID!, $value: JSON!) {
                    upsertConfiguration(key: $key, userId: $userId, value: $value) {
                        key
                        value
                    }
                }
            `;

            const response = await server.executeOperation(
                {
                    query: mutation,
                    variables: {
                        key: 'theme',
                        userId: 'user123',
                        value: { mode: 'dark' },
                    },
                },
                {
                    contextValue: contextMiddleware({
                        headers: { authorization: 'Bearer invalid-token' },
                    } as any),
                }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeDefined();
                expect(response.body.singleResult.errors?.[0].message).toContain('Unauthorized');
                expect(response.body.singleResult.errors?.[0].extensions?.code).toBe('UNAUTHORIZED');
            }
        });

        it('should fail with expired token', async () => {
            // Create and immediately expire a token
            const tokenResult = await TokenModel.create({ name: 'mutation-expired-token' });
            await TokenModel.expire({ name: tokenResult.token.name });

            const mutation = `
                mutation UpsertConfiguration($key: String!, $userId: ID!, $value: JSON!) {
                    upsertConfiguration(key: $key, userId: $userId, value: $value) {
                        key
                        value
                    }
                }
            `;

            const response = await server.executeOperation(
                {
                    query: mutation,
                    variables: {
                        key: 'theme',
                        userId: 'user123',
                        value: { mode: 'dark' },
                    },
                },
                {
                    contextValue: contextMiddleware({
                        headers: { authorization: `Bearer ${tokenResult.authorizationToken}` },
                    } as any),
                }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeDefined();
                expect(response.body.singleResult.errors?.[0].message).toContain('Unauthorized');
                expect(response.body.singleResult.errors?.[0].extensions?.code).toBe('UNAUTHORIZED');
            }
        });

        it('should fail with authorization token missing Bearer prefix', async () => {
            const mutation = `
                mutation UpsertConfiguration($key: String!, $userId: ID!, $value: JSON!) {
                    upsertConfiguration(key: $key, userId: $userId, value: $value) {
                        key
                        value
                    }
                }
            `;

            const response = await server.executeOperation(
                {
                    query: mutation,
                    variables: {
                        key: 'theme',
                        userId: 'user123',
                        value: { mode: 'dark' },
                    },
                },
                {
                    contextValue: contextMiddleware({
                        headers: { authorization: authorizationToken },
                    } as any),
                }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeDefined();
                expect(response.body.singleResult.errors?.[0].message).toContain('Unauthorized');
                expect(response.body.singleResult.errors?.[0].extensions?.code).toBe('UNAUTHORIZED');
            }
        });

        it('should fail with invalid key (contains invalid characters)', async () => {
            const mutation = `
                mutation UpsertConfiguration($key: String!, $userId: ID!, $value: JSON!) {
                    upsertConfiguration(key: $key, userId: $userId, value: $value) {
                        key
                        value
                    }
                }
            `;

            const response = await server.executeOperation(
                {
                    query: mutation,
                    variables: {
                        key: 'invalid key!',
                        userId: 'user123',
                        value: { mode: 'dark' },
                    },
                },
                {
                    contextValue: contextMiddleware({
                        headers: { authorization: `Bearer ${authorizationToken}` },
                    } as any),
                }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeDefined();
            }
        });

        it('should fail with invalid userId (contains invalid characters)', async () => {
            const mutation = `
                mutation UpsertConfiguration($key: String!, $userId: ID!, $value: JSON!) {
                    upsertConfiguration(key: $key, userId: $userId, value: $value) {
                        key
                        value
                    }
                }
            `;

            const response = await server.executeOperation(
                {
                    query: mutation,
                    variables: {
                        key: 'theme',
                        userId: 'invalid user!',
                        value: { mode: 'dark' },
                    },
                },
                {
                    contextValue: contextMiddleware({
                        headers: { authorization: `Bearer ${authorizationToken}` },
                    } as any),
                }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeDefined();
            }
        });
    });

    describe('Integration Scenarios', () => {
        it('should handle complete workflow: create, update, query', async () => {
            // Step 1: Create a configuration
            const upsertMutation = `
                mutation UpsertConfiguration($key: String!, $userId: ID!, $value: JSON!) {
                    upsertConfiguration(key: $key, userId: $userId, value: $value) {
                        key
                        userId
                        value
                    }
                }
            `;

            const createResponse = await server.executeOperation(
                {
                    query: upsertMutation,
                    variables: {
                        key: 'preferences',
                        userId: 'user123',
                        value: { theme: 'light', language: 'en' },
                    },
                },
                {
                    contextValue: contextMiddleware({
                        headers: { authorization: `Bearer ${authorizationToken}` },
                    } as any),
                }
            );

            expect(createResponse.body.kind).toBe('single');
            if (createResponse.body.kind === 'single') {
                expect(createResponse.body.singleResult.errors).toBeUndefined();
            }

            // Step 2: Update the configuration
            const updateResponse = await server.executeOperation(
                {
                    query: upsertMutation,
                    variables: {
                        key: 'preferences',
                        userId: 'user123',
                        value: { theme: 'dark', language: 'en', notifications: true },
                    },
                },
                {
                    contextValue: contextMiddleware({
                        headers: { authorization: `Bearer ${authorizationToken}` },
                    } as any),
                }
            );

            expect(updateResponse.body.kind).toBe('single');
            if (updateResponse.body.kind === 'single') {
                expect(updateResponse.body.singleResult.errors).toBeUndefined();
            }

            // Step 3: Query the configuration
            const query = `
                query GetConfigurations($userId: ID!, $keys: [String!]) {
                    configurations(userId: $userId, keys: $keys) {
                        key
                        userId
                        value
                    }
                }
            `;

            const queryResponse = await server.executeOperation(
                {
                    query,
                    variables: { userId: 'user123', keys: ['preferences'] },
                },
                {
                    contextValue: contextMiddleware({
                        headers: { authorization: `Bearer ${authorizationToken}` },
                    } as any),
                }
            );

            expect(queryResponse.body.kind).toBe('single');
            if (queryResponse.body.kind === 'single') {
                expect(queryResponse.body.singleResult.errors).toBeUndefined();
                const configs = queryResponse.body.singleResult.data?.configurations as any[];
                expect(configs).toHaveLength(1);
                expect(configs?.[0].value).toEqual({
                    theme: 'dark',
                    language: 'en',
                    notifications: true,
                });
            }
        });

        it('should handle multiple users with same configuration keys', async () => {
            // Create configurations for multiple users
            const mutation = `
                mutation UpsertConfiguration($key: String!, $userId: ID!, $value: JSON!) {
                    upsertConfiguration(key: $key, userId: $userId, value: $value) {
                        key
                        userId
                        value
                    }
                }
            `;

            await server.executeOperation(
                {
                    query: mutation,
                    variables: { key: 'theme', userId: 'user1', value: 'dark' },
                },
                {
                    contextValue: contextMiddleware({
                        headers: { authorization: `Bearer ${authorizationToken}` },
                    } as any),
                }
            );

            await server.executeOperation(
                {
                    query: mutation,
                    variables: { key: 'theme', userId: 'user2', value: 'light' },
                },
                {
                    contextValue: contextMiddleware({
                        headers: { authorization: `Bearer ${authorizationToken}` },
                    } as any),
                }
            );

            // Query for user1
            const query = `
                query GetConfigurations($userId: ID!) {
                    configurations(userId: $userId) {
                        key
                        userId
                        value
                    }
                }
            `;

            const user1Response = await server.executeOperation(
                {
                    query,
                    variables: { userId: 'user1' },
                },
                {
                    contextValue: contextMiddleware({
                        headers: { authorization: `Bearer ${authorizationToken}` },
                    } as any),
                }
            );

            expect(user1Response.body.kind).toBe('single');
            if (user1Response.body.kind === 'single') {
                expect(user1Response.body.singleResult.errors).toBeUndefined();
                const configs = user1Response.body.singleResult.data?.configurations as any[];
                expect(configs).toHaveLength(1);
                expect(configs?.[0].value).toBe('dark');
            }

            // Query for user2
            const user2Response = await server.executeOperation(
                {
                    query,
                    variables: { userId: 'user2' },
                },
                {
                    contextValue: contextMiddleware({
                        headers: { authorization: `Bearer ${authorizationToken}` },
                    } as any),
                }
            );

            expect(user2Response.body.kind).toBe('single');
            if (user2Response.body.kind === 'single') {
                expect(user2Response.body.singleResult.errors).toBeUndefined();
                const configs = user2Response.body.singleResult.data?.configurations as any[];
                expect(configs).toHaveLength(1);
                expect(configs?.[0].value).toBe('light');
            }
        });

        it('should work with different authorization tokens', async () => {
            // Create a second token
            const token2Result = await TokenModel.create({ name: 'second-token' });
            const token2 = token2Result.authorizationToken;

            const mutation = `
                mutation UpsertConfiguration($key: String!, $userId: ID!, $value: JSON!) {
                    upsertConfiguration(key: $key, userId: $userId, value: $value) {
                        key
                        value
                    }
                }
            `;

            // Use first token
            const response1 = await server.executeOperation(
                {
                    query: mutation,
                    variables: { key: 'test1', userId: 'user1', value: 'value1' },
                },
                {
                    contextValue: contextMiddleware({
                        headers: { authorization: `Bearer ${authorizationToken}` },
                    } as any),
                }
            );

            expect(response1.body.kind).toBe('single');
            if (response1.body.kind === 'single') {
                expect(response1.body.singleResult.errors).toBeUndefined();
            }

            // Use second token
            const response2 = await server.executeOperation(
                {
                    query: mutation,
                    variables: { key: 'test2', userId: 'user1', value: 'value2' },
                },
                {
                    contextValue: contextMiddleware({
                        headers: { authorization: `Bearer ${token2}` },
                    } as any),
                }
            );

            expect(response2.body.kind).toBe('single');
            if (response2.body.kind === 'single') {
                expect(response2.body.singleResult.errors).toBeUndefined();
            }

            // Verify both operations succeeded
            const configs = await ConfigurationModel.findByUserIdAndKeys(
                { userId: 'user1' },
                false
            );
            expect(configs).toHaveLength(2);
        });
    });
});

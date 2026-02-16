import { ApolloServer } from '@apollo/server';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import typeDefs from '../src/graphql/schema';
import resolvers from '../src/graphql/resolvers';
import { ConfigurationSchema } from '../src/document/ConfigurationModel';
import { TokenSchema } from '../src/document/TokenModel';
import { ResolverContextInterface } from '../src/types';
import authMiddleware from '../src/middleware/auth';

describe('GraphQL API Functional Tests', () => {
    let mongoMemoryServer: MongoMemoryServer;
    let apolloServer: ApolloServer<ResolverContextInterface>;
    let validToken: string;
    let expiredToken: string;
    let inactiveToken: string;

    // Helper to create mock request with auth header
    const createMockRequest = (token?: string) => ({
        headers: {
            authorization: token ? `Bearer ${token}` : undefined,
        },
    });

    // Helper to get context from auth middleware
    const getAuthContext = async (token?: string) => {
        const request = createMockRequest(token);
        return await authMiddleware(request as any);
    };

    beforeAll(async () => {
        // Start in-memory MongoDB
        mongoMemoryServer = await MongoMemoryServer.create();
        const mongoUri = mongoMemoryServer.getUri();
        await mongoose.connect(mongoUri);

        // Create Apollo Server
        apolloServer = new ApolloServer<ResolverContextInterface>({
            typeDefs,
            resolvers,
        });

        // Create test tokens
        const validTokenDoc = await TokenSchema.create({
            token: 'valid_test_token_12345',
            name: 'Valid Test Token',
            active: true,
        });
        validToken = validTokenDoc.token;

        // Create expired token
        const expiredDate = new Date();
        expiredDate.setDate(expiredDate.getDate() - 1);
        const expiredTokenDoc = await TokenSchema.create({
            token: 'expired_test_token_12345',
            name: 'Expired Test Token',
            active: true,
            expiresAt: expiredDate,
        });
        expiredToken = expiredTokenDoc.token;

        // Create inactive token
        const inactiveTokenDoc = await TokenSchema.create({
            token: 'inactive_test_token_12345',
            name: 'Inactive Test Token',
            active: false,
        });
        inactiveToken = inactiveTokenDoc.token;

        // Seed test data
        await ConfigurationSchema.create([
            { key: 'theme', userId: 'user1', value: 'dark' },
            { key: 'language', userId: 'user1', value: 'en' },
            { key: 'theme', value: 'light' }, // default fallback
            { key: 'timezone', value: 'UTC' }, // default fallback
        ]);
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoMemoryServer.stop();
    });

    afterEach(async () => {
        // Clean up configurations created during tests (keep seed data)
        await ConfigurationSchema.deleteMany({
            key: { $nin: ['theme', 'language', 'timezone'] }
        });
    });

    describe('Authentication', () => {
        it('should deny access when no token is provided', async () => {
            const query = `
                query {
                    configurations(userId: "user1") {
                        key
                        value
                    }
                }
            `;

            const context = await getAuthContext();
            const response = await apolloServer.executeOperation(
                { query },
                { contextValue: context }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeDefined();
                expect(response.body.singleResult.errors?.[0].message).toContain('Authentication required');
            }
        });

        it('should deny access with wrong/invalid token', async () => {
            const query = `
                query {
                    configurations(userId: "user1") {
                        key
                        value
                    }
                }
            `;

            const context = await getAuthContext('invalid_wrong_token_xyz');
            const response = await apolloServer.executeOperation(
                { query },
                { contextValue: context }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeDefined();
                expect(response.body.singleResult.errors?.[0].message).toContain('Authentication required');
            }
        });

        it('should deny access with expired token', async () => {
            const query = `
                query {
                    configurations(userId: "user1") {
                        key
                        value
                    }
                }
            `;

            const context = await getAuthContext(expiredToken);
            const response = await apolloServer.executeOperation(
                { query },
                { contextValue: context }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeDefined();
                expect(response.body.singleResult.errors?.[0].message).toContain('Authentication required');
            }
        });

        it('should deny access with inactive token', async () => {
            const query = `
                query {
                    configurations(userId: "user1") {
                        key
                        value
                    }
                }
            `;

            const context = await getAuthContext(inactiveToken);
            const response = await apolloServer.executeOperation(
                { query },
                { contextValue: context }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeDefined();
                expect(response.body.singleResult.errors?.[0].message).toContain('Authentication required');
            }
        });

        it('should allow access with valid token', async () => {
            const query = `
                query {
                    configurations(userId: "user1") {
                        key
                        value
                    }
                }
            `;

            const context = await getAuthContext(validToken);
            const response = await apolloServer.executeOperation(
                { query },
                { contextValue: context }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeUndefined();
                expect(response.body.singleResult.data).toBeDefined();
            }
        });
    });

    describe('Read Operations', () => {
        it('should read existing configurations', async () => {
            const query = `
                query {
                    configurations(userId: "user1", keys: ["theme", "language"]) {
                        key
                        userId
                        value
                    }
                }
            `;

            const context = await getAuthContext(validToken);
            const response = await apolloServer.executeOperation(
                { query },
                { contextValue: context }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeUndefined();
                const configs = response.body.singleResult.data?.configurations;
                expect(configs).toHaveLength(2);
                expect(configs).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({ key: 'theme', userId: 'user1', value: 'dark' }),
                        expect.objectContaining({ key: 'language', userId: 'user1', value: 'en' }),
                    ])
                );
            }
        });

        it('should return fallback config when user-specific config does not exist', async () => {
            const query = `
                query {
                    configurations(userId: "user1", keys: ["theme", "timezone"]) {
                        key
                        userId
                        value
                    }
                }
            `;

            const context = await getAuthContext(validToken);
            const response = await apolloServer.executeOperation(
                { query },
                { contextValue: context }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeUndefined();
                const configs = response.body.singleResult.data?.configurations as any[];
                expect(configs).toHaveLength(2);

                const themeConfig = configs.find((c: any) => c.key === 'theme');
                expect(themeConfig).toEqual(
                    expect.objectContaining({ key: 'theme', userId: 'user1', value: 'dark' })
                );

                const timezoneConfig = configs.find((c: any) => c.key === 'timezone');
                expect(timezoneConfig).toEqual(
                    expect.objectContaining({ key: 'timezone', userId: null, value: 'UTC' })
                );
            }
        });

        it('should return only fallback configs when no user-specific configs exist', async () => {
            const query = `
                query {
                    configurations(userId: "newuser", keys: ["theme", "timezone"]) {
                        key
                        userId
                        value
                    }
                }
            `;

            const context = await getAuthContext(validToken);
            const response = await apolloServer.executeOperation(
                { query },
                { contextValue: context }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeUndefined();
                const configs = response.body.singleResult.data?.configurations as any[];
                expect(configs).toHaveLength(2);
                expect(configs.every((c: any) => c.userId === null)).toBe(true);
            }
        });
    });

    describe('Write Operations', () => {
        it('should write valid configuration data', async () => {
            const mutation = `
                mutation {
                    upsertConfiguration(
                        key: "newconfig"
                        userId: "testuser"
                        value: "testvalue"
                    ) {
                        key
                        userId
                        value
                        upserted
                    }
                }
            `;

            const context = await getAuthContext(validToken);
            const response = await apolloServer.executeOperation(
                { query: mutation },
                { contextValue: context }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeUndefined();
                const result = response.body.singleResult.data?.upsertConfiguration;
                expect(result).toEqual(
                    expect.objectContaining({
                        key: 'newconfig',
                        userId: 'testuser',
                        value: 'testvalue',
                        upserted: true,
                    })
                );
            }

            // Verify data was actually written to DB
            const dbConfig = await ConfigurationSchema.findOne({
                key: 'newconfig',
                userId: 'testuser',
            });
            expect(dbConfig).toBeDefined();
            expect(dbConfig?.value).toBe('testvalue');
        });

        it('should update existing configuration', async () => {
            const mutation = `
                mutation {
                    upsertConfiguration(
                        key: "theme"
                        userId: "user1"
                        value: "light"
                    ) {
                        key
                        userId
                        value
                        upserted
                    }
                }
            `;

            const context = await getAuthContext(validToken);
            const response = await apolloServer.executeOperation(
                { query: mutation },
                { contextValue: context }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeUndefined();
                const result = response.body.singleResult.data?.upsertConfiguration as any;
                expect(result?.upserted).toBe(false); // It's an update, not insert
                expect(result?.value).toBe('light');
            }

            // Verify data was updated in DB
            const dbConfig = await ConfigurationSchema.findOne({
                key: 'theme',
                userId: 'user1',
            });
            expect(dbConfig?.value).toBe('light');
        });

        it('should write complex JSON values', async () => {
            const mutation = `
                mutation($value: JSON!) {
                    upsertConfiguration(
                        key: "complex.config"
                        userId: "testuser"
                        value: $value
                    ) {
                        key
                        value
                    }
                }
            `;

            const complexValue = {
                theme: 'dark',
                settings: {
                    notifications: true,
                    language: 'en',
                },
                items: [1, 2, 3],
            };

            const context = await getAuthContext(validToken);
            const response = await apolloServer.executeOperation(
                {
                    query: mutation,
                    variables: { value: complexValue },
                },
                { contextValue: context }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeUndefined();
                const result = response.body.singleResult.data?.upsertConfiguration as any;
                expect(result?.value).toEqual(complexValue);
            }
        });
    });

    describe('Validation', () => {
        it('should reject invalid key (empty string)', async () => {
            const mutation = `
                mutation {
                    upsertConfiguration(
                        key: ""
                        userId: "testuser"
                        value: "test"
                    ) {
                        key
                    }
                }
            `;

            const context = await getAuthContext(validToken);
            const response = await apolloServer.executeOperation(
                { query: mutation },
                { contextValue: context }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeDefined();
                expect(response.body.singleResult.errors?.[0].message).toContain('Validation failed');
                expect(response.body.singleResult.errors?.[0].message).toContain('at least 1 character');
            }

            // Verify data was NOT written
            const dbConfig = await ConfigurationSchema.findOne({ key: '' });
            expect(dbConfig).toBeNull();
        });

        it('should reject invalid key (too long)', async () => {
            const longKey = 'a'.repeat(201);
            const mutation = `
                mutation($key: String!) {
                    upsertConfiguration(
                        key: $key
                        userId: "testuser"
                        value: "test"
                    ) {
                        key
                    }
                }
            `;

            const context = await getAuthContext(validToken);
            const response = await apolloServer.executeOperation(
                {
                    query: mutation,
                    variables: { key: longKey },
                },
                { contextValue: context }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeDefined();
                expect(response.body.singleResult.errors?.[0].message).toContain('Validation failed');
                expect(response.body.singleResult.errors?.[0].message).toContain('200 characters');
            }
        });

        it('should reject invalid key (special characters)', async () => {
            const mutation = `
                mutation {
                    upsertConfiguration(
                        key: "invalid key with spaces"
                        userId: "testuser"
                        value: "test"
                    ) {
                        key
                    }
                }
            `;

            const context = await getAuthContext(validToken);
            const response = await apolloServer.executeOperation(
                { query: mutation },
                { contextValue: context }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeDefined();
                expect(response.body.singleResult.errors?.[0].message).toContain('Validation failed');
            }

            // Verify data was NOT written
            const dbConfig = await ConfigurationSchema.findOne({ key: 'invalid key with spaces' });
            expect(dbConfig).toBeNull();
        });

        it('should reject invalid userId (special characters)', async () => {
            const mutation = `
                mutation {
                    upsertConfiguration(
                        key: "testkey"
                        userId: "user with spaces"
                        value: "test"
                    ) {
                        key
                    }
                }
            `;

            const context = await getAuthContext(validToken);
            const response = await apolloServer.executeOperation(
                { query: mutation },
                { contextValue: context }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeDefined();
                expect(response.body.singleResult.errors?.[0].message).toContain('Validation failed');
            }
        });

        it('should reject value that is too large', async () => {
            const largeValue = 'a'.repeat(10001);
            const mutation = `
                mutation($value: JSON!) {
                    upsertConfiguration(
                        key: "testkey"
                        userId: "testuser"
                        value: $value
                    ) {
                        key
                    }
                }
            `;

            const context = await getAuthContext(validToken);
            const response = await apolloServer.executeOperation(
                {
                    query: mutation,
                    variables: { value: largeValue },
                },
                { contextValue: context }
            );

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeDefined();
                expect(response.body.singleResult.errors?.[0].message).toContain('Validation failed');
                expect(response.body.singleResult.errors?.[0].message).toContain('10000 characters');
            }

            // Verify data was NOT written
            const dbConfig = await ConfigurationSchema.findOne({ key: 'testkey' });
            expect(dbConfig).toBeNull();
        });

        it('should accept valid special characters in key', async () => {
            const validKeys = [
                'app.config',
                'path/to/config',
                'scope@domain',
                'version:1.0.0',
                'price$100',
                'array[0]',
                'obj{key}',
                'func(param)',
                'key_with-dash',
                'path\\to\\file',
                'key|value',
                'scope&context',
                'id#123',
            ];

            for (const key of validKeys) {
                const mutation = `
                    mutation($key: String!) {
                        upsertConfiguration(
                            key: $key
                            userId: "testuser"
                            value: "test"
                        ) {
                            key
                        }
                    }
                `;

                const context = await getAuthContext(validToken);
                const response = await apolloServer.executeOperation(
                    {
                        query: mutation,
                        variables: { key },
                    },
                    { contextValue: context }
                );

                expect(response.body.kind).toBe('single');
                if (response.body.kind === 'single') {
                    expect(response.body.singleResult.errors).toBeUndefined();
                }
            }
        });
    });
});

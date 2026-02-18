import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import ConfigurationModel from '../../src/model/ConfigurationModel';
import TokenModel from '../../src/model/TokenModel';
import { ConfigurationModel as DatabaseConfigurationModel } from '../../src/database/ConfigurationModel';
import { TokenModel as DatabaseTokenModel } from '../../src/database/TokenModel';
import UnauthorizedError from '../../src/model/errors/UnauthorizedError';
import Users from '../../src/model/constants/Users';
import { ValidationError } from 'apollo-server-core';

describe('ConfigurationModel', () => {
    let mongoServer: MongoMemoryServer;
    let validAuthToken: string;
    let validTokenName: string;
    const originalAppSecret = process.env.APP_SECRET;

    beforeAll(async () => {
        process.env.APP_SECRET = 'test-secret-key-for-hmac-generation';
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
        process.env.APP_SECRET = originalAppSecret;
    });

    beforeEach(async () => {
        await DatabaseConfigurationModel.deleteMany({});
        await DatabaseTokenModel.deleteMany({});

        // Create a valid token for tests
        const tokenResult = await TokenModel.create({ name: 'test-token' });
        validAuthToken = tokenResult.authorizationToken;
        validTokenName = tokenResult.token.name;
    });

    describe('upsert', () => {
        describe('with authorization', () => {
            it('should create a new configuration with valid input', async () => {
                const input = {
                    key: 'test-key',
                    userId: 'user123',
                    value: { setting1: 'value1' }
                };

                const result = await ConfigurationModel.upsert(input, true, validAuthToken);

                expect(result).toBeDefined();
                expect(result?.key).toBe('test-key');
                expect(result?.userId).toBe('user123');
                expect(result?.value).toEqual({ setting1: 'value1' });
                expect(result?.createdOnDateTime).toBeInstanceOf(Date);
                expect(result?.lastUpdatedOnDateTime).toBeInstanceOf(Date);
                expect(result?.createdBy).toBe('test-token');
                expect(result?.lastUpdatedBy).toBe('test-token');
            });

            it('should update existing configuration', async () => {
                const input = {
                    key: 'test-key',
                    userId: 'user123',
                    value: { setting1: 'value1' }
                };

                const created = await ConfigurationModel.upsert(input, true, validAuthToken);

                // Wait a bit to ensure different timestamps
                await new Promise(resolve => setTimeout(resolve, 10));

                const updated = await ConfigurationModel.upsert(
                    { ...input, value: { setting1: 'updated-value' } },
                    true,
                    validAuthToken
                );

                expect(updated?._id.toString()).toBe(created?._id.toString());
                expect(updated?.value).toEqual({ setting1: 'updated-value' });
                expect(updated?.lastUpdatedOnDateTime.getTime()).toBeGreaterThan(
                    created!.createdOnDateTime.getTime()
                );
                expect(updated?.createdBy).toBe('test-token');
                expect(updated?.lastUpdatedBy).toBe('test-token');
            });

            it('should throw UnauthorizedError with invalid token', async () => {
                const input = {
                    key: 'test-key',
                    userId: 'user123',
                    value: { setting1: 'value1' }
                };

                await expect(
                    ConfigurationModel.upsert(input, true, 'invalid-token')
                ).rejects.toThrow(UnauthorizedError);
            });

            it('should throw UnauthorizedError with null token', async () => {
                const input = {
                    key: 'test-key',
                    userId: 'user123',
                    value: { setting1: 'value1' }
                };

                await expect(
                    ConfigurationModel.upsert(input, true, null)
                ).rejects.toThrow(UnauthorizedError);
            });

            it('should throw UnauthorizedError with expired token', async () => {
                const input = {
                    key: 'test-key',
                    userId: 'user123',
                    value: { setting1: 'value1' }
                };

                await TokenModel.expire({ name: validTokenName });

                await expect(
                    ConfigurationModel.upsert(input, true, validAuthToken)
                ).rejects.toThrow(UnauthorizedError);
            });

            it('should set createdBy from token name', async () => {
                const customToken = await TokenModel.create({ name: 'custom-user' });

                const input = {
                    key: 'test-key',
                    userId: 'user123',
                    value: { setting1: 'value1' }
                };

                const result = await ConfigurationModel.upsert(input, true, customToken.authorizationToken);

                expect(result?.createdBy).toBe('custom-user');
                expect(result?.lastUpdatedBy).toBe('custom-user');
            });

            it('should track different updaters', async () => {
                const token1 = await TokenModel.create({ name: 'user1' });
                const token2 = await TokenModel.create({ name: 'user2' });

                const input = {
                    key: 'test-key',
                    userId: 'user123',
                    value: { setting1: 'value1' }
                };

                const created = await ConfigurationModel.upsert(input, true, token1.authorizationToken);
                expect(created?.createdBy).toBe('user1');
                expect(created?.lastUpdatedBy).toBe('user1');

                const updated = await ConfigurationModel.upsert(
                    { ...input, value: { setting1: 'value2' } },
                    true,
                    token2.authorizationToken
                );

                expect(updated?.createdBy).toBe('user1');
                expect(updated?.lastUpdatedBy).toBe('user2');
            });
        });

        describe('without authorization', () => {
            it('should create configuration without token when checkAuthorization is false', async () => {
                const input = {
                    key: 'test-key',
                    userId: 'user123',
                    value: { setting1: 'value1' }
                };

                const result = await ConfigurationModel.upsert(input, false, null);

                expect(result).toBeDefined();
                expect(result?.key).toBe('test-key');
                expect(result?.userId).toBe('user123');
                expect(result?.createdBy).toBe(Users.ANONYMOUS);
                expect(result?.lastUpdatedBy).toBe(Users.ANONYMOUS);
            });

            it('should use ANONYMOUS user when no token provided', async () => {
                const input = {
                    key: 'test-key',
                    userId: 'user123',
                    value: { setting1: 'value1' }
                };

                const result = await ConfigurationModel.upsert(input, false, null);

                expect(result?.createdBy).toBe(Users.ANONYMOUS);
                expect(result?.lastUpdatedBy).toBe(Users.ANONYMOUS);
            });

            it('should still use token name if provided even when checkAuthorization is false', async () => {
                const input = {
                    key: 'test-key',
                    userId: 'user123',
                    value: { setting1: 'value1' }
                };

                const result = await ConfigurationModel.upsert(input, false, validAuthToken);

                expect(result?.createdBy).toBe('test-token');
                expect(result?.lastUpdatedBy).toBe('test-token');
            });
        });

        describe('validation', () => {
            it('should throw ValidationError for empty key', async () => {
                const input = {
                    key: '',
                    userId: 'user123',
                    value: { setting1: 'value1' }
                };

                await expect(
                    ConfigurationModel.upsert(input, false, null)
                ).rejects.toThrow(ValidationError);
            });

            it('should throw ValidationError for key exceeding 200 characters', async () => {
                const input = {
                    key: 'a'.repeat(201),
                    userId: 'user123',
                    value: { setting1: 'value1' }
                };

                await expect(
                    ConfigurationModel.upsert(input, false, null)
                ).rejects.toThrow(ValidationError);
            });

            it('should throw ValidationError for key with invalid characters', async () => {
                const input = {
                    key: 'invalid key!',
                    userId: 'user123',
                    value: { setting1: 'value1' }
                };

                await expect(
                    ConfigurationModel.upsert(input, false, null)
                ).rejects.toThrow(ValidationError);
            });

            it('should accept key with valid special characters', async () => {
                const input = {
                    key: 'test@key_123-#$./\\|&:[]{}()',
                    userId: 'user123',
                    value: { setting1: 'value1' }
                };

                const result = await ConfigurationModel.upsert(input, false, null);
                expect(result?.key).toBe('test@key_123-#$./\\|&:[]{}()');
            });

            it('should throw ValidationError for empty userId', async () => {
                const input = {
                    key: 'test-key',
                    userId: '',
                    value: { setting1: 'value1' }
                };

                await expect(
                    ConfigurationModel.upsert(input, false, null)
                ).rejects.toThrow(ValidationError);
            });

            it('should throw ValidationError for userId exceeding 200 characters', async () => {
                const input = {
                    key: 'test-key',
                    userId: 'a'.repeat(201),
                    value: { setting1: 'value1' }
                };

                await expect(
                    ConfigurationModel.upsert(input, false, null)
                ).rejects.toThrow(ValidationError);
            });

            it('should throw ValidationError for userId with invalid characters', async () => {
                const input = {
                    key: 'test-key',
                    userId: 'invalid user!',
                    value: { setting1: 'value1' }
                };

                await expect(
                    ConfigurationModel.upsert(input, false, null)
                ).rejects.toThrow(ValidationError);
            });

            it('should accept userId with valid special characters', async () => {
                const input = {
                    key: 'test-key',
                    userId: 'user@test_123-#$./\\|&:[]{}()',
                    value: { setting1: 'value1' }
                };

                const result = await ConfigurationModel.upsert(input, false, null);
                expect(result?.userId).toBe('user@test_123-#$./\\|&:[]{}()');
            });

            it('should throw ValidationError for value exceeding 50000 characters when serialized', async () => {
                const largeValue = { data: 'a'.repeat(50001) };

                const input = {
                    key: 'test-key',
                    userId: 'user123',
                    value: largeValue
                };

                await expect(
                    ConfigurationModel.upsert(input, false, null)
                ).rejects.toThrow(ValidationError);
            });

            it('should accept value at exactly 50000 characters when serialized', async () => {
                // Create an object that serializes to exactly 50000 characters
                // JSON.stringify adds quotes and braces, so we need to account for that
                const dataLength = 50000 - '{"data":""}'.length;
                const input = {
                    key: 'test-key',
                    userId: 'user123',
                    value: { data: 'a'.repeat(dataLength) }
                };

                const result = await ConfigurationModel.upsert(input, false, null);
                expect(result).toBeDefined();
            });
        });

        describe('value types', () => {
            it('should handle object values', async () => {
                const input = {
                    key: 'test-key',
                    userId: 'user123',
                    value: { nested: { deep: { value: 'test' } } }
                };

                const result = await ConfigurationModel.upsert(input, false, null);
                expect(result?.value).toEqual({ nested: { deep: { value: 'test' } } });
            });

            it('should handle array values', async () => {
                const input = {
                    key: 'test-key',
                    userId: 'user123',
                    value: [1, 2, 3, 'test', { key: 'value' }] as any
                };

                const result = await ConfigurationModel.upsert(input, false, null);
                expect(result?.value).toEqual([1, 2, 3, 'test', { key: 'value' }]);
            });

            it('should handle empty object values', async () => {
                const input = {
                    key: 'test-key',
                    userId: 'user123',
                    value: {}
                };

                const result = await ConfigurationModel.upsert(input, false, null);
                expect(result?.value).toEqual({});
            });

            it('should handle complex nested structures', async () => {
                const input = {
                    key: 'test-key',
                    userId: 'user123',
                    value: {
                        users: ['user1', 'user2'],
                        settings: {
                            theme: 'dark',
                            notifications: { email: true, sms: false }
                        },
                        metadata: { createdAt: '2024-01-01', version: 1 }
                    }
                };

                const result = await ConfigurationModel.upsert(input, false, null);
                expect(result?.value).toEqual(input.value);
            });

            it('should handle number values in objects', async () => {
                const input = {
                    key: 'test-key',
                    userId: 'user123',
                    value: { count: 42, price: 19.99, negative: -5 }
                };

                const result = await ConfigurationModel.upsert(input, false, null);
                expect(result?.value).toEqual({ count: 42, price: 19.99, negative: -5 });
            });

            it('should handle boolean values in objects', async () => {
                const input = {
                    key: 'test-key',
                    userId: 'user123',
                    value: { enabled: true, disabled: false }
                };

                const result = await ConfigurationModel.upsert(input, false, null);
                expect(result?.value).toEqual({ enabled: true, disabled: false });
            });

            it('should handle null values in objects', async () => {
                const input = {
                    key: 'test-key',
                    userId: 'user123',
                    value: { nullable: null, notNull: 'value' }
                };

                const result = await ConfigurationModel.upsert(input, false, null);
                expect(result?.value).toEqual({ nullable: null, notNull: 'value' });
            });
        });

        describe('unique constraints', () => {
            it('should allow same key for different users', async () => {
                const input1 = {
                    key: 'shared-key',
                    userId: 'user1',
                    value: { data: 'user1-data' }
                };

                const input2 = {
                    key: 'shared-key',
                    userId: 'user2',
                    value: { data: 'user2-data' }
                };

                const result1 = await ConfigurationModel.upsert(input1, false, null);
                const result2 = await ConfigurationModel.upsert(input2, false, null);

                expect(result1?._id.toString()).not.toBe(result2?._id.toString());
                expect(result1?.value).toEqual({ data: 'user1-data' });
                expect(result2?.value).toEqual({ data: 'user2-data' });
            });

            it('should update same key for same user', async () => {
                const input = {
                    key: 'shared-key',
                    userId: 'user1',
                    value: { data: 'original' }
                };

                const result1 = await ConfigurationModel.upsert(input, false, null);
                const result2 = await ConfigurationModel.upsert(
                    { ...input, value: { data: 'updated' } },
                    false,
                    null
                );

                expect(result1?._id.toString()).toBe(result2?._id.toString());
                expect(result2?.value).toEqual({ data: 'updated' });
            });

            it('should allow different keys for same user', async () => {
                const input1 = {
                    key: 'key1',
                    userId: 'user1',
                    value: { data: 'data1' }
                };

                const input2 = {
                    key: 'key2',
                    userId: 'user1',
                    value: { data: 'data2' }
                };

                const result1 = await ConfigurationModel.upsert(input1, false, null);
                const result2 = await ConfigurationModel.upsert(input2, false, null);

                expect(result1?._id.toString()).not.toBe(result2?._id.toString());
            });
        });

        describe('timestamp management', () => {
            it('should set createdOnDateTime on first insert', async () => {
                const before = new Date();
                const input = {
                    key: 'test-key',
                    userId: 'user123',
                    value: { setting1: 'value1' }
                };

                const result = await ConfigurationModel.upsert(input, false, null);
                const after = new Date();

                expect(result?.createdOnDateTime).toBeInstanceOf(Date);
                expect(result!.createdOnDateTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
                expect(result!.createdOnDateTime.getTime()).toBeLessThanOrEqual(after.getTime());
            });

            it('should not change createdOnDateTime on update', async () => {
                const input = {
                    key: 'test-key',
                    userId: 'user123',
                    value: { setting1: 'value1' }
                };

                const created = await ConfigurationModel.upsert(input, false, null);
                await new Promise(resolve => setTimeout(resolve, 10));

                const updated = await ConfigurationModel.upsert(
                    { ...input, value: { setting1: 'updated' } },
                    false,
                    null
                );

                expect(updated?.createdOnDateTime.getTime()).toBe(created!.createdOnDateTime.getTime());
            });

            it('should update lastUpdatedOnDateTime on every upsert', async () => {
                const input = {
                    key: 'test-key',
                    userId: 'user123',
                    value: { setting1: 'value1' }
                };

                const created = await ConfigurationModel.upsert(input, false, null);
                await new Promise(resolve => setTimeout(resolve, 10));

                const updated = await ConfigurationModel.upsert(
                    { ...input, value: { setting1: 'updated' } },
                    false,
                    null
                );

                expect(updated?.lastUpdatedOnDateTime.getTime()).toBeGreaterThan(
                    created!.lastUpdatedOnDateTime.getTime()
                );
            });

            it('should not change createdBy on update', async () => {
                const token1 = await TokenModel.create({ name: 'creator' });
                const token2 = await TokenModel.create({ name: 'updater' });

                const input = {
                    key: 'test-key',
                    userId: 'user123',
                    value: { setting1: 'value1' }
                };

                const created = await ConfigurationModel.upsert(input, false, token1.authorizationToken);
                const updated = await ConfigurationModel.upsert(
                    { ...input, value: { setting1: 'updated' } },
                    false,
                    token2.authorizationToken
                );

                expect(updated?.createdBy).toBe('creator');
                expect(updated?.lastUpdatedBy).toBe('updater');
            });
        });
    });

    describe('findByUserIdAndKeys', () => {
        beforeEach(async () => {
            // Create test data
            await ConfigurationModel.upsert(
                { key: 'key1', userId: 'user1', value: { data: 'data1' } },
                false,
                null
            );
            await ConfigurationModel.upsert(
                { key: 'key2', userId: 'user1', value: { data: 'data2' } },
                false,
                null
            );
            await ConfigurationModel.upsert(
                { key: 'key3', userId: 'user1', value: { data: 'data3' } },
                false,
                null
            );
            await ConfigurationModel.upsert(
                { key: 'key1', userId: 'user2', value: { data: 'user2-data1' } },
                false,
                null
            );
        });

        describe('with authorization', () => {
            it('should find all configurations for a user without key filter', async () => {
                const results = await ConfigurationModel.findByUserIdAndKeys(
                    { userId: 'user1' },
                    true,
                    validAuthToken
                );

                expect(results).toHaveLength(3);
                expect(results.map(r => r.key).sort()).toEqual(['key1', 'key2', 'key3']);
            });

            it('should find configurations for specific keys', async () => {
                const results = await ConfigurationModel.findByUserIdAndKeys(
                    { userId: 'user1', keys: ['key1', 'key2'] },
                    true,
                    validAuthToken
                );

                expect(results).toHaveLength(2);
                expect(results.map(r => r.key).sort()).toEqual(['key1', 'key2']);
            });

            it('should find single configuration by key', async () => {
                const results = await ConfigurationModel.findByUserIdAndKeys(
                    { userId: 'user1', keys: ['key1'] },
                    true,
                    validAuthToken
                );

                expect(results).toHaveLength(1);
                expect(results[0].key).toBe('key1');
                expect(results[0].value).toEqual({ data: 'data1' });
            });

            it('should return empty array when no keys match', async () => {
                const results = await ConfigurationModel.findByUserIdAndKeys(
                    { userId: 'user1', keys: ['nonexistent'] },
                    true,
                    validAuthToken
                );

                expect(results).toHaveLength(0);
            });

            it('should return empty array when userId has no configurations', async () => {
                const results = await ConfigurationModel.findByUserIdAndKeys(
                    { userId: 'nonexistent-user' },
                    true,
                    validAuthToken
                );

                expect(results).toHaveLength(0);
            });

            it('should isolate configurations by userId', async () => {
                const user1Results = await ConfigurationModel.findByUserIdAndKeys(
                    { userId: 'user1', keys: ['key1'] },
                    true,
                    validAuthToken
                );

                const user2Results = await ConfigurationModel.findByUserIdAndKeys(
                    { userId: 'user2', keys: ['key1'] },
                    true,
                    validAuthToken
                );

                expect(user1Results).toHaveLength(1);
                expect(user2Results).toHaveLength(1);
                expect(user1Results[0].value).toEqual({ data: 'data1' });
                expect(user2Results[0].value).toEqual({ data: 'user2-data1' });
            });

            it('should throw UnauthorizedError with invalid token', async () => {
                await expect(
                    ConfigurationModel.findByUserIdAndKeys(
                        { userId: 'user1' },
                        true,
                        'invalid-token'
                    )
                ).rejects.toThrow(UnauthorizedError);
            });

            it('should throw UnauthorizedError with null token', async () => {
                await expect(
                    ConfigurationModel.findByUserIdAndKeys(
                        { userId: 'user1' },
                        true,
                        null
                    )
                ).rejects.toThrow(UnauthorizedError);
            });

            it('should throw UnauthorizedError with expired token', async () => {
                await TokenModel.expire({ name: validTokenName });

                await expect(
                    ConfigurationModel.findByUserIdAndKeys(
                        { userId: 'user1' },
                        true,
                        validAuthToken
                    )
                ).rejects.toThrow(UnauthorizedError);
            });
        });

        describe('without authorization', () => {
            it('should find configurations without token when checkAuthorization is false', async () => {
                const results = await ConfigurationModel.findByUserIdAndKeys(
                    { userId: 'user1' },
                    false,
                    null
                );

                expect(results).toHaveLength(3);
            });

            it('should find configurations with specific keys without authorization', async () => {
                const results = await ConfigurationModel.findByUserIdAndKeys(
                    { userId: 'user1', keys: ['key1', 'key3'] },
                    false,
                    null
                );

                expect(results).toHaveLength(2);
                expect(results.map(r => r.key).sort()).toEqual(['key1', 'key3']);
            });
        });

        describe('filtering behavior', () => {
            it('should handle empty keys array', async () => {
                const results = await ConfigurationModel.findByUserIdAndKeys(
                    { userId: 'user1', keys: [] },
                    false,
                    null
                );

                // Empty array should be treated as "find all"
                expect(results).toHaveLength(3);
            });

            it('should find partial matches when some keys exist', async () => {
                const results = await ConfigurationModel.findByUserIdAndKeys(
                    { userId: 'user1', keys: ['key1', 'nonexistent', 'key2'] },
                    false,
                    null
                );

                expect(results).toHaveLength(2);
                expect(results.map(r => r.key).sort()).toEqual(['key1', 'key2']);
            });

            it('should handle duplicate keys in filter', async () => {
                const results = await ConfigurationModel.findByUserIdAndKeys(
                    { userId: 'user1', keys: ['key1', 'key1', 'key1'] },
                    false,
                    null
                );

                expect(results).toHaveLength(1);
                expect(results[0].key).toBe('key1');
            });

            it('should return configurations with all fields populated', async () => {
                const results = await ConfigurationModel.findByUserIdAndKeys(
                    { userId: 'user1', keys: ['key1'] },
                    false,
                    null
                );

                expect(results[0]).toHaveProperty('_id');
                expect(results[0]).toHaveProperty('key');
                expect(results[0]).toHaveProperty('userId');
                expect(results[0]).toHaveProperty('value');
                expect(results[0]).toHaveProperty('createdOnDateTime');
                expect(results[0]).toHaveProperty('createdBy');
                expect(results[0]).toHaveProperty('lastUpdatedOnDateTime');
                expect(results[0]).toHaveProperty('lastUpdatedBy');
            });
        });
    });

    describe('deleteAll', () => {
        beforeEach(async () => {
            // Create test data
            await ConfigurationModel.upsert(
                { key: 'key1', userId: 'user1', value: { data: 'data1' } },
                false,
                null
            );
            await ConfigurationModel.upsert(
                { key: 'key2', userId: 'user1', value: { data: 'data2' } },
                false,
                null
            );
            await ConfigurationModel.upsert(
                { key: 'key1', userId: 'user2', value: { data: 'user2-data' } },
                false,
                null
            );
        });


        describe('deletion behavior', () => {
            it('should delete configurations for all users', async () => {
                await ConfigurationModel.deleteAll(true);

                const user1Configs = await DatabaseConfigurationModel.find({ userId: 'user1' });
                const user2Configs = await DatabaseConfigurationModel.find({ userId: 'user2' });

                expect(user1Configs).toHaveLength(0);
                expect(user2Configs).toHaveLength(0);
            });

            it('should delete all configurations regardless of key', async () => {
                await ConfigurationModel.deleteAll(true);

                const allConfigs = await DatabaseConfigurationModel.find({});
                expect(allConfigs).toHaveLength(0);
            });
        });
    });

    describe('Integration Tests', () => {
        it('should support complete configuration lifecycle', async () => {
            // Create
            const created = await ConfigurationModel.upsert(
                { key: 'lifecycle-key', userId: 'user1', value: { version: 1 } },
                true,
                validAuthToken
            );
            expect(created?.value).toEqual({ version: 1 });

            // Update
            const updated = await ConfigurationModel.upsert(
                { key: 'lifecycle-key', userId: 'user1', value: { version: 2 } },
                true,
                validAuthToken
            );
            expect(updated?._id.toString()).toBe(created?._id.toString());
            expect(updated?.value).toEqual({ version: 2 });

            // Find
            const found = await ConfigurationModel.findByUserIdAndKeys(
                { userId: 'user1', keys: ['lifecycle-key'] },
                true,
                validAuthToken
            );
            expect(found).toHaveLength(1);
            expect(found[0].value).toEqual({ version: 2 });

            // Delete all
            await ConfigurationModel.deleteAll(true);

            const afterDelete = await ConfigurationModel.findByUserIdAndKeys(
                { userId: 'user1' },
                true,
                validAuthToken
            );
            expect(afterDelete).toHaveLength(0);
        });

        it('should handle multiple users independently', async () => {
            const token1 = await TokenModel.create({ name: 'user1-token' });
            const token2 = await TokenModel.create({ name: 'user2-token' });

            await ConfigurationModel.upsert(
                { key: 'shared-key', userId: 'user1', value: { user: 1 } },
                true,
                token1.authorizationToken
            );

            await ConfigurationModel.upsert(
                { key: 'shared-key', userId: 'user2', value: { user: 2 } },
                true,
                token2.authorizationToken
            );

            const user1Configs = await ConfigurationModel.findByUserIdAndKeys(
                { userId: 'user1' },
                true,
                token1.authorizationToken
            );

            const user2Configs = await ConfigurationModel.findByUserIdAndKeys(
                { userId: 'user2' },
                true,
                token2.authorizationToken
            );

            expect(user1Configs).toHaveLength(1);
            expect(user2Configs).toHaveLength(1);
            expect(user1Configs[0].value).toEqual({ user: 1 });
            expect(user2Configs[0].value).toEqual({ user: 2 });
        });

        it('should maintain data integrity across operations', async () => {
            // Create multiple configurations
            await ConfigurationModel.upsert(
                { key: 'key1', userId: 'user1', value: { id: 1 } },
                false,
                null
            );
            await ConfigurationModel.upsert(
                { key: 'key2', userId: 'user1', value: { id: 2 } },
                false,
                null
            );
            await ConfigurationModel.upsert(
                { key: 'key3', userId: 'user2', value: { id: 3 } },
                false,
                null
            );

            // Update one
            await ConfigurationModel.upsert(
                { key: 'key1', userId: 'user1', value: { id: 1, updated: true } },
                false,
                null
            );

            // Verify data integrity
            const user1Configs = await ConfigurationModel.findByUserIdAndKeys(
                { userId: 'user1' },
                false,
                null
            );

            expect(user1Configs).toHaveLength(2);

            const key1Config = user1Configs.find(c => c.key === 'key1');
            const key2Config = user1Configs.find(c => c.key === 'key2');

            expect(key1Config?.value).toEqual({ id: 1, updated: true });
            expect(key2Config?.value).toEqual({ id: 2 });
        });

        it('should handle concurrent upserts correctly', async () => {
            const promises = Array.from({ length: 10 }, (_, i) =>
                ConfigurationModel.upsert(
                    { key: `key-${i}`, userId: 'user1', value: { index: i } },
                    false,
                    null
                )
            );

            await Promise.all(promises);

            const configs = await ConfigurationModel.findByUserIdAndKeys(
                { userId: 'user1' },
                false,
                null
            );

            expect(configs).toHaveLength(10);
        });

        it('should handle token expiration gracefully', async () => {
            // Create configuration with valid token
            await ConfigurationModel.upsert(
                { key: 'test-key', userId: 'user1', value: { data: 'test' } },
                true,
                validAuthToken
            );

            // Expire the token
            await TokenModel.expire({ name: validTokenName });

            // Operations requiring authorization should fail
            await expect(
                ConfigurationModel.upsert(
                    { key: 'test-key', userId: 'user1', value: { data: 'updated' } },
                    true,
                    validAuthToken
                )
            ).rejects.toThrow(UnauthorizedError);

            // But should work without authorization check
            const updated = await ConfigurationModel.upsert(
                { key: 'test-key', userId: 'user1', value: { data: 'updated' } },
                false,
                null
            );

            expect(updated?.value).toEqual({ data: 'updated' });
        });
    });

    describe('Edge Cases', () => {
        it('should handle very long valid keys (200 characters)', async () => {
            const longKey = 'a'.repeat(200);
            const result = await ConfigurationModel.upsert(
                { key: longKey, userId: 'user1', value: { test: true } },
                false,
                null
            );

            expect(result?.key).toBe(longKey);
        });

        it('should handle very long valid userIds (200 characters)', async () => {
            const longUserId = 'u'.repeat(200);
            const result = await ConfigurationModel.upsert(
                { key: 'test-key', userId: longUserId, value: { test: true } },
                false,
                null
            );

            expect(result?.userId).toBe(longUserId);
        });

        it('should handle large but valid values', async () => {
            const largeValue = {
                data: 'x'.repeat(10000),
                nested: { moreData: 'y'.repeat(10000) }
            };

            const result = await ConfigurationModel.upsert(
                { key: 'test-key', userId: 'user1', value: largeValue },
                false,
                null
            );

            expect(result?.value).toEqual(largeValue);
        });

        it('should handle many configurations for single user', async () => {
            const promises = Array.from({ length: 100 }, (_, i) =>
                ConfigurationModel.upsert(
                    { key: `key-${i}`, userId: 'user1', value: { index: i } },
                    false,
                    null
                )
            );

            await Promise.all(promises);

            const configs = await ConfigurationModel.findByUserIdAndKeys(
                { userId: 'user1' },
                false,
                null
            );

            expect(configs).toHaveLength(100);
        });

        it('should handle special characters in all allowed positions', async () => {
            const specialKey = 'test@key_with-all/special\\characters|and&more.like:#$[]{}()';
            const specialUserId = 'user@id_with-all/special\\characters|and&more.like:#$[]{}()';

            const result = await ConfigurationModel.upsert(
                { key: specialKey, userId: specialUserId, value: { test: true } },
                false,
                null
            );

            expect(result?.key).toBe(specialKey);
            expect(result?.userId).toBe(specialUserId);
        });

        it('should preserve exact value types', async () => {
            const complexValue = {
                string: 'text',
                number: 42,
                float: 3.14,
                boolean: true,
                null: null,
                array: [1, 'two', true, null],
                nested: { deep: { value: 'here' } }
            };

            const result = await ConfigurationModel.upsert(
                { key: 'test-key', userId: 'user1', value: complexValue },
                false,
                null
            );

            expect(result?.value).toEqual(complexValue);
        });
    });
});

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import ConfigurationModel from '../../src/model/ConfigurationModel';
import TokenModel from '../../src/model/TokenModel';
import { ConfigurationModel as DatabaseConfigurationModel } from '../../src/database/ConfigurationModel';
import UnauthorizedError from '../../src/model/errors/UnauthorizedError';
import { ValidationError } from 'apollo-server-core';
import ConfigurationInterface from '../../src/database/types/ConfigurationInterface';

describe('ConfigurationModel', () => {
    let mongoServer: MongoMemoryServer;
    let adminToken: string;
    let regularToken: string;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        await DatabaseConfigurationModel.deleteMany({});
        await TokenModel.deleteAll(false);

        // Create tokens for authorization tests
        const admin = await TokenModel.createAdmin({ name: 'admin' }, false);
        const regular = await TokenModel.create({ name: 'regular' }, false);
        adminToken = admin.token;
        regularToken = regular.token;
    });

    describe('upsert()', () => {
        describe('Create operations (insert)', () => {
            it('should create a new configuration without authorization check', async () => {
                const input = {
                    key: 'app.config',
                    userId: 'user123',
                    value: { setting: 'value' }
                };
                const config = await ConfigurationModel.upsert(input, false);

                expect(config).toBeDefined();
                expect(config!.key).toBe('app.config');
                expect(config!.userId).toBe('user123');
                expect(config!.value).toEqual({ setting: 'value' });
                expect(config!.createdBy).toBe('anonymous');
                expect(config!.updatedBy).toBe('anonymous');
                expect(config!.createdOnDateTime).toBeInstanceOf(Date);
                expect(config!.updatedOnDateTime).toBeInstanceOf(Date);
            });

            it('should create configuration with custom creator when token provided', async () => {
                const input = {
                    key: 'test.key',
                    userId: 'user1',
                    value: 'test' as any
                };
                const config = await ConfigurationModel.upsert(input, false, adminToken);

                expect(config!.createdBy).toBe(adminToken);
                expect(config!.updatedBy).toBe(adminToken);
            });

            it('should create configuration with admin authorization', async () => {
                const input = {
                    key: 'secure.config',
                    userId: 'user1',
                    value: { secure: true }
                };
                const config = await ConfigurationModel.upsert(input, true, adminToken);

                expect(config).toBeDefined();
                expect(config!.key).toBe('secure.config');
            });

            it('should create configuration with regular token authorization', async () => {
                const input = {
                    key: 'user.config',
                    userId: 'user1',
                    value: { preference: 'dark' }
                };
                const config = await ConfigurationModel.upsert(input, true, regularToken);

                expect(config).toBeDefined();
                expect(config!.key).toBe('user.config');
            });

            it('should create configuration with string value', async () => {
                const input = {
                    key: 'simple',
                    userId: 'user1',
                    value: 'simple string value' as any
                };
                const config = await ConfigurationModel.upsert(input, false);

                expect(config!.value).toBe('simple string value');
            });

            it('should create configuration with number value', async () => {
                const input = {
                    key: 'count',
                    userId: 'user1',
                    value: 42 as any
                };
                const config = await ConfigurationModel.upsert(input, false);

                expect(config!.value).toBe(42);
            });

            it('should create configuration with boolean value', async () => {
                const input = {
                    key: 'enabled',
                    userId: 'user1',
                    value: true as any
                };
                const config = await ConfigurationModel.upsert(input, false);

                expect(config!.value).toBe(true);
            });

            it('should create configuration with array value', async () => {
                const input = {
                    key: 'items',
                    userId: 'user1',
                    value: [1, 2, 3, 'test']
                };
                const config = await ConfigurationModel.upsert(input, false);

                expect(config!.value).toEqual([1, 2, 3, 'test']);
            });

            it('should create configuration with nested object value', async () => {
                const input = {
                    key: 'database',
                    userId: 'user1',
                    value: {
                        host: 'localhost',
                        port: 5432,
                        credentials: {
                            username: 'admin',
                            password: 'secret'
                        }
                    }
                };
                const config = await ConfigurationModel.upsert(input, false);

                expect(config!.value).toEqual(input.value);
            });

            it('should create configuration with null value', async () => {
                const input = {
                    key: 'nullable',
                    userId: 'user1',
                    value: null as any
                };
                const config = await ConfigurationModel.upsert(input, false);

                expect(config!.value).toBeNull();
            });

            it('should create configuration with key containing special characters', async () => {
                const input = {
                    key: 'app/config/prod:v1.0#main',
                    userId: 'user1',
                    value: 'test' as any
                };
                const config = await ConfigurationModel.upsert(input, false);

                expect(config!.key).toBe('app/config/prod:v1.0#main');
            });

            it('should create configuration with userId containing special characters', async () => {
                const input = {
                    key: 'config',
                    userId: 'user@domain.com',
                    value: 'test' as any
                };
                const config = await ConfigurationModel.upsert(input, false);

                expect(config!.userId).toBe('user@domain.com');
            });
        });

        describe('Update operations', () => {
            it('should update existing configuration with new value', async () => {
                const input = {
                    key: 'test.key',
                    userId: 'user1',
                    value: 'original' as any
                };
                const original = await ConfigurationModel.upsert(input, false);

                const updatedInput = {
                    key: 'test.key',
                    userId: 'user1',
                    value: 'updated' as any
                };
                const updated = await ConfigurationModel.upsert(updatedInput, false);

                expect(updated!._id.toString()).toBe(original!._id.toString());
                expect(updated!.value).toBe('updated');
                expect(updated!.updatedOnDateTime.getTime()).toBeGreaterThan(original!.updatedOnDateTime.getTime());
            });

            it('should preserve createdBy and createdOnDateTime when updating', async () => {
                const input = {
                    key: 'test.key',
                    userId: 'user1',
                    value: 'original' as any
                };
                const original = await ConfigurationModel.upsert(input, false, adminToken);

                const updatedInput = {
                    key: 'test.key',
                    userId: 'user1',
                    value: 'updated' as any
                };
                const updated = await ConfigurationModel.upsert(updatedInput, false, regularToken);

                expect(updated!.createdBy).toBe(adminToken);
                expect(updated!.createdOnDateTime.getTime()).toBe(original!.createdOnDateTime.getTime());
                expect(updated!.updatedBy).toBe(regularToken);
            });

            it('should update configuration with different value type', async () => {
                const input = {
                    key: 'flexible',
                    userId: 'user1',
                    value: 'string' as any
                };
                await ConfigurationModel.upsert(input, false);

                const updatedInput = {
                    key: 'flexible',
                    userId: 'user1',
                    value: { object: true }
                };
                const updated = await ConfigurationModel.upsert(updatedInput, false);

                expect(updated!.value).toEqual({ object: true });
            });

            it('should treat configurations with same key but different userId as separate', async () => {
                const input1 = {
                    key: 'shared.key',
                    userId: 'user1',
                    value: 'user1-value' as any
                };
                const input2 = {
                    key: 'shared.key',
                    userId: 'user2',
                    value: 'user2-value' as any
                };

                const config1 = await ConfigurationModel.upsert(input1, false);
                const config2 = await ConfigurationModel.upsert(input2, false);

                expect(config1!._id.toString()).not.toBe(config2!._id.toString());
                expect(config1!.value).toBe('user1-value');
                expect(config2!.value).toBe('user2-value');
            });

            it('should update configuration multiple times', async () => {
                const input = {
                    key: 'counter',
                    userId: 'user1',
                    value: 1 as any
                };
                await ConfigurationModel.upsert(input, false);
                await ConfigurationModel.upsert({ ...input, value: 2 as any }, false);
                const final = await ConfigurationModel.upsert({ ...input, value: 3 as any }, false);

                expect(final!.value).toBe(3);

                // Verify only one document exists
                const all = await DatabaseConfigurationModel.find({ key: 'counter', userId: 'user1' });
                expect(all.length).toBe(1);
            });
        });

        describe('Validation failures - key', () => {
            it('should throw ValidationError for empty key', async () => {
                const input = {
                    key: '',
                    userId: 'user1',
                    value: 'test' as any
                };
                await expect(ConfigurationModel.upsert(input, false)).rejects.toThrow(ValidationError);
            });

            it('should throw ValidationError for key exceeding maximum length', async () => {
                const input = {
                    key: 'a'.repeat(201),
                    userId: 'user1',
                    value: 'test' as any
                };
                await expect(ConfigurationModel.upsert(input, false)).rejects.toThrow(ValidationError);
            });

            it('should throw ValidationError for key with spaces', async () => {
                const input = {
                    key: 'invalid key',
                    userId: 'user1',
                    value: 'test' as any
                };
                await expect(ConfigurationModel.upsert(input, false)).rejects.toThrow(ValidationError);
            });

            it('should throw ValidationError for key with invalid characters', async () => {
                const input = {
                    key: 'key!invalid',
                    userId: 'user1',
                    value: 'test' as any
                };
                await expect(ConfigurationModel.upsert(input, false)).rejects.toThrow(ValidationError);
            });

            it('should throw ValidationError when key is not a string', async () => {
                const input = {
                    key: 123,
                    userId: 'user1',
                    value: 'test'
                } as any;
                await expect(ConfigurationModel.upsert(input, false)).rejects.toThrow(ValidationError);
            });
        });

        describe('Validation failures - userId', () => {
            it('should throw ValidationError for empty userId', async () => {
                const input = {
                    key: 'key1',
                    userId: '',
                    value: 'test' as any
                };
                await expect(ConfigurationModel.upsert(input, false)).rejects.toThrow(ValidationError);
            });

            it('should throw ValidationError for userId exceeding maximum length', async () => {
                const input = {
                    key: 'key1',
                    userId: 'a'.repeat(201),
                    value: 'test' as any
                };
                await expect(ConfigurationModel.upsert(input, false)).rejects.toThrow(ValidationError);
            });

            it('should throw ValidationError for userId with spaces', async () => {
                const input = {
                    key: 'key1',
                    userId: 'invalid user',
                    value: 'test' as any
                };
                await expect(ConfigurationModel.upsert(input, false)).rejects.toThrow(ValidationError);
            });

            it('should throw ValidationError when userId is not a string', async () => {
                const input = {
                    key: 'key1',
                    userId: 123,
                    value: 'test'
                } as any;
                await expect(ConfigurationModel.upsert(input, false)).rejects.toThrow(ValidationError);
            });
        });

        describe('Validation failures - value', () => {
            it('should throw ValidationError for value exceeding serialization limit', async () => {
                const input = {
                    key: 'key1',
                    userId: 'user1',
                    value: 'a'.repeat(10001) as any
                };
                await expect(ConfigurationModel.upsert(input, false)).rejects.toThrow(ValidationError);
            });

            it('should throw ValidationError for large object value', async () => {
                const largeObject: any = {};
                for (let i = 0; i < 1000; i++) {
                    largeObject[`prop${i}`] = 'some long string value that will make this huge';
                }
                const input = {
                    key: 'key1',
                    userId: 'user1',
                    value: largeObject
                };
                await expect(ConfigurationModel.upsert(input, false)).rejects.toThrow(ValidationError);
            });

            it('should throw ValidationError for circular reference in value', async () => {
                const circular: any = { name: 'test' };
                circular.self = circular;
                const input = {
                    key: 'key1',
                    userId: 'user1',
                    value: circular
                };
                await expect(ConfigurationModel.upsert(input, false)).rejects.toThrow(ValidationError);
            });
        });

        describe('Validation failures - missing fields', () => {
            it('should throw ValidationError for missing key', async () => {
                const input = {
                    userId: 'user1',
                    value: 'test'
                } as any;
                await expect(ConfigurationModel.upsert(input, false)).rejects.toThrow(ValidationError);
            });

            it('should throw ValidationError for missing userId', async () => {
                const input = {
                    key: 'key1',
                    value: 'test'
                } as any;
                await expect(ConfigurationModel.upsert(input, false)).rejects.toThrow(ValidationError);
            });

            it('should throw ValidationError for missing value', async () => {
                const input = {
                    key: 'key1',
                    userId: 'user1'
                } as any;
                await expect(ConfigurationModel.upsert(input, false)).rejects.toThrow(ValidationError);
            });
        });

        describe('Authorization failures', () => {
            it('should throw UnauthorizedError when checkAuthorization is true and no token provided', async () => {
                const input = {
                    key: 'key1',
                    userId: 'user1',
                    value: 'test' as any
                };
                await expect(ConfigurationModel.upsert(input, true, null)).rejects.toThrow(UnauthorizedError);
            });

            it('should throw UnauthorizedError when checkAuthorization is true and invalid token provided', async () => {
                const input = {
                    key: 'key1',
                    userId: 'user1',
                    value: 'test' as any
                };
                await expect(ConfigurationModel.upsert(input, true, 'invalid')).rejects.toThrow(UnauthorizedError);
            });

            it('should throw UnauthorizedError when checkAuthorization is true and expired token provided', async () => {
                await TokenModel.expire({ token: regularToken }, false);
                const input = {
                    key: 'key1',
                    userId: 'user1',
                    value: 'test' as any
                };
                await expect(ConfigurationModel.upsert(input, true, regularToken)).rejects.toThrow(UnauthorizedError);
            });
        });
    });

    describe('findByUserIdAndKeys()', () => {
        beforeEach(async () => {
            // Create test data
            await ConfigurationModel.upsert({ key: 'key1', userId: 'user1', value: 'value1' as any }, false);
            await ConfigurationModel.upsert({ key: 'key2', userId: 'user1', value: 'value2' as any }, false);
            await ConfigurationModel.upsert({ key: 'key3', userId: 'user1', value: 'value3' as any }, false);
            await ConfigurationModel.upsert({ key: 'key1', userId: 'user2', value: 'value4' as any }, false);
            await ConfigurationModel.upsert({ key: 'key2', userId: 'user2', value: 'value5' as any }, false);
        });

        describe('Success cases', () => {
            it('should find all configurations for a user when no keys specified', async () => {
                const configs = await ConfigurationModel.findByUserIdAndKeys({ userId: 'user1' }, false);

                expect(configs).toHaveLength(3);
                expect(configs.map(c => c.key).sort()).toEqual(['key1', 'key2', 'key3']);
            });

            it('should find specific configurations by keys', async () => {
                const configs = await ConfigurationModel.findByUserIdAndKeys(
                    { userId: 'user1', keys: ['key1', 'key2'] },
                    false
                );

                expect(configs).toHaveLength(2);
                expect(configs.map(c => c.key).sort()).toEqual(['key1', 'key2']);
            });

            it('should find single configuration by key', async () => {
                const configs = await ConfigurationModel.findByUserIdAndKeys(
                    { userId: 'user1', keys: ['key1'] },
                    false
                );

                expect(configs).toHaveLength(1);
                expect(configs[0].key).toBe('key1');
                expect(configs[0].value).toBe('value1');
            });

            it('should return empty array when no configurations found for user', async () => {
                const configs = await ConfigurationModel.findByUserIdAndKeys(
                    { userId: 'nonexistent' },
                    false
                );

                expect(configs).toHaveLength(0);
            });

            it('should return empty array when user exists but keys not found', async () => {
                const configs = await ConfigurationModel.findByUserIdAndKeys(
                    { userId: 'user1', keys: ['nonexistent'] },
                    false
                );

                expect(configs).toHaveLength(0);
            });

            it('should only return configurations for specified user', async () => {
                const configs = await ConfigurationModel.findByUserIdAndKeys(
                    { userId: 'user2' },
                    false
                );

                expect(configs).toHaveLength(2);
                expect(configs.every(c => c.userId === 'user2')).toBe(true);
            });

            it('should find configurations with admin authorization', async () => {
                const configs = await ConfigurationModel.findByUserIdAndKeys(
                    { userId: 'user1' },
                    true,
                    adminToken
                );

                expect(configs).toHaveLength(3);
            });

            it('should find configurations with regular token authorization', async () => {
                const configs = await ConfigurationModel.findByUserIdAndKeys(
                    { userId: 'user1' },
                    true,
                    regularToken
                );

                expect(configs).toHaveLength(3);
            });

            it('should return empty array for empty keys array', async () => {
                const configs = await ConfigurationModel.findByUserIdAndKeys(
                    { userId: 'user1', keys: [] },
                    false
                );

                expect(configs).toHaveLength(0);
            });

            it('should handle partial key matches', async () => {
                const configs = await ConfigurationModel.findByUserIdAndKeys(
                    { userId: 'user1', keys: ['key1', 'nonexistent', 'key2'] },
                    false
                );

                expect(configs).toHaveLength(2);
                expect(configs.map(c => c.key).sort()).toEqual(['key1', 'key2']);
            });

            it('should return configurations with all metadata fields', async () => {
                const configs = await ConfigurationModel.findByUserIdAndKeys(
                    { userId: 'user1', keys: ['key1'] },
                    false
                );

                expect(configs[0]).toHaveProperty('_id');
                expect(configs[0]).toHaveProperty('key');
                expect(configs[0]).toHaveProperty('userId');
                expect(configs[0]).toHaveProperty('value');
                expect(configs[0]).toHaveProperty('createdOnDateTime');
                expect(configs[0]).toHaveProperty('createdBy');
                expect(configs[0]).toHaveProperty('updatedOnDateTime');
                expect(configs[0]).toHaveProperty('updatedBy');
            });
        });

        describe('Authorization failures', () => {
            it('should throw UnauthorizedError when checkAuthorization is true and no token provided', async () => {
                await expect(
                    ConfigurationModel.findByUserIdAndKeys({ userId: 'user1' }, true, null)
                ).rejects.toThrow(UnauthorizedError);
            });

            it('should throw UnauthorizedError when checkAuthorization is true and invalid token provided', async () => {
                await expect(
                    ConfigurationModel.findByUserIdAndKeys({ userId: 'user1' }, true, 'invalid')
                ).rejects.toThrow(UnauthorizedError);
            });

            it('should throw UnauthorizedError when expired token is used', async () => {
                await TokenModel.expire({ token: regularToken }, false);
                await expect(
                    ConfigurationModel.findByUserIdAndKeys({ userId: 'user1' }, true, regularToken)
                ).rejects.toThrow(UnauthorizedError);
            });
        });
    });

    describe('deleteAll()', () => {
        beforeEach(async () => {
            await ConfigurationModel.upsert({ key: 'key1', userId: 'user1', value: 'value1' as any }, false);
            await ConfigurationModel.upsert({ key: 'key2', userId: 'user1', value: 'value2' as any }, false);
            await ConfigurationModel.upsert({ key: 'key1', userId: 'user2', value: 'value3' as any }, false);
        });

        describe('Success cases', () => {
            it('should delete all configurations', async () => {
                await ConfigurationModel.deleteAll(false);

                const count = await DatabaseConfigurationModel.countDocuments();
                expect(count).toBe(0);
            });

            it('should delete all configurations with admin authorization', async () => {
                await ConfigurationModel.deleteAll(true, adminToken);

                const count = await DatabaseConfigurationModel.countDocuments();
                expect(count).toBe(0);
            });

            it('should delete all configurations with regular token authorization', async () => {
                await ConfigurationModel.deleteAll(true, regularToken);

                const count = await DatabaseConfigurationModel.countDocuments();
                expect(count).toBe(0);
            });

            it('should succeed even when there are no configurations', async () => {
                await DatabaseConfigurationModel.deleteMany({});
                await ConfigurationModel.deleteAll(false);

                const count = await DatabaseConfigurationModel.countDocuments();
                expect(count).toBe(0);
            });
        });

        describe('Authorization failures', () => {
            it('should throw UnauthorizedError when checkAuthorization is true and no token provided', async () => {
                await expect(ConfigurationModel.deleteAll(true, null)).rejects.toThrow(UnauthorizedError);
            });

            it('should throw UnauthorizedError when checkAuthorization is true and invalid token provided', async () => {
                await expect(ConfigurationModel.deleteAll(true, 'invalid')).rejects.toThrow(UnauthorizedError);
            });

            it('should throw UnauthorizedError when expired token is used', async () => {
                await TokenModel.expire({ token: regularToken }, false);
                await expect(ConfigurationModel.deleteAll(true, regularToken)).rejects.toThrow(UnauthorizedError);
            });
        });
    });

    describe('Integration tests', () => {
        it('should handle complete configuration lifecycle', async () => {
            // Create configuration
            const created = await ConfigurationModel.upsert(
                { key: 'app.theme', userId: 'user1', value: 'light' as any },
                true,
                adminToken
            );
            expect(created!.value).toBe('light');

            // Find it
            const found = await ConfigurationModel.findByUserIdAndKeys(
                { userId: 'user1', keys: ['app.theme'] },
                true,
                adminToken
            );
            expect(found).toHaveLength(1);
            expect(found[0].value).toBe('light');

            // Update it
            const updated = await ConfigurationModel.upsert(
                { key: 'app.theme', userId: 'user1', value: 'dark' as any },
                true,
                regularToken
            );
            expect(updated!.value).toBe('dark');
            expect(updated!._id.toString()).toBe(created!._id.toString());

            // Verify update
            const foundUpdated = await ConfigurationModel.findByUserIdAndKeys(
                { userId: 'user1' },
                false
            );
            expect(foundUpdated).toHaveLength(1);
            expect(foundUpdated[0].value).toBe('dark');

            // Delete all
            await ConfigurationModel.deleteAll(true, adminToken);
            const afterDelete = await ConfigurationModel.findByUserIdAndKeys(
                { userId: 'user1' },
                false
            );
            expect(afterDelete).toHaveLength(0);
        });

        it('should handle multiple users with same keys independently', async () => {
            // Create configurations for different users with same keys
            await ConfigurationModel.upsert({ key: 'setting', userId: 'user1', value: 'value1' as any }, false);
            await ConfigurationModel.upsert({ key: 'setting', userId: 'user2', value: 'value2' as any }, false);
            await ConfigurationModel.upsert({ key: 'setting', userId: 'user3', value: 'value3' as any }, false);

            // Update one user's configuration
            await ConfigurationModel.upsert({ key: 'setting', userId: 'user2', value: 'updated' as any }, false);

            // Verify each user has their own value
            const user1Config = await ConfigurationModel.findByUserIdAndKeys({ userId: 'user1' }, false);
            const user2Config = await ConfigurationModel.findByUserIdAndKeys({ userId: 'user2' }, false);
            const user3Config = await ConfigurationModel.findByUserIdAndKeys({ userId: 'user3' }, false);

            expect(user1Config[0].value).toBe('value1');
            expect(user2Config[0].value).toBe('updated');
            expect(user3Config[0].value).toBe('value3');

            // Verify total count
            const allConfigs = await DatabaseConfigurationModel.countDocuments();
            expect(allConfigs).toBe(3);
        });

        it('should handle complex nested configurations', async () => {
            const complexConfig = {
                key: 'app.config',
                userId: 'user1',
                value: {
                    database: {
                        connections: [
                            { host: 'db1.example.com', port: 5432 },
                            { host: 'db2.example.com', port: 5432 }
                        ]
                    },
                    features: {
                        enabled: ['analytics', 'notifications'],
                        disabled: ['beta-features']
                    },
                    settings: {
                        theme: 'dark',
                        language: 'en',
                        timezone: 'UTC'
                    }
                }
            };

            const created = await ConfigurationModel.upsert(complexConfig, true, adminToken);
            expect(created!.value).toEqual(complexConfig.value);

            const found = await ConfigurationModel.findByUserIdAndKeys(
                { userId: 'user1', keys: ['app.config'] },
                true,
                regularToken
            );
            expect(found[0].value).toEqual(complexConfig.value);
        });

        it('should maintain data integrity with concurrent upserts', async () => {
            const operations = Array(20).fill(null).map((_, i) =>
                ConfigurationModel.upsert(
                    { key: `key${i % 5}`, userId: 'user1', value: i as any },
                    false
                )
            );

            await Promise.all(operations);

            const configs = await ConfigurationModel.findByUserIdAndKeys({ userId: 'user1' }, false);

            // Should have 5 unique keys (key0 through key4)
            expect(configs.length).toBe(5);
            const uniqueKeys = new Set(configs.map(c => c.key));
            expect(uniqueKeys.size).toBe(5);
        });

        it('should properly track different value types over updates', async () => {
            const key = 'flexible';
            const userId = 'user1';

            // String
            let config = await ConfigurationModel.upsert({ key, userId, value: 'string' as any }, false);
            expect(typeof config!.value).toBe('string');

            // Number
            config = await ConfigurationModel.upsert({ key, userId, value: 42 as any }, false);
            expect(typeof config!.value).toBe('number');

            // Boolean
            config = await ConfigurationModel.upsert({ key, userId, value: true as any }, false);
            expect(typeof config!.value).toBe('boolean');

            // Array
            config = await ConfigurationModel.upsert({ key, userId, value: [1, 2, 3] }, false);
            expect(Array.isArray(config!.value)).toBe(true);

            // Object
            config = await ConfigurationModel.upsert({ key, userId, value: { nested: 'object' } }, false);
            expect(typeof config!.value).toBe('object');
            expect(config!.value).toEqual({ nested: 'object' });

            // Verify only one document exists
            const all = await DatabaseConfigurationModel.find({ key, userId });
            expect(all.length).toBe(1);
        });
    });

    describe('Edge cases', () => {
        it('should handle key and userId at boundary lengths', async () => {
            const config = await ConfigurationModel.upsert({
                key: 'a'.repeat(200),
                userId: 'b'.repeat(200),
                value: 'test' as any
            }, false);

            expect(config!.key.length).toBe(200);
            expect(config!.userId.length).toBe(200);
        });

        it('should handle empty object value', async () => {
            const config = await ConfigurationModel.upsert({
                key: 'empty',
                userId: 'user1',
                value: {}
            }, false);

            expect(config!.value).toEqual({});
        });

        it('should handle empty array value', async () => {
            const config = await ConfigurationModel.upsert({
                key: 'empty-array',
                userId: 'user1',
                value: []
            }, false);

            expect(config!.value).toEqual([]);
        });

        it('should handle value at maximum serialization size', async () => {
            const largeString = 'a'.repeat(9996);
            const config = await ConfigurationModel.upsert({
                key: 'large',
                userId: 'user1',
                value: largeString as any
            }, false);

            expect(config!.value).toBe(largeString);
        });

        it('should handle special JSON characters in values', async () => {
            const config = await ConfigurationModel.upsert({
                key: 'special',
                userId: 'user1',
                value: {
                    quote: 'He said "hello"',
                    backslash: 'C:\\path\\to\\file',
                    newline: 'line1\nline2',
                    tab: 'col1\tcol2'
                }
            }, false);

            expect(config!.value).toEqual({
                quote: 'He said "hello"',
                backslash: 'C:\\path\\to\\file',
                newline: 'line1\nline2',
                tab: 'col1\tcol2'
            });
        });
    });
});

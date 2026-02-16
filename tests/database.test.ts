import databaseConnection from '../src/database/DatabaseConnection';
import { ConfigurationSchema } from '../src/document/ConfigurationModel';
import { TokenSchema } from '../src/document/TokenModel';

describe('Database Models', () => {
    const TEST_MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/config-server-test';
    let isConnected = false;

    beforeAll(async () => {
        try {
            // Try to connect to test database
            await databaseConnection.connect(TEST_MONGODB_URI);
            isConnected = true;
        } catch (error) {
            console.log('MongoDB not available, skipping database tests');
            isConnected = false;
        }
    });

    afterAll(async () => {
        if (isConnected) {
            // Clean up and disconnect
            try {
                await ConfigurationSchema.deleteMany({});
                await TokenSchema.deleteMany({});
            } catch (error) {
                // Ignore cleanup errors
            }
            await databaseConnection.disconnect();
        }
    });

    describe('ConfigurationModel', () => {
        test('should upsert configuration with userId', async () => {
            if (!isConnected) {
                console.log('Skipping test - MongoDB not available');
                return;
            }

            const upsertedCount = await ConfigurationSchema.upsertConfiguration('theme', 'user123', { mode: 'dark', primaryColor: '#007acc' });
            const result = await ConfigurationSchema.findByKeyAndUserId('theme', 'user123');

            expect(upsertedCount).toBe(1);
            expect(result).toMatchObject({
                key: 'theme',
                userId: 'user123',
                value: { mode: 'dark', primaryColor: '#007acc' }
            });
        });

        test('should upsert default configuration without userId', async () => {
            if (!isConnected) {
                console.log('Skipping test - MongoDB not available');
                return;
            }

            const upsertedCount = await ConfigurationSchema.upsertConfiguration('defaultTheme', null, { mode: 'light', primaryColor: '#ffffff' });
            const result = await ConfigurationSchema.findByKeyAndUserId('defaultTheme', null);

            expect(upsertedCount).toBe(1);
            expect(result).toBeDefined();
            expect(result).toMatchObject({
                key: 'defaultTheme',
                value: { mode: 'light', primaryColor: '#ffffff' }
            });
            expect(result?.userId).toBeUndefined();
        });

        test('should find configuration by key and userId', async () => {
            if (!isConnected) {
                console.log('Skipping test - MongoDB not available');
                return;
            }

            const config = await ConfigurationSchema.findByKeyAndUserId('theme', 'user123');

            expect(config).toMatchObject({
                key: 'theme',
                userId: 'user123',
                value: { mode: 'dark', primaryColor: '#007acc' }
            });
        });

        test('should update existing configuration', async () => {
            if (!isConnected) {
                console.log('Skipping test - MongoDB not available');
                return;
            }

            const upsertedCount = await ConfigurationSchema.upsertConfiguration('theme', 'user123', { mode: 'light', primaryColor: '#ffffff' });
            const result = await ConfigurationSchema.findByKeyAndUserId('theme', 'user123');

            expect(upsertedCount).toBe(0);
            expect(result).toMatchObject({
                key: 'theme',
                userId: 'user123',
                value: { mode: 'light', primaryColor: '#ffffff' }
            });
        });

        test('should find configurations by userId and keys with fallback to defaults', async () => {
            if (!isConnected) {
                console.log('Skipping test - MongoDB not available');
                return;
            }

            // Setup: Create user config and default config
            await ConfigurationSchema.upsertConfiguration('userSetting', 'user456', { enabled: true });
            await ConfigurationSchema.upsertConfiguration('defaultSetting', null, { enabled: false });

            // Test: Query with keys that include both user and default configs
            const configs = await ConfigurationSchema.findByUserIdAndKeys('user456', ['userSetting', 'defaultSetting']);

            expect(configs.length).toBe(2);

            const userConfig = configs.find(c => c.key === 'userSetting');
            expect(userConfig).toMatchObject({
                key: 'userSetting',
                userId: 'user456',
                value: { enabled: true }
            });

            const defaultConfig = configs.find(c => c.key === 'defaultSetting');
            expect(defaultConfig).toMatchObject({
                key: 'defaultSetting',
                value: { enabled: false }
            });
            expect(defaultConfig?.userId).toBeUndefined();
        });

        test('should return all user configurations when keys not provided', async () => {
            if (!isConnected) {
                console.log('Skipping test - MongoDB not available');
                return;
            }

            // Setup: Create multiple configs for a user
            await ConfigurationSchema.upsertConfiguration('setting1', 'user789', { value: 1 });
            await ConfigurationSchema.upsertConfiguration('setting2', 'user789', { value: 2 });

            // Test: Query without keys
            const configs = await ConfigurationSchema.findByUserIdAndKeys('user789');

            expect(configs.length).toBeGreaterThanOrEqual(2);
            const userConfigs = configs.filter(c => c.userId === 'user789');
            expect(userConfigs.length).toBeGreaterThanOrEqual(2);
        });

        test('should return empty array when keys provided but no configs exist', async () => {
            if (!isConnected) {
                console.log('Skipping test - MongoDB not available');
                return;
            }

            const configs = await ConfigurationSchema.findByUserIdAndKeys('nonexistentUser', ['nonexistentKey']);

            expect(configs).toEqual([]);
        });
    });

    describe('TokenModel', () => {
        test('should create token', async () => {
            if (!isConnected) {
                console.log('Skipping test - MongoDB not available');
                return;
            }

            const tokenData = {
                token: 'test-token-123',
                name: 'Test Token',
                active: true
            };

            const result = await TokenSchema.createToken(tokenData);

            expect(result).toMatchObject({
                token: 'test-token-123',
                name: 'Test Token',
                active: true
            });
            expect(result._id).toBeDefined();
            expect(result.createdAt).toBeDefined();
        });

        test('should find token by token string', async () => {
            if (!isConnected) {
                console.log('Skipping test - MongoDB not available');
                return;
            }

            const token = await TokenSchema.findByToken('test-token-123');

            expect(token).toMatchObject({
                token: 'test-token-123',
                name: 'Test Token',
                active: true
            });
        });
    });
});

import { ConfigModel, TokenModel } from '../src/database/models';
import db from '../src/database/connection';
import { ConfigurationModel, TokenModel as TokenSchema } from '../src/database/schemas';

describe('Database Models', () => {
  const TEST_MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/config-server-test';
  let isConnected = false;

  beforeAll(async () => {
    try {
      // Try to connect to test database
      await db.connect(TEST_MONGODB_URI);
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
        await ConfigurationModel.deleteMany({});
        await TokenSchema.deleteMany({});
      } catch (error) {
        // Ignore cleanup errors
      }
      await db.disconnect();
    }
  });

  describe('ConfigModel', () => {
    const configModel = new ConfigModel();

    test('should upsert configuration with userId', async () => {
      if (!isConnected) {
        console.log('Skipping test - MongoDB not available');
        return;
      }

      const result = await configModel.upsert('theme', 'user123', { mode: 'dark', primaryColor: '#007acc' });
      
      expect(result).toMatchObject({
        key: 'theme',
        userId: 'user123',
        value: { mode: 'dark', primaryColor: '#007acc' }
      });
      expect(result.upserted).toBe(true);
    });

    test('should upsert default configuration without userId', async () => {
      if (!isConnected) {
        console.log('Skipping test - MongoDB not available');
        return;
      }

      const result = await configModel.upsert('defaultTheme', null, { mode: 'light', primaryColor: '#ffffff' });
      
      expect(result).toMatchObject({
        key: 'defaultTheme',
        value: { mode: 'light', primaryColor: '#ffffff' }
      });
      expect(result.userId).toBeUndefined();
      expect(result.upserted).toBe(true);
    });

    test('should find configuration by key and userId', async () => {
      if (!isConnected) {
        console.log('Skipping test - MongoDB not available');
        return;
      }

      const config = await configModel.findByKeyAndUserId('theme', 'user123');
      
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

      const result = await configModel.upsert('theme', 'user123', { mode: 'light', primaryColor: '#ffffff' });
      
      expect(result).toMatchObject({
        key: 'theme',
        userId: 'user123',
        value: { mode: 'light', primaryColor: '#ffffff' }
      });
      expect(result.upserted).toBe(false);
    });

    test('should find configurations by userId and keys with fallback to defaults', async () => {
      if (!isConnected) {
        console.log('Skipping test - MongoDB not available');
        return;
      }

      // Setup: Create user config and default config
      await configModel.upsert('userSetting', 'user456', { enabled: true });
      await configModel.upsert('defaultSetting', null, { enabled: false });
      
      // Test: Query with keys that include both user and default configs
      const configs = await configModel.findByUserIdAndKeys('user456', ['userSetting', 'defaultSetting']);
      
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
      await configModel.upsert('setting1', 'user789', { value: 1 });
      await configModel.upsert('setting2', 'user789', { value: 2 });
      
      // Test: Query without keys
      const configs = await configModel.findByUserIdAndKeys('user789');
      
      expect(configs.length).toBeGreaterThanOrEqual(2);
      const userConfigs = configs.filter(c => c.userId === 'user789');
      expect(userConfigs.length).toBeGreaterThanOrEqual(2);
    });

    test('should return empty array when keys provided but no configs exist', async () => {
      if (!isConnected) {
        console.log('Skipping test - MongoDB not available');
        return;
      }

      const configs = await configModel.findByUserIdAndKeys('nonexistentUser', ['nonexistentKey']);
      
      expect(configs).toEqual([]);
    });
  });

  describe('TokenModel', () => {
    const tokenModel = new TokenModel();

    test('should create token', async () => {
      if (!isConnected) {
        console.log('Skipping test - MongoDB not available');
        return;
      }

      const tokenData = {
        token: 'test-token-123',
        userId: 'user123',
        name: 'Test Token',
        active: true
      };

      const result = await tokenModel.create(tokenData);
      
      expect(result).toMatchObject({
        token: 'test-token-123',
        userId: 'user123',
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

      const token = await tokenModel.findByToken('test-token-123');
      
      expect(token).toMatchObject({
        token: 'test-token-123',
        userId: 'user123',
        name: 'Test Token',
        active: true
      });
    });
  });
});

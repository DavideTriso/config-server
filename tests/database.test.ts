import { ConfigModel, TokenModel } from '../src/database/models';
import db from '../src/database/connection';

describe('Database Models', () => {
  beforeAll(async () => {
    // Connect to test database
    await db.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/config-server-test');
  });

  afterAll(async () => {
    // Clean up and disconnect
    const testDb = db.getDb();
    await testDb.collection('configurations').deleteMany({});
    await testDb.collection('tokens').deleteMany({});
    await db.disconnect();
  });

  describe('ConfigModel', () => {
    const configModel = new ConfigModel();

    test('should upsert configuration', async () => {
      const result = await configModel.upsert('theme', 'user123', { mode: 'dark', primaryColor: '#007acc' });
      
      expect(result).toMatchObject({
        key: 'theme',
        userId: 'user123',
        value: { mode: 'dark', primaryColor: '#007acc' }
      });
      expect(result.upserted).toBe(true);
    });

    test('should find configuration by key and userId', async () => {
      const config = await configModel.findByKeyAndUserId('theme', 'user123');
      
      expect(config).toMatchObject({
        key: 'theme',
        userId: 'user123',
        value: { mode: 'dark', primaryColor: '#007acc' }
      });
    });

    test('should update existing configuration', async () => {
      const result = await configModel.upsert('theme', 'user123', { mode: 'light', primaryColor: '#ffffff' });
      
      expect(result).toMatchObject({
        key: 'theme',
        userId: 'user123',
        value: { mode: 'light', primaryColor: '#ffffff' }
      });
      expect(result.upserted).toBe(false);
    });
  });

  describe('TokenModel', () => {
    const tokenModel = new TokenModel();

    test('should create token', async () => {
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

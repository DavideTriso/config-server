import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { TokenModel as TokenSchema } from '../src/database/schemas';
import { TokenModel } from '../src/database/TokenModel';
import crypto from 'crypto';

describe('Token CLI Management Tests', () => {
    let mongoServer: MongoMemoryServer;
    let tokenModel: TokenModel;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
        tokenModel = new TokenModel();
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    afterEach(async () => {
        await TokenSchema.deleteMany({});
    });

    describe('Create Token', () => {
        it('should create a token and persist it to database', async () => {
            const tokenData = {
                token: crypto.randomBytes(32).toString('hex'),
                name: 'Test Token',
                active: true,
            };

            const createdToken = await tokenModel.create(tokenData);

            expect(createdToken).toBeDefined();
            expect(createdToken._id).toBeDefined();
            expect(createdToken.token).toBe(tokenData.token);
            expect(createdToken.name).toBe(tokenData.name);
            expect(createdToken.active).toBe(true);

            // Verify it's actually in the database
            const dbToken = await TokenSchema.findOne({ token: tokenData.token });
            expect(dbToken).toBeDefined();
            expect(dbToken?.name).toBe(tokenData.name);
            expect(dbToken?.active).toBe(true);
        });

        it('should create token with expiration date', async () => {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);

            const tokenData = {
                token: crypto.randomBytes(32).toString('hex'),
                name: 'Token with Expiry',
                active: true,
                expiresAt,
            };

            const createdToken = await tokenModel.create(tokenData);

            expect(createdToken.expiresAt).toBeDefined();
            expect(new Date(createdToken.expiresAt!).getTime()).toBeCloseTo(
                expiresAt.getTime(),
                -3 // within seconds
            );

            // Verify expiration is persisted
            const dbToken = await TokenSchema.findOne({ token: tokenData.token });
            expect(dbToken?.expiresAt).toBeDefined();
        });

        it('should create multiple tokens', async () => {
            const tokens = [
                {
                    token: crypto.randomBytes(32).toString('hex'),
                    name: 'Token 1',
                    active: true,
                },
                {
                    token: crypto.randomBytes(32).toString('hex'),
                    name: 'Token 2',
                    active: true,
                },
            ];

            for (const tokenData of tokens) {
                await tokenModel.create(tokenData);
            }

            const allTokens = await tokenModel.findAll();
            expect(allTokens).toHaveLength(2);
            expect(allTokens.map(t => t.name)).toEqual(
                expect.arrayContaining(['Token 1', 'Token 2'])
            );
        });
    });

    describe('List Tokens', () => {
        beforeEach(async () => {
            // Create test tokens
            await tokenModel.create({
                token: 'token1',
                name: 'First Token',
                active: true,
            });
            await tokenModel.create({
                token: 'token2',
                name: 'Second Token',
                active: false,
            });
        });

        it('should list all tokens', async () => {
            const tokens = await tokenModel.findAll();

            expect(tokens).toHaveLength(2);
            expect(tokens).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ name: 'First Token', active: true }),
                    expect.objectContaining({ name: 'Second Token', active: false }),
                ])
            );
        });

        it('should return empty array when no tokens exist', async () => {
            await TokenSchema.deleteMany({});

            const tokens = await tokenModel.findAll();

            expect(tokens).toHaveLength(0);
            expect(tokens).toEqual([]);
        });

        it('should include token metadata in list', async () => {
            const tokens = await tokenModel.findAll();

            tokens.forEach(token => {
                expect(token._id).toBeDefined();
                expect(token.token).toBeDefined();
                expect(token.name).toBeDefined();
                expect(token.active).toBeDefined();
                expect(token.createdAt).toBeDefined();
                expect(token.updatedAt).toBeDefined();
            });
        });
    });

    describe('Find Token by Token String', () => {
        beforeEach(async () => {
            await tokenModel.create({
                token: 'findme123',
                name: 'Findable Token',
                active: true,
            });
        });

        it('should find token by token string', async () => {
            const token = await tokenModel.findByToken('findme123');

            expect(token).toBeDefined();
            expect(token?.name).toBe('Findable Token');
            expect(token?.active).toBe(true);
        });

        it('should return null for non-existent token', async () => {
            const token = await tokenModel.findByToken('nonexistent');

            expect(token).toBeNull();
        });
    });

    describe('Deactivate Token', () => {
        let tokenId: string;

        beforeEach(async () => {
            const token = await tokenModel.create({
                token: 'deactivate_me',
                name: 'Token to Deactivate',
                active: true,
            });
            tokenId = token._id.toString();
        });

        it('should deactivate token and persist change to database', async () => {
            const updated = await tokenModel.updateById(tokenId, { active: false });

            expect(updated).toBe(true);

            // Verify the change was persisted
            const dbToken = await TokenSchema.findById(tokenId);
            expect(dbToken).toBeDefined();
            expect(dbToken?.active).toBe(false);
            expect(dbToken?.name).toBe('Token to Deactivate'); // Other fields unchanged
        });

        it('should return false when trying to deactivate non-existent token', async () => {
            const fakeId = new mongoose.Types.ObjectId().toString();
            const updated = await tokenModel.updateById(fakeId, { active: false });

            expect(updated).toBe(false);
        });

        it('should update updatedAt timestamp', async () => {
            const originalToken = await TokenSchema.findById(tokenId);
            const originalUpdatedAt = originalToken?.updatedAt;

            // Wait a bit to ensure timestamp difference
            await new Promise(resolve => setTimeout(resolve, 10));

            await tokenModel.updateById(tokenId, { active: false });

            const updatedToken = await TokenSchema.findById(tokenId);
            expect(updatedToken?.updatedAt.getTime()).toBeGreaterThan(
                originalUpdatedAt!.getTime()
            );
        });

        it('should allow reactivating a deactivated token', async () => {
            await tokenModel.updateById(tokenId, { active: false });

            let dbToken = await TokenSchema.findById(tokenId);
            expect(dbToken?.active).toBe(false);

            const updated = await tokenModel.updateById(tokenId, { active: true });
            expect(updated).toBe(true);

            dbToken = await TokenSchema.findById(tokenId);
            expect(dbToken?.active).toBe(true);
        });
    });

    describe('Revoke Token (Delete)', () => {
        beforeEach(async () => {
            await tokenModel.create({
                token: 'revoke_me',
                name: 'Token to Revoke',
                active: true,
            });
        });

        it('should delete token by token string and remove from database', async () => {
            const deleted = await tokenModel.deleteByToken('revoke_me');

            expect(deleted).toBe(true);

            // Verify the token is completely removed from database
            const dbToken = await TokenSchema.findOne({ token: 'revoke_me' });
            expect(dbToken).toBeNull();
        });

        it('should return false when trying to delete non-existent token', async () => {
            const deleted = await tokenModel.deleteByToken('nonexistent');

            expect(deleted).toBe(false);
        });

        it('should delete token by ID', async () => {
            const token = await tokenModel.create({
                token: 'delete_by_id',
                name: 'Delete by ID',
                active: true,
            });

            const deleted = await tokenModel.deleteById(token._id.toString());

            expect(deleted).toBe(true);

            // Verify removal
            const dbToken = await TokenSchema.findById(token._id);
            expect(dbToken).toBeNull();
        });

        it('should not affect other tokens when deleting one', async () => {
            await tokenModel.create({
                token: 'keep_me',
                name: 'Token to Keep',
                active: true,
            });

            await tokenModel.deleteByToken('revoke_me');

            const allTokens = await tokenModel.findAll();
            expect(allTokens).toHaveLength(1);
            expect(allTokens[0].token).toBe('keep_me');
        });
    });

    describe('Update Token Properties', () => {
        let tokenId: string;

        beforeEach(async () => {
            const token = await tokenModel.create({
                token: 'update_me',
                name: 'Original Name',
                active: true,
            });
            tokenId = token._id.toString();
        });

        it('should update token name', async () => {
            const updated = await tokenModel.updateById(tokenId, { name: 'Updated Name' });

            expect(updated).toBe(true);

            const dbToken = await TokenSchema.findById(tokenId);
            expect(dbToken?.name).toBe('Updated Name');
        });

        it('should update token expiration', async () => {
            const newExpiry = new Date();
            newExpiry.setDate(newExpiry.getDate() + 60);

            const updated = await tokenModel.updateById(tokenId, { expiresAt: newExpiry });

            expect(updated).toBe(true);

            const dbToken = await TokenSchema.findById(tokenId);
            expect(dbToken?.expiresAt).toBeDefined();
            expect(dbToken?.expiresAt!.getTime()).toBeCloseTo(newExpiry.getTime(), -3);
        });

        it('should update multiple properties at once', async () => {
            const updated = await tokenModel.updateById(tokenId, {
                name: 'New Name',
                active: false,
            });

            expect(updated).toBe(true);

            const dbToken = await TokenSchema.findById(tokenId);
            expect(dbToken?.name).toBe('New Name');
            expect(dbToken?.active).toBe(false);
        });
    });

    describe('Token Expiration Scenarios', () => {
        it('should handle expired tokens correctly', async () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1);

            const token = await tokenModel.create({
                token: 'expired_token',
                name: 'Expired Token',
                active: true,
                expiresAt: pastDate,
            });

            // Token exists in database
            const dbToken = await TokenSchema.findById(token._id);
            expect(dbToken).toBeDefined();
            expect(dbToken?.expiresAt!.getTime()).toBeLessThan(new Date().getTime());
        });

        it('should handle future expiration dates', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 30);

            const token = await tokenModel.create({
                token: 'future_token',
                name: 'Future Expiry Token',
                active: true,
                expiresAt: futureDate,
            });

            const dbToken = await TokenSchema.findById(token._id);
            expect(dbToken?.expiresAt!.getTime()).toBeGreaterThan(new Date().getTime());
        });

        it('should handle tokens without expiration', async () => {
            const token = await tokenModel.create({
                token: 'no_expiry_token',
                name: 'No Expiry Token',
                active: true,
            });

            const dbToken = await TokenSchema.findById(token._id);
            expect(dbToken?.expiresAt).toBeUndefined();
        });
    });

    describe('Edge Cases and Data Integrity', () => {
        it('should maintain token uniqueness', async () => {
            const tokenString = 'unique_token_123';

            await tokenModel.create({
                token: tokenString,
                name: 'First Token',
                active: true,
            });

            // Attempting to create duplicate should fail at MongoDB level
            await expect(
                tokenModel.create({
                    token: tokenString,
                    name: 'Duplicate Token',
                    active: true,
                })
            ).rejects.toThrow();
        });

        it('should handle concurrent token operations', async () => {
            const token = await tokenModel.create({
                token: 'concurrent_token',
                name: 'Concurrent Test',
                active: true,
            });

            // Simulate concurrent updates
            const updates = [
                tokenModel.updateById(token._id.toString(), { name: 'Update 1' }),
                tokenModel.updateById(token._id.toString(), { name: 'Update 2' }),
                tokenModel.updateById(token._id.toString(), { name: 'Update 3' }),
            ];

            await Promise.all(updates);

            const dbToken = await TokenSchema.findById(token._id);
            expect(dbToken).toBeDefined();
            expect(['Update 1', 'Update 2', 'Update 3']).toContain(dbToken?.name);
        });

        it('should preserve timestamps on operations', async () => {
            const token = await tokenModel.create({
                token: 'timestamp_test',
                name: 'Timestamp Test',
                active: true,
            });

            expect(token.createdAt).toBeDefined();
            expect(token.updatedAt).toBeDefined();

            const dbToken = await TokenSchema.findById(token._id);
            expect(dbToken?.createdAt).toBeDefined();
            expect(dbToken?.updatedAt).toBeDefined();
            expect(dbToken?.createdAt.getTime()).toBe(token.createdAt.getTime());
        });
    });
});

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import TokenModel from '../../src/model/TokenModel';
import { TokenModel as DatabaseTokenModel } from '../../src/database/TokenModel';
import UnauthorizedError from '../../src/model/errors/UnauthorizedError';
import { ValidationError } from 'apollo-server-core';
import TokenInterface from '../../src/database/types/TokenInterface';

describe('TokenModel', () => {
    let mongoServer: MongoMemoryServer;

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
        await DatabaseTokenModel.deleteMany({});
    });

    describe('create()', () => {
        describe('Success cases', () => {
            it('should create a regular token without authorization check', async () => {
                const input = { name: 'test-token' };
                const token = await TokenModel.create(input, false);

                expect(token).toBeDefined();
                expect(token.name).toBe('test-token');
                expect(token.admin).toBe(false);
                expect(token.expired).toBe(false);
                expect(token.token).toBeDefined();
                expect(token.token.length).toBe(128); // 64 bytes in hex = 128 chars
                expect(token.createdBy).toBe('anonymous');
                expect(token.updatedBy).toBe('anonymous');
                expect(token.createdOnDateTime).toBeInstanceOf(Date);
                expect(token.updatedOnDateTime).toBeInstanceOf(Date);
            });

            it('should create a token with custom creator when token provided', async () => {
                const adminToken = await TokenModel.createAdmin({ name: 'admin' }, false);
                const input = { name: 'user-token' };
                const token = await TokenModel.create(input, false, adminToken.token);

                expect(token.createdBy).toBe(adminToken.token);
                expect(token.updatedBy).toBe(adminToken.token);
            });

            it('should create a token with authorization check when admin token provided', async () => {
                const adminToken = await TokenModel.createAdmin({ name: 'admin' }, false);
                const input = { name: 'authorized-token' };
                const token = await TokenModel.create(input, true, adminToken.token);

                expect(token).toBeDefined();
                expect(token.name).toBe('authorized-token');
                expect(token.admin).toBe(false);
            });

            it('should generate unique tokens for each creation', async () => {
                const token1 = await TokenModel.create({ name: 'token1' }, false);
                const token2 = await TokenModel.create({ name: 'token2' }, false);

                expect(token1.token).not.toBe(token2.token);
            });

            it('should create token with all allowed special characters in name', async () => {
                const input = { name: 'test@_-/\\|&.:#$[]{}()' };
                const token = await TokenModel.create(input, false);

                expect(token.name).toBe('test@_-/\\|&.:#$[]{}()');
            });
        });

        describe('Validation failures', () => {
            it('should throw ValidationError for name that is too short', async () => {
                const input = { name: 'ab' };
                await expect(TokenModel.create(input, false)).rejects.toThrow(ValidationError);
            });

            it('should throw ValidationError for name that is too long', async () => {
                const input = { name: 'a'.repeat(201) };
                await expect(TokenModel.create(input, false)).rejects.toThrow(ValidationError);
            });

            it('should throw ValidationError for name with invalid characters', async () => {
                const input = { name: 'invalid name with spaces' };
                await expect(TokenModel.create(input, false)).rejects.toThrow(ValidationError);
            });

            it('should throw ValidationError for empty name', async () => {
                const input = { name: '' };
                await expect(TokenModel.create(input, false)).rejects.toThrow(ValidationError);
            });

            it('should throw ValidationError when name is not a string', async () => {
                const input = { name: 123 } as any;
                await expect(TokenModel.create(input, false)).rejects.toThrow(ValidationError);
            });
        });

        describe('Authorization failures', () => {
            it('should throw UnauthorizedError when checkAuthorization is true and no token provided', async () => {
                const input = { name: 'test' };
                await expect(TokenModel.create(input, true, null)).rejects.toThrow(UnauthorizedError);
            });

            it('should throw UnauthorizedError when checkAuthorization is true and invalid token provided', async () => {
                const input = { name: 'test' };
                await expect(TokenModel.create(input, true, 'invalid-token')).rejects.toThrow(UnauthorizedError);
            });

            it('should throw UnauthorizedError when checkAuthorization is true and expired token provided', async () => {
                const adminToken = await TokenModel.createAdmin({ name: 'admin' }, false);
                await TokenModel.expireAdmin({ token: adminToken.token }, false);
                const input = { name: 'test' };
                await expect(TokenModel.create(input, true, adminToken.token)).rejects.toThrow(UnauthorizedError);
            });

            it('should throw UnauthorizedError when non-admin token is used', async () => {
                const regularToken = await TokenModel.create({ name: 'regular' }, false);
                const input = { name: 'test' };
                await expect(TokenModel.create(input, true, regularToken.token)).rejects.toThrow(UnauthorizedError);
            });
        });
    });

    describe('createAdmin()', () => {
        describe('Success cases', () => {
            it('should create an admin token without authorization check', async () => {
                const input = { name: 'admin-token' };
                const token = await TokenModel.createAdmin(input, false);

                expect(token).toBeDefined();
                expect(token.name).toBe('admin-token');
                expect(token.admin).toBe(true);
                expect(token.expired).toBe(false);
                expect(token.token).toBeDefined();
                expect(token.token.length).toBe(128);
                expect(token.createdBy).toBe('anonymous');
                expect(token.updatedBy).toBe('anonymous');
            });

            it('should create admin token with custom creator when token provided', async () => {
                const firstAdmin = await TokenModel.createAdmin({ name: 'first-admin' }, false);
                const secondAdmin = await TokenModel.createAdmin({ name: 'second-admin' }, false, firstAdmin.token);

                expect(secondAdmin.createdBy).toBe(firstAdmin.token);
                expect(secondAdmin.updatedBy).toBe(firstAdmin.token);
            });

            it('should create admin token with authorization check when admin token provided', async () => {
                const firstAdmin = await TokenModel.createAdmin({ name: 'first-admin' }, false);
                const secondAdmin = await TokenModel.createAdmin({ name: 'second-admin' }, true, firstAdmin.token);

                expect(secondAdmin).toBeDefined();
                expect(secondAdmin.admin).toBe(true);
            });
        });

        describe('Validation failures', () => {
            it('should throw ValidationError for invalid name', async () => {
                const input = { name: 'ab' };
                await expect(TokenModel.createAdmin(input, false)).rejects.toThrow(ValidationError);
            });

            it('should throw ValidationError for name with spaces', async () => {
                const input = { name: 'admin token' };
                await expect(TokenModel.createAdmin(input, false)).rejects.toThrow(ValidationError);
            });
        });

        describe('Authorization failures', () => {
            it('should throw UnauthorizedError when checkAuthorization is true and no token provided', async () => {
                const input = { name: 'admin' };
                await expect(TokenModel.createAdmin(input, true, null)).rejects.toThrow(UnauthorizedError);
            });

            it('should throw UnauthorizedError when non-admin token is used', async () => {
                const regularToken = await TokenModel.create({ name: 'regular' }, false);
                const input = { name: 'new-admin' };
                await expect(TokenModel.createAdmin(input, true, regularToken.token)).rejects.toThrow(UnauthorizedError);
            });
        });
    });

    describe('expire()', () => {
        describe('Success cases', () => {
            it('should expire a regular token', async () => {
                const token = await TokenModel.create({ name: 'test' }, false);
                const expired = await TokenModel.expire({ token: token.token }, false);

                expect(expired).toBeDefined();
                expect(expired!.expired).toBe(true);
                expect(expired!.token).toBe(token.token);
                expect(expired!.updatedBy).toBe('anonymous');
            });

            it('should update updatedBy field when token provided', async () => {
                const adminToken = await TokenModel.createAdmin({ name: 'admin' }, false);
                const userToken = await TokenModel.create({ name: 'user' }, false);
                const expired = await TokenModel.expire({ token: userToken.token }, false, adminToken.token);

                expect(expired!.updatedBy).toBe(adminToken.token);
            });

            it('should expire regular token with admin authorization', async () => {
                const adminToken = await TokenModel.createAdmin({ name: 'admin' }, false);
                const userToken = await TokenModel.create({ name: 'user' }, false);
                const expired = await TokenModel.expire({ token: userToken.token }, true, adminToken.token);

                expect(expired).toBeDefined();
                expect(expired!.expired).toBe(true);
            });

            it('should return null when trying to expire non-existent token', async () => {
                const result = await TokenModel.expire({ token: 'non-existent' }, false);
                expect(result).toBeNull();
            });

            it('should return null when trying to expire already expired token', async () => {
                const token = await TokenModel.create({ name: 'test' }, false);
                await TokenModel.expire({ token: token.token }, false);
                const result = await TokenModel.expire({ token: token.token }, false);
                expect(result).toBeNull();
            });

            it('should not expire admin tokens with expire() method', async () => {
                const adminToken = await TokenModel.createAdmin({ name: 'admin' }, false);
                const result = await TokenModel.expire({ token: adminToken.token }, false);
                expect(result).toBeNull();

                // Verify token is still active
                const found = await TokenModel.findByToken({ token: adminToken.token }, false);
                expect(found).toBeDefined();
                expect(found!.expired).toBe(false);
            });
        });

        describe('Authorization failures', () => {
            it('should throw UnauthorizedError when checkAuthorization is true and no token provided', async () => {
                const userToken = await TokenModel.create({ name: 'user' }, false);
                await expect(TokenModel.expire({ token: userToken.token }, true, null)).rejects.toThrow(UnauthorizedError);
            });

            it('should throw UnauthorizedError when non-admin token is used', async () => {
                const regularToken = await TokenModel.create({ name: 'regular' }, false);
                const targetToken = await TokenModel.create({ name: 'target' }, false);
                await expect(TokenModel.expire({ token: targetToken.token }, true, regularToken.token)).rejects.toThrow(UnauthorizedError);
            });
        });
    });

    describe('expireAdmin()', () => {
        describe('Success cases', () => {
            it('should expire an admin token', async () => {
                const token = await TokenModel.createAdmin({ name: 'admin' }, false);
                const expired = await TokenModel.expireAdmin({ token: token.token }, false);

                expect(expired).toBeDefined();
                expect(expired!.expired).toBe(true);
                expect(expired!.admin).toBe(true);
                expect(expired!.updatedBy).toBe('anonymous');
            });

            it('should update updatedBy field when token provided', async () => {
                const admin1 = await TokenModel.createAdmin({ name: 'admin1' }, false);
                const admin2 = await TokenModel.createAdmin({ name: 'admin2' }, false);
                const expired = await TokenModel.expireAdmin({ token: admin2.token }, false, admin1.token);

                expect(expired!.updatedBy).toBe(admin1.token);
            });

            it('should return null when trying to expire non-existent token', async () => {
                const result = await TokenModel.expireAdmin({ token: 'non-existent' }, false);
                expect(result).toBeNull();
            });

            it('should return null when trying to expire already expired admin token', async () => {
                const token = await TokenModel.createAdmin({ name: 'admin' }, false);
                await TokenModel.expireAdmin({ token: token.token }, false);
                const result = await TokenModel.expireAdmin({ token: token.token }, false);
                expect(result).toBeNull();
            });

            it('should not expire regular tokens with expireAdmin() method', async () => {
                const regularToken = await TokenModel.create({ name: 'user' }, false);
                const result = await TokenModel.expireAdmin({ token: regularToken.token }, false);
                expect(result).toBeNull();

                // Verify token is still active
                const found = await TokenModel.findByToken({ token: regularToken.token }, false);
                expect(found).toBeDefined();
                expect(found!.expired).toBe(false);
            });
        });

        describe('Authorization failures', () => {
            it('should throw UnauthorizedError when checkAuthorization is true and no token provided', async () => {
                const adminToken = await TokenModel.createAdmin({ name: 'admin' }, false);
                await expect(TokenModel.expireAdmin({ token: adminToken.token }, true, null)).rejects.toThrow(UnauthorizedError);
            });
        });
    });

    describe('findByToken()', () => {
        describe('Success cases', () => {
            it('should find an active regular token', async () => {
                const created = await TokenModel.create({ name: 'test' }, false);
                const found = await TokenModel.findByToken({ token: created.token }, false);

                expect(found).toBeDefined();
                expect(found!.token).toBe(created.token);
                expect(found!.name).toBe('test');
                expect(found!.admin).toBe(false);
                expect(found!.expired).toBe(false);
            });

            it('should find an active admin token', async () => {
                const created = await TokenModel.createAdmin({ name: 'admin' }, false);
                const found = await TokenModel.findByToken({ token: created.token }, false);

                expect(found).toBeDefined();
                expect(found!.admin).toBe(true);
            });

            it('should return null for non-existent token', async () => {
                const found = await TokenModel.findByToken({ token: 'non-existent' }, false);
                expect(found).toBeNull();
            });

            it('should return null for expired token', async () => {
                const token = await TokenModel.create({ name: 'test' }, false);
                await TokenModel.expire({ token: token.token }, false);
                const found = await TokenModel.findByToken({ token: token.token }, false);
                expect(found).toBeNull();
            });

            it('should find token with admin authorization', async () => {
                const adminToken = await TokenModel.createAdmin({ name: 'admin' }, false);
                const userToken = await TokenModel.create({ name: 'user' }, false);
                const found = await TokenModel.findByToken({ token: userToken.token }, true, adminToken.token);

                expect(found).toBeDefined();
                expect(found!.token).toBe(userToken.token);
            });
        });

        describe('Authorization failures', () => {
            it('should throw UnauthorizedError when checkAuthorization is true and no token provided', async () => {
                const token = await TokenModel.create({ name: 'test' }, false);
                await expect(TokenModel.findByToken({ token: token.token }, true, null)).rejects.toThrow(UnauthorizedError);
            });

            it('should throw UnauthorizedError when non-admin token is used', async () => {
                const regularToken = await TokenModel.create({ name: 'regular' }, false);
                const targetToken = await TokenModel.create({ name: 'target' }, false);
                await expect(TokenModel.findByToken({ token: targetToken.token }, true, regularToken.token)).rejects.toThrow(UnauthorizedError);
            });
        });
    });

    describe('deleteAll()', () => {
        describe('Success cases', () => {
            it('should delete all tokens', async () => {
                await TokenModel.create({ name: 'token1' }, false);
                await TokenModel.create({ name: 'token2' }, false);
                await TokenModel.createAdmin({ name: 'admin' }, false);

                await TokenModel.deleteAll(false);

                const count = await DatabaseTokenModel.countDocuments();
                expect(count).toBe(0);
            });

            it('should delete all tokens with admin authorization', async () => {
                const adminToken = await TokenModel.createAdmin({ name: 'admin' }, false);
                await TokenModel.create({ name: 'token1' }, false);
                await TokenModel.create({ name: 'token2' }, false);

                await TokenModel.deleteAll(true, adminToken.token);

                const count = await DatabaseTokenModel.countDocuments();
                expect(count).toBe(0);
            });

            it('should succeed even when there are no tokens', async () => {
                await TokenModel.deleteAll(false);
                const count = await DatabaseTokenModel.countDocuments();
                expect(count).toBe(0);
            });
        });

        describe('Authorization failures', () => {
            it('should throw UnauthorizedError when checkAuthorization is true and no token provided', async () => {
                await expect(TokenModel.deleteAll(true, null)).rejects.toThrow(UnauthorizedError);
            });

            it('should throw UnauthorizedError when non-admin token is used', async () => {
                const regularToken = await TokenModel.create({ name: 'regular' }, false);
                await expect(TokenModel.deleteAll(true, regularToken.token)).rejects.toThrow(UnauthorizedError);
            });
        });
    });

    describe('checkAuthorization()', () => {
        describe('Valid authorization cases', () => {
            it('should pass when valid admin token provided and requireAdmin is true', async () => {
                const adminToken = await TokenModel.createAdmin({ name: 'admin' }, false);
                await expect(TokenModel.checkAuthorization(adminToken.token, true)).resolves.not.toThrow();
            });

            it('should pass when valid admin token provided and requireAdmin is false', async () => {
                const adminToken = await TokenModel.createAdmin({ name: 'admin' }, false);
                await expect(TokenModel.checkAuthorization(adminToken.token, false)).resolves.not.toThrow();
            });

            it('should pass when valid regular token provided and requireAdmin is false', async () => {
                const regularToken = await TokenModel.create({ name: 'regular' }, false);
                await expect(TokenModel.checkAuthorization(regularToken.token, false)).resolves.not.toThrow();
            });
        });

        describe('Invalid authorization cases', () => {
            it('should throw UnauthorizedError when null token provided', async () => {
                await expect(TokenModel.checkAuthorization(null, false)).rejects.toThrow(UnauthorizedError);
            });

            it('should throw UnauthorizedError when null token provided and requireAdmin is true', async () => {
                await expect(TokenModel.checkAuthorization(null, true)).rejects.toThrow(UnauthorizedError);
            });

            it('should throw UnauthorizedError when invalid token provided', async () => {
                await expect(TokenModel.checkAuthorization('invalid-token', false)).rejects.toThrow(UnauthorizedError);
            });

            it('should throw UnauthorizedError when non-existent token provided', async () => {
                await expect(TokenModel.checkAuthorization('a'.repeat(128), false)).rejects.toThrow(UnauthorizedError);
            });

            it('should throw UnauthorizedError when expired token provided', async () => {
                const token = await TokenModel.create({ name: 'test' }, false);
                await TokenModel.expire({ token: token.token }, false);
                await expect(TokenModel.checkAuthorization(token.token, false)).rejects.toThrow(UnauthorizedError);
            });

            it('should throw UnauthorizedError when expired admin token provided', async () => {
                const adminToken = await TokenModel.createAdmin({ name: 'admin' }, false);
                await TokenModel.expireAdmin({ token: adminToken.token }, false);
                await expect(TokenModel.checkAuthorization(adminToken.token, true)).rejects.toThrow(UnauthorizedError);
            });

            it('should throw UnauthorizedError when regular token provided and requireAdmin is true', async () => {
                const regularToken = await TokenModel.create({ name: 'regular' }, false);
                await expect(TokenModel.checkAuthorization(regularToken.token, true)).rejects.toThrow(UnauthorizedError);
            });

            it('should throw UnauthorizedError when empty string token provided', async () => {
                await expect(TokenModel.checkAuthorization('', false)).rejects.toThrow(UnauthorizedError);
            });
        });

        describe('Error message validation', () => {
            it('should throw UnauthorizedError with default message', async () => {
                try {
                    await TokenModel.checkAuthorization(null, false);
                    fail('Expected UnauthorizedError to be thrown');
                } catch (error) {
                    expect(error).toBeInstanceOf(UnauthorizedError);
                    expect((error as UnauthorizedError).message).toBe('Unauthorized');
                    expect((error as UnauthorizedError).httpCode).toBe('401');
                    expect((error as UnauthorizedError).code).toBe('UNAUTHORIZED');
                }
            });
        });

        describe('Edge cases', () => {
            it('should handle rapid sequential authorization checks', async () => {
                const adminToken = await TokenModel.createAdmin({ name: 'admin' }, false);

                const checks = Array(10).fill(null).map(() =>
                    TokenModel.checkAuthorization(adminToken.token, true)
                );

                await expect(Promise.all(checks)).resolves.not.toThrow();
            });

            it('should correctly identify admin status after multiple tokens created', async () => {
                await TokenModel.create({ name: 'user1' }, false);
                await TokenModel.create({ name: 'user2' }, false);
                const adminToken = await TokenModel.createAdmin({ name: 'admin' }, false);
                await TokenModel.create({ name: 'user3' }, false);

                await expect(TokenModel.checkAuthorization(adminToken.token, true)).resolves.not.toThrow();
            });

            it('should fail authorization for token that was created then expired', async () => {
                const token = await TokenModel.create({ name: 'test' }, false);
                await expect(TokenModel.checkAuthorization(token.token, false)).resolves.not.toThrow();

                await TokenModel.expire({ token: token.token }, false);
                await expect(TokenModel.checkAuthorization(token.token, false)).rejects.toThrow(UnauthorizedError);
            });
        });
    });

    describe('Integration tests', () => {
        it('should handle complete token lifecycle', async () => {
            // Create admin token
            const adminToken = await TokenModel.createAdmin({ name: 'admin' }, false);
            expect(adminToken.admin).toBe(true);

            // Create regular token using admin
            const userToken = await TokenModel.create({ name: 'user' }, true, adminToken.token);
            expect(userToken.admin).toBe(false);

            // Find the user token
            const found = await TokenModel.findByToken({ token: userToken.token }, true, adminToken.token);
            expect(found).toBeDefined();

            // Expire the user token
            const expired = await TokenModel.expire({ token: userToken.token }, true, adminToken.token);
            expect(expired!.expired).toBe(true);

            // Verify token is no longer findable
            const notFound = await TokenModel.findByToken({ token: userToken.token }, false);
            expect(notFound).toBeNull();
        });

        it('should maintain token uniqueness across many creations', async () => {
            const tokens = await Promise.all(
                Array(50).fill(null).map((_, i) =>
                    TokenModel.create({ name: `token${i}` }, false)
                )
            );

            const tokenStrings = tokens.map(t => t.token);
            const uniqueTokens = new Set(tokenStrings);
            expect(uniqueTokens.size).toBe(50);
        });

        it('should properly isolate admin and regular token operations', async () => {
            const admin = await TokenModel.createAdmin({ name: 'admin' }, false);
            const regular = await TokenModel.create({ name: 'regular' }, false);

            // Expire should not affect admin
            const expireRegularResult = await TokenModel.expire({ token: admin.token }, false);
            expect(expireRegularResult).toBeNull();

            // ExpireAdmin should not affect regular
            const expireAdminResult = await TokenModel.expireAdmin({ token: regular.token }, false);
            expect(expireAdminResult).toBeNull();

            // Both should still be findable
            const foundAdmin = await TokenModel.findByToken({ token: admin.token }, false);
            const foundRegular = await TokenModel.findByToken({ token: regular.token }, false);
            expect(foundAdmin).toBeDefined();
            expect(foundRegular).toBeDefined();
        });
    });
});

import TokenModel from '../../src/model/TokenModel';
import DatabaseTokenModel from '../../src/database/TokenModel';
import UnauthorizedError from '../../src/model/errors/UnauthorizedError';
import InternalServerError from '../../src/model/errors/InternalServerError';
import { ValidationError } from 'apollo-server-core';
import DuplicateEntryError from '../../src/model/errors/DuplicaException';
import bcrypt from 'bcrypt';
import DatabaseConnection from '../../src/database/DatabaseConnection';

describe('TokenModel', () => {

    beforeAll(async () => {
        await DatabaseConnection.enableTestMemoryServer();
        await DatabaseConnection.getInstance().connect();
    });

    afterAll(async () => {
        await DatabaseConnection.getInstance().disconnect();
    });

    beforeEach(async () => {
        await DatabaseTokenModel.getModel().deleteMany();
    });

    describe('create', () => {
        it('should successfully create a token with valid input', async () => {
            const input = { name: 'test-token' };
            const result = await TokenModel.create(input, true);

            expect(result).toBeDefined();
            expect(result.token).toBeDefined();
            expect(result.authorizationToken).toBeDefined();
            expect(result.token.name).toBe('test-token');
            expect(result.token.expired).toBe(false);
            expect(result.token.expiredOnDateTime).toBeNull();
            expect(result.token.password).toBeDefined();
        });



        it('should generate unique passwords for different tokens', async () => {
            const result1 = await TokenModel.create({ name: 'token1' }, true);
            const result2 = await TokenModel.create({ name: 'token2' }, true);

            expect(result1.token.password).not.toBe(result2.token.password);
        });

        it('should hash the password in the database', async () => {
            const result = await TokenModel.create({ name: 'test-token' }, true);

            // Password in the token should be a bcrypt hash
            expect(result.token.password).toMatch(/^\$2[aby]\$/);
            expect(result.token.password.length).toBeGreaterThan(50);
        });

        it('should generate valid authorization token format', async () => {
            const result = await TokenModel.create({ name: 'test-token' }, true);

            const parts = result.authorizationToken.split(':');
            expect(parts).toHaveLength(3);

            // Verify all parts are base64 encoded
            parts.forEach(part => {
                expect(() => Buffer.from(part, 'base64')).not.toThrow();
            });
        });

        it('should allow token names with alphanumeric characters', async () => {
            const result = await TokenModel.create({ name: 'test123' }, true);
            expect(result.token.name).toBe('test123');
        });

        it('should allow token names with allowed special characters', async () => {
            const result = await TokenModel.create({ name: 'test_token-123@domain' }, true);
            expect(result.token.name).toBe('test_token-123@domain');
        });

        it('should throw ValidationError for names shorter than 3 characters', async () => {
            await expect(TokenModel.create({ name: 'ab' }, true))
                .rejects
                .toThrow(ValidationError);
        });

        it('should throw ValidationError for empty name', async () => {
            await expect(TokenModel.create({ name: '' }, true))
                .rejects
                .toThrow(ValidationError);
        });

        it('should throw ValidationError for names longer than 200 characters', async () => {
            const longName = 'a'.repeat(201);
            await expect(TokenModel.create({ name: longName }, true))
                .rejects
                .toThrow(ValidationError);
        });

        it('should throw ValidationError for names with invalid characters', async () => {
            await expect(TokenModel.create({ name: 'test token!' }, true))
                .rejects
                .toThrow(ValidationError);
        });

        it('should throw ValidationError for names with spaces', async () => {
            await expect(TokenModel.create({ name: 'test token' }, true))
                .rejects
                .toThrow(ValidationError);
        });

        it('should throw DuplicateEntryError when creating a token with a duplicate name', async () => {
            const tokenName = 'duplicate-token-name';

            // Create first token
            await TokenModel.create({ name: tokenName }, true);

            // Attempt to create second token with same name
            await expect(TokenModel.create({ name: tokenName }, true))
                .rejects
                .toThrow(DuplicateEntryError);
        });

        it('should throw DuplicateEntryError with descriptive message for duplicate name', async () => {
            const tokenName = 'duplicate-token-name-2';

            // Create first token
            await TokenModel.create({ name: tokenName }, true);

            // Attempt to create second token with same name
            await expect(TokenModel.create({ name: tokenName }, true))
                .rejects
                .toThrow(`Token with name '${tokenName}' already exists`);
        });

        it('should persist token to database', async () => {
            const result = await TokenModel.create({ name: 'test-token' }, true);

            const dbToken = await DatabaseTokenModel.getModel().findOne({ name: result.token.name });
            expect(dbToken).toBeDefined();
            expect(dbToken?.name).toBe('test-token');
        });

        it('should create authorization token that can be verified', async () => {
            const result = await TokenModel.create({ name: 'test-token' }, true);

            // Should not throw
            await expect(TokenModel.checkAuthorization(result.authorizationToken))
                .resolves
                .not.toThrow();
        });
    });

    describe('expire', () => {
        it('should successfully expire a non-expired token', async () => {
            const created = await TokenModel.create({ name: 'test-token' }, true);

            const expired = await TokenModel.expire({ name: created.token.name }, true);

            expect(expired).toBeDefined();
            expect(expired?.expired).toBe(true);
            expect(expired?.expiredOnDateTime).toBeInstanceOf(Date);
        });

        it('should not expire already expired tokens', async () => {
            const created = await TokenModel.create({ name: 'test-token' }, true);

            // Expire first time
            await TokenModel.expire({ name: created.token.name }, true);

            // Attempt to expire again
            const result = await TokenModel.expire({ name: created.token.name }, true);

            expect(result).toBeNull();
        });

        it('should return null for non-existent tokens', async () => {
            const result = await TokenModel.expire({ name: 'non-existent-name' }, true);
            expect(result).toBeNull();
        });

        it('should set expiredOnDateTime when expiring', async () => {
            const created = await TokenModel.create({ name: 'test-token' }, true);
            const beforeExpire = new Date();

            const expired = await TokenModel.expire({ name: created.token.name }, true);
            const afterExpire = new Date();

            expect(expired?.expiredOnDateTime).toBeDefined();
            expect(expired!.expiredOnDateTime!.getTime()).toBeGreaterThanOrEqual(beforeExpire.getTime());
            expect(expired!.expiredOnDateTime!.getTime()).toBeLessThanOrEqual(afterExpire.getTime());
        });

        it('should persist expiration to database', async () => {
            const created = await TokenModel.create({ name: 'test-token' }, true);

            await TokenModel.expire({ name: created.token.name }, true);

            const dbToken = await DatabaseTokenModel.getModel().findOne({ name: created.token.name });
            expect(dbToken?.expired).toBe(true);
        });
    });

    describe('delete', () => {
        it('should successfully delete an expired token by name', async () => {
            const created = await TokenModel.create({ name: 'test-token' }, true);
            await TokenModel.expire({ name: 'test-token' }, true);

            const result = await TokenModel.delete({ name: created.token.name }, true);

            expect(result).toBe(true);

            const dbToken = await DatabaseTokenModel.getModel().findOne({ name: created.token.name });
            expect(dbToken).toBeNull();
        });

        it('should return false when token does not exist', async () => {
            const result = await TokenModel.delete({ name: 'non-existent-token' }, true);

            expect(result).toBe(false);
        });

        it('should return false when trying to delete a not expired token', async () => {
            const created = await TokenModel.create({ name: 'test-token' }, true);

            const result = await TokenModel.delete({ name: created.token.name }, true);

            expect(result).toBe(false);

            // Token should still exist in database (just expired)
            const dbToken = await DatabaseTokenModel.getModel().findOne({ name: created.token.name });
            expect(dbToken).toBeDefined();
            expect(dbToken?.expired).toBe(false);
        });

        it('should only delete expired tokens', async () => {
            const active = await TokenModel.create({ name: 'active-token' }, true);
            const expired = await TokenModel.create({ name: 'expired-token' }, true);
            await TokenModel.expire({ name: expired.token.name }, true);

            // Should successfully delete expired token
            const result1 = await TokenModel.delete({ name: expired.token.name }, true);
            expect(result1).toBe(true);

            // Should fail to delete active token
            const result2 = await TokenModel.delete({ name: active.token.name }, true);
            expect(result2).toBe(false);

            // Verify database state
            const activeToken = await DatabaseTokenModel.getModel().findOne({ name: active.token.name });
            const expiredToken = await DatabaseTokenModel.getModel().findOne({ name: expired.token.name });
            expect(activeToken).toBeDefined();
            expect(expiredToken).toBeNull();
        });

        it('should throw InternalServerError when called without required argument', async () => {
            const created = await TokenModel.create({ name: 'test-token' }, true);

            await expect(TokenModel.delete({ name: created.token.name }, false))
                .rejects
                .toThrow(InternalServerError);

            await expect(TokenModel.delete({ name: created.token.name }, false))
                .rejects
                .toThrow('This method is internal.');
        });

        it('should throw InternalServerError when called with no argument', async () => {
            await expect((TokenModel.delete as any)({ name: 'test' }))
                .rejects
                .toThrow(InternalServerError);
        });

        it('should persist deletion to database', async () => {
            const created = await TokenModel.create({ name: 'test-token' }, true);
            await TokenModel.expire({ name: created.token.name }, true);

            await TokenModel.delete({ name: created.token.name }, true);

            const dbToken = await DatabaseTokenModel.getModel().findOne({ name: created.token.name });
            expect(dbToken).toBeNull();
        });

        it('should return true only when exactly one token is deleted', async () => {
            const created = await TokenModel.create({ name: 'test-token' }, true);
            await TokenModel.expire({ name: created.token.name }, true);

            const result = await TokenModel.delete({ name: created.token.name }, true);

            expect(result).toBe(true);

            // Attempting to delete again should return false
            const secondResult = await TokenModel.delete({ name: created.token.name }, true);
            expect(secondResult).toBe(false);
        });

        it('should not delete other tokens with different names', async () => {
            await TokenModel.create({ name: 'token1' }, true);
            await TokenModel.expire({ name: 'token1' }, true);
            await TokenModel.create({ name: 'token2' }, true);
            await TokenModel.expire({ name: 'token2' }, true);
            await TokenModel.create({ name: 'token3' }, true);
            await TokenModel.expire({ name: 'token3' }, true);

            await TokenModel.delete({ name: 'token2' }, true);

            const token1 = await DatabaseTokenModel.getModel().findOne({ name: 'token1' });
            const token2 = await DatabaseTokenModel.getModel().findOne({ name: 'token2' });
            const token3 = await DatabaseTokenModel.getModel().findOne({ name: 'token3' });

            expect(token1).toBeDefined();
            expect(token2).toBeNull();
            expect(token3).toBeDefined();
        });

        it('should handle deletion of token with special characters in name', async () => {
            const specialName = 'test@token_123-#$./';
            await TokenModel.create({ name: specialName }, true);
            await TokenModel.expire({ name: specialName }, true);

            const result = await TokenModel.delete({ name: specialName }, true);

            expect(result).toBe(true);

            const dbToken = await DatabaseTokenModel.getModel().findOne({ name: specialName });
            expect(dbToken).toBeNull();
        });
    });

    describe('deleteAll', () => {
        it('should delete all tokens', async () => {
            await TokenModel.create({ name: 'token1' }, true);
            await TokenModel.create({ name: 'token2' }, true);
            await TokenModel.create({ name: 'token3' }, true);

            await TokenModel.deleteAll(true);

            const count = await DatabaseTokenModel.getModel().countDocuments();
            expect(count).toBe(0);
        });

        it('should work when no tokens exist', async () => {
            await expect(TokenModel.deleteAll(true)).resolves.not.toThrow();
        });

        it('should delete both expired and non-expired tokens', async () => {
            const token1 = await TokenModel.create({ name: 'token1' }, true);
            await TokenModel.create({ name: 'token2' }, true);
            await TokenModel.expire({ name: token1.token.name }, true);

            await TokenModel.deleteAll(true);

            const count = await DatabaseTokenModel.getModel().countDocuments();
            expect(count).toBe(0);
        });
    });

    describe('deleteExpired', () => {
        it('should delete only expired tokens', async () => {
            const token1 = await TokenModel.create({ name: 'token1' }, true);
            await TokenModel.create({ name: 'token2' }, true);
            const token3 = await TokenModel.create({ name: 'token3' }, true);

            // Expire tokens 1 and 3
            await TokenModel.expire({ name: token1.token.name }, true);
            await TokenModel.expire({ name: token3.token.name }, true);

            await TokenModel.deleteAllExpired(true);

            const remainingTokens = await DatabaseTokenModel.getModel().find({});
            expect(remainingTokens).toHaveLength(1);
            expect(remainingTokens[0].name).toBe('token2');
            expect(remainingTokens[0].expired).toBe(false);
        });

        it('should not delete non-expired tokens', async () => {
            await TokenModel.create({ name: 'active-token1' }, true);
            await TokenModel.create({ name: 'active-token2' }, true);

            await TokenModel.deleteAllExpired(true);

            const count = await DatabaseTokenModel.getModel().countDocuments();
            expect(count).toBe(2);
        });

        it('should work when no expired tokens exist', async () => {
            await TokenModel.create({ name: 'token1' }, true);
            await TokenModel.create({ name: 'token2' }, true);

            await expect(TokenModel.deleteAllExpired(true)).resolves.not.toThrow();

            const count = await DatabaseTokenModel.getModel().countDocuments();
            expect(count).toBe(2);
        });

        it('should work when no tokens exist at all', async () => {
            await expect(TokenModel.deleteAllExpired(true)).resolves.not.toThrow();

            const count = await DatabaseTokenModel.getModel().countDocuments();
            expect(count).toBe(0);
        });

        it('should delete all tokens when all are expired', async () => {
            const token1 = await TokenModel.create({ name: 'token1' }, true);
            const token2 = await TokenModel.create({ name: 'token2' }, true);
            const token3 = await TokenModel.create({ name: 'token3' }, true);

            await TokenModel.expire({ name: token1.token.name }, true);
            await TokenModel.expire({ name: token2.token.name }, true);
            await TokenModel.expire({ name: token3.token.name }, true);

            await TokenModel.deleteAllExpired(true);

            const count = await DatabaseTokenModel.getModel().countDocuments();
            expect(count).toBe(0);
        });

        it('should delete multiple expired tokens while keeping active ones', async () => {
            const expired1 = await TokenModel.create({ name: 'expired1' }, true);
            await TokenModel.create({ name: 'active1' }, true);
            const expired2 = await TokenModel.create({ name: 'expired2' }, true);
            await TokenModel.create({ name: 'active2' }, true);
            const expired3 = await TokenModel.create({ name: 'expired3' }, true);

            await TokenModel.expire({ name: expired1.token.name }, true);
            await TokenModel.expire({ name: expired2.token.name }, true);
            await TokenModel.expire({ name: expired3.token.name }, true);

            await TokenModel.deleteAllExpired(true);

            const remainingTokens = await DatabaseTokenModel.getModel().find({});
            expect(remainingTokens).toHaveLength(2);
            expect(remainingTokens.map(t => t.name)).toEqual(
                expect.arrayContaining(['active1', 'active2'])
            );
            expect(remainingTokens.every(t => !t.expired)).toBe(true);
        });

        it('should throw InternalServerError when called without required argument', async () => {
            await expect(TokenModel.deleteAllExpired(false))
                .rejects
                .toThrow(InternalServerError);

            await expect(TokenModel.deleteAllExpired(false))
                .rejects
                .toThrow('This method is internal.');
        });

        it('should throw InternalServerError when called with no argument', async () => {
            await expect((TokenModel.deleteAllExpired as any)())
                .rejects
                .toThrow(InternalServerError);
        });

        it('should not affect token count when only active tokens exist', async () => {
            await TokenModel.create({ name: 'active1' }, true);
            await TokenModel.create({ name: 'active2' }, true);
            await TokenModel.create({ name: 'active3' }, true);

            const beforeCount = await DatabaseTokenModel.getModel().countDocuments();

            await TokenModel.deleteAllExpired(true);

            const afterCount = await DatabaseTokenModel.getModel().countDocuments();
            expect(afterCount).toBe(beforeCount);
            expect(afterCount).toBe(3);
        });

        it('should persist deletion to database', async () => {
            const token = await TokenModel.create({ name: 'test-token' }, true);
            await TokenModel.expire({ name: token.token.name }, true);

            await TokenModel.deleteAllExpired(true);

            const dbToken = await DatabaseTokenModel.getModel().findOne({ name: token.token.name });
            expect(dbToken).toBeNull();
        });
    });

    describe('findAll', () => {
        it('should return all tokens when multiple exist', async () => {
            await TokenModel.create({ name: 'token1' }, true);
            await TokenModel.create({ name: 'token2' }, true);
            await TokenModel.create({ name: 'token3' }, true);

            const tokens = await TokenModel.findAll(true);

            expect(tokens).toHaveLength(3);
            expect(tokens.map(t => t.name)).toEqual(
                expect.arrayContaining(['token1', 'token2', 'token3'])
            );
        });

        it('should return empty array when no tokens exist', async () => {
            const tokens = await TokenModel.findAll(true);

            expect(tokens).toEqual([]);
            expect(tokens).toHaveLength(0);
        });

        it('should include both expired and non-expired tokens', async () => {
            await TokenModel.create({ name: 'active-token' }, true);
            const expiredToken = await TokenModel.create({ name: 'expired-token' }, true);
            await TokenModel.expire({ name: expiredToken.token.name }, true);

            const tokens = await TokenModel.findAll(true);

            expect(tokens).toHaveLength(2);
            expect(tokens.find(t => t.name === 'active-token')?.expired).toBe(false);
            expect(tokens.find(t => t.name === 'expired-token')?.expired).toBe(true);
        });

        it('should sort tokens by expiredOnDateTime in ascending order', async () => {
            const token1 = await TokenModel.create({ name: 'token1' }, true);
            await new Promise(resolve => setTimeout(resolve, 10));
            const token2 = await TokenModel.create({ name: 'token2' }, true);
            await new Promise(resolve => setTimeout(resolve, 10));
            const token3 = await TokenModel.create({ name: 'token3' }, true);

            // Expire tokens in specific order
            await TokenModel.expire({ name: token3.token.name }, true);
            await new Promise(resolve => setTimeout(resolve, 10));
            await TokenModel.expire({ name: token1.token.name }, true);

            const tokens = await TokenModel.findAll(true);

            expect(tokens).toHaveLength(3);

            // token2 never expired, so expiredOnDateTime is null (should be first)
            // token3 expired first (should be second)
            // token1 expired last (should be third)
            expect(tokens[0].name).toBe('token2');
            expect(tokens[0].expiredOnDateTime).toBeNull();
            expect(tokens[1].name).toBe('token3');
            expect(tokens[2].name).toBe('token1');
        });

        it('should place non-expired tokens first when sorting by expiredOnDateTime', async () => {
            const expired1 = await TokenModel.create({ name: 'expired1' }, true);
            await TokenModel.create({ name: 'active1' }, true);
            const expired2 = await TokenModel.create({ name: 'expired2' }, true);
            await TokenModel.create({ name: 'active2' }, true);

            await TokenModel.expire({ name: expired1.token.name }, true);
            await TokenModel.expire({ name: expired2.token.name }, true);

            const tokens = await TokenModel.findAll(true);

            expect(tokens).toHaveLength(4);

            // Non-expired tokens (null expiredOnDateTime) should appear first
            expect(tokens[0].expiredOnDateTime).toBeNull();
            expect(tokens[1].expiredOnDateTime).toBeNull();
            expect(tokens[2].expiredOnDateTime).not.toBeNull();
            expect(tokens[3].expiredOnDateTime).not.toBeNull();
        });

        it('should throw InternalServerError when called without required argument', async () => {
            await expect(TokenModel.findAll(false))
                .rejects
                .toThrow(InternalServerError);

            await expect(TokenModel.findAll(false))
                .rejects
                .toThrow('This method is internal.');
        });

        it('should throw InternalServerError when called with no argument', async () => {
            await expect((TokenModel.findAll as any)())
                .rejects
                .toThrow(InternalServerError);
        });

        it('should return tokens with all required properties', async () => {
            await TokenModel.create({ name: 'test-token' }, true);

            const tokens = await TokenModel.findAll(true);

            expect(tokens).toHaveLength(1);
            expect(tokens[0]).toHaveProperty('name');
            expect(tokens[0]).toHaveProperty('password');
            expect(tokens[0]).toHaveProperty('expired');
            expect(tokens[0]).toHaveProperty('expiredOnDateTime');
        });

        it('should return lean query results (plain objects)', async () => {
            await TokenModel.create({ name: 'test-token' }, true);

            const tokens = await TokenModel.findAll(true);

            expect(tokens).toHaveLength(1);
            // Lean results should be plain objects, not Mongoose documents
            expect(tokens[0].constructor.name).toBe('Object');
        });

        it('should handle large number of tokens', async () => {
            const tokenPromises = Array.from({ length: 50 }, (_, i) =>
                TokenModel.create({ name: `token-${i}` }, true)
            );
            await Promise.all(tokenPromises);

            const tokens = await TokenModel.findAll(true);

            expect(tokens).toHaveLength(50);
        });

        it('should maintain correct expiration status for all tokens', async () => {
            const token1 = await TokenModel.create({ name: 'token1' }, true);
            await TokenModel.create({ name: 'token2' }, true);
            const token3 = await TokenModel.create({ name: 'token3' }, true);

            await TokenModel.expire({ name: token1.token.name }, true);
            await TokenModel.expire({ name: token3.token.name }, true);

            const tokens = await TokenModel.findAll(true);

            expect(tokens).toHaveLength(3);
            expect(tokens.filter(t => t.expired)).toHaveLength(2);
            expect(tokens.filter(t => !t.expired)).toHaveLength(1);
        });
    });

    describe('checkAuthorization', () => {
        it('should pass for valid authorization token', async () => {
            const created = await TokenModel.create({ name: 'test-token' }, true);

            await expect(TokenModel.checkAuthorization(created.authorizationToken))
                .resolves
                .not.toThrow();
        });

        it('should throw UnauthorizedError for null token', async () => {
            await expect(TokenModel.checkAuthorization(null))
                .rejects
                .toThrow(UnauthorizedError);
        });

        it('should throw UnauthorizedError for empty string token', async () => {
            await expect(TokenModel.checkAuthorization(''))
                .rejects
                .toThrow(UnauthorizedError);
        });

        it('should throw UnauthorizedError for malformed token (wrong number of parts)', async () => {
            await expect(TokenModel.checkAuthorization('invalid:token'))
                .rejects
                .toThrow(UnauthorizedError);
        });

        it('should throw UnauthorizedError for invalid base64', async () => {
            await expect(TokenModel.checkAuthorization('!!!:!!!:!!!:!!!'))
                .rejects
                .toThrow(UnauthorizedError);
        });

        it('should throw UnauthorizedError for expired token', async () => {
            const created = await TokenModel.create({ name: 'test-token' }, true);
            await TokenModel.expire({ name: created.token.name }, true);

            await expect(TokenModel.checkAuthorization(created.authorizationToken))
                .rejects
                .toThrow(UnauthorizedError);
        });

        it('should throw UnauthorizedError for non-existent name', async () => {
            const created = await TokenModel.create({ name: 'test-token' }, true);

            // Delete the token from database
            await DatabaseTokenModel.getModel().deleteOne({ name: created.token.name });

            await expect(TokenModel.checkAuthorization(created.authorizationToken))
                .rejects
                .toThrow(UnauthorizedError);
        });

        it('should throw UnauthorizedError for tampered HMAC', async () => {
            const created = await TokenModel.create({ name: 'test-token' }, true);

            // Tamper with the HMAC part
            const parts = created.authorizationToken.split(':');
            parts[2] = Buffer.from('tampered-hmac').toString('base64');
            const tamperedToken = parts.join(':');

            await expect(TokenModel.checkAuthorization(tamperedToken))
                .rejects
                .toThrow(UnauthorizedError);
        });

        it('should throw UnauthorizedError for tampered password', async () => {
            const created = await TokenModel.create({ name: 'test-token' }, true);

            // Tamper with the password part
            const parts = created.authorizationToken.split(':');
            parts[1] = Buffer.from('wrong-password').toString('base64');
            const tamperedToken = parts.join(':');

            await expect(TokenModel.checkAuthorization(tamperedToken))
                .rejects
                .toThrow(UnauthorizedError);
        });

        it('should throw UnauthorizedError when password does not match hash', async () => {
            const created = await TokenModel.create({ name: 'test-token' }, true);

            // Change the password in the database
            await DatabaseTokenModel.getModel().findOneAndUpdate(
                { name: created.token.name },
                { password: await bcrypt.hash('different-password', 10) }
            );

            await expect(TokenModel.checkAuthorization(created.authorizationToken))
                .rejects
                .toThrow(UnauthorizedError);
        });

        it('should validate HMAC signature correctly', async () => {
            const created = await TokenModel.create({ name: 'test-token' }, true);

            // Create a new token with same parts but different HMAC
            const parts = created.authorizationToken.split(':');
            const wrongHmac = Buffer.from('completely-wrong').toString('base64');
            const tokenWithWrongHmac = `${parts[0]}:${parts[1]}:${wrongHmac}`;

            await expect(TokenModel.checkAuthorization(tokenWithWrongHmac))
                .rejects
                .toThrow(UnauthorizedError);
        });

        it('should be case-sensitive for password validation', async () => {
            const created = await TokenModel.create({ name: 'test-token' }, true);

            // Decode and modify password casing
            const parts = created.authorizationToken.split(':');
            const password = Buffer.from(parts[1], 'base64').toString('utf-8');
            const modifiedPassword = password.toUpperCase();
            parts[1] = Buffer.from(modifiedPassword).toString('base64');
            const modifiedToken = parts.join(':');

            await expect(TokenModel.checkAuthorization(modifiedToken))
                .rejects
                .toThrow(UnauthorizedError);
        });

        it('should throw InternalServerError when APP_SECRET is missing', async () => {
            const created = await TokenModel.create({ name: 'test-token' }, true);
            const originalSecret = process.env.APP_SECRET;
            delete process.env.APP_SECRET;

            await expect(TokenModel.checkAuthorization(created.authorizationToken))
                .rejects
                .toThrow(InternalServerError);

            process.env.APP_SECRET = originalSecret;
        });
    });

    describe('getNameFromAuthorizationToken', () => {
        it('should return correct name for valid token', async () => {
            const created = await TokenModel.create({ name: 'test-token-name' }, true);

            const name = TokenModel.getNameFromAuthorizationToken(created.authorizationToken);

            expect(name).toBe('test-token-name');
        });

        it('should throw UnauthorizedError for null token', () => {
            expect(() => TokenModel.getNameFromAuthorizationToken(null))
                .toThrow(UnauthorizedError);
        });

        it('should throw UnauthorizedError for empty string', () => {
            expect(() => TokenModel.getNameFromAuthorizationToken(''))
                .toThrow(UnauthorizedError);
        });

        it('should throw UnauthorizedError for malformed token', () => {
            expect(() => TokenModel.getNameFromAuthorizationToken('invalid'))
                .toThrow(UnauthorizedError);
        });

        it('should throw UnauthorizedError for tampered HMAC', async () => {
            const created = await TokenModel.create({ name: 'test-token' }, true);

            const parts = created.authorizationToken.split(':');
            parts[2] = Buffer.from('tampered').toString('base64');
            const tamperedToken = parts.join(':');

            expect(() => TokenModel.getNameFromAuthorizationToken(tamperedToken))
                .toThrow(UnauthorizedError);
        });

        it('should handle special characters in token name', async () => {
            const created = await TokenModel.create({ name: 'test@token_123-name' }, true);

            const name = TokenModel.getNameFromAuthorizationToken(created.authorizationToken);

            expect(name).toBe('test@token_123-name');
        });

        it('should handle names with allowed special characters', async () => {
            const specialName = 'token@test_123-#$./';
            const created = await TokenModel.create({ name: specialName }, true);

            const name = TokenModel.getNameFromAuthorizationToken(created.authorizationToken);

            expect(name).toBe(specialName);
        });

        it('should validate HMAC before returning name', async () => {
            const created = await TokenModel.create({ name: 'test-token' }, true);

            // Tamper with name but recalculate HMAC incorrectly
            const parts = created.authorizationToken.split(':');
            parts[0] = Buffer.from('tampered-name').toString('base64');
            const tamperedToken = parts.join(':'); // HMAC is now invalid

            expect(() => TokenModel.getNameFromAuthorizationToken(tamperedToken))
                .toThrow(UnauthorizedError);
        });

        it('should throw UnauthorizedError when token format is invalid', () => {
            expect(() => TokenModel.getNameFromAuthorizationToken('a:b:c'))
                .toThrow(UnauthorizedError);
        });

        it('should correctly decode base64 encoded names', async () => {
            const created = await TokenModel.create({ name: 'my-test-token-123' }, true);

            const name = TokenModel.getNameFromAuthorizationToken(created.authorizationToken);

            expect(name).toBe('my-test-token-123');
        });
    });

    describe('Authorization Token Generation and Validation', () => {
        it('should include proper separators in authorization token', async () => {
            const created = await TokenModel.create({ name: 'test-token' }, true);

            const colonCount = (created.authorizationToken.match(/:/g) || []).length;
            expect(colonCount).toBe(2);
        });

        it('should generate HMAC using SHA512', async () => {
            const created = await TokenModel.create({ name: 'test-token' }, true);

            const parts = created.authorizationToken.split(':');
            const hmac = Buffer.from(parts[2], 'base64').toString('hex');

            // SHA512 produces 128 hex characters (64 bytes)
            expect(hmac.length).toBe(128);
        });

        it('should use timing-safe comparison for HMAC validation', async () => {
            const created = await TokenModel.create({ name: 'test-token' }, true);

            // Valid token should pass
            await expect(TokenModel.checkAuthorization(created.authorizationToken))
                .resolves
                .not.toThrow();

            // Token with different HMAC should fail
            const parts = created.authorizationToken.split(':');
            parts[2] = Buffer.from('A'.repeat(128)).toString('base64');
            const wrongHmacToken = parts.join(':');

            await expect(TokenModel.checkAuthorization(wrongHmacToken))
                .rejects
                .toThrow(UnauthorizedError);
        });
    });

    describe('Password Hashing and Verification', () => {
        it('should use bcrypt for password hashing', async () => {
            const created = await TokenModel.create({ name: 'test-token' }, true);

            // Bcrypt hashes start with $2a$, $2b$, or $2y$
            expect(created.token.password).toMatch(/^\$2[aby]\$/);
        });

        it('should verify password correctly', async () => {
            const created = await TokenModel.create({ name: 'test-token' }, true);

            // This should succeed because checkAuthorization verifies the password
            await expect(TokenModel.checkAuthorization(created.authorizationToken))
                .resolves
                .not.toThrow();
        });

        it('should generate long random passwords', async () => {
            const created = await TokenModel.create({ name: 'test-token' }, true);

            // Password should be hashed (bcrypt), so it will be at least 50 characters
            expect(created.token.password.length).toBeGreaterThan(50);
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle concurrent token creation', async () => {
            const promises = Array.from({ length: 10 }, (_, i) =>
                TokenModel.create({ name: `token-${i}` }, true)
            );

            const results = await Promise.all(promises);

            expect(results).toHaveLength(10);

            // All authorization tokens should be unique
            const authTokens = results.map(r => r.authorizationToken);
            const uniqueAuthTokens = new Set(authTokens);
            expect(uniqueAuthTokens.size).toBe(10);
        });

        it('should handle token names at minimum length (3 characters)', async () => {
            const result = await TokenModel.create({ name: 'abc' }, true);
            expect(result.token.name).toBe('abc');
        });

        it('should handle all allowed special characters in names', async () => {
            const specialChars = 'test@_-/\\|&.:#$[]{}()';
            const result = await TokenModel.create({ name: specialChars }, true);
            expect(result.token.name).toBe(specialChars);
        });

        it('should reject tokens with only 2 parts in authorization string', () => {
            expect(() => TokenModel.getNameFromAuthorizationToken('a:b'))
                .toThrow(UnauthorizedError);
        });

        it('should reject tokens with more than 3 parts', () => {
            expect(() => TokenModel.getNameFromAuthorizationToken('a:b:c:d'))
                .toThrow(UnauthorizedError);
        });

        it('should handle database connection errors gracefully', async () => {
            // Close the connection temporarily
            await DatabaseConnection.getInstance().disconnect();

            await expect(TokenModel.create({ name: 'test' }, true))
                .rejects
                .toThrow();

            // Reconnect for other tests
            await DatabaseConnection.getInstance().connect();
        });
    });

    describe('Security Tests', () => {
        it('should not accept tokens with modified name component', async () => {
            const created = await TokenModel.create({ name: 'test-token' }, true);

            const parts = created.authorizationToken.split(':');
            parts[0] = Buffer.from('modified-name').toString('base64');
            const modifiedToken = parts.join(':');

            await expect(TokenModel.checkAuthorization(modifiedToken))
                .rejects
                .toThrow(UnauthorizedError);
        });

        it('should protect against timing attacks in HMAC comparison', async () => {
            const created = await TokenModel.create({ name: 'test-token' }, true);

            // Both should fail, but timing should be consistent
            const parts = created.authorizationToken.split(':');

            // Wrong HMAC at start
            const wrongStart = `${parts[0]}:${parts[1]}:${Buffer.from('A'.repeat(128)).toString('base64')}`;

            // Wrong HMAC at end  
            const wrongEnd = `${parts[0]}:${parts[1]}:${Buffer.from('Z'.repeat(128)).toString('base64')}`;

            await expect(TokenModel.checkAuthorization(wrongStart))
                .rejects
                .toThrow(UnauthorizedError);

            await expect(TokenModel.checkAuthorization(wrongEnd))
                .rejects
                .toThrow(UnauthorizedError);
        });

        it('should validate token exists before checking password', async () => {
            const created = await TokenModel.create({ name: 'test-token' }, true);
            const parts = created.authorizationToken.split(':');

            // Create token with non-existent name
            parts[0] = Buffer.from('non-existent-name').toString('base64');

            // Recalculate HMAC for the tampered token
            const authTokenWithoutHmac = `${parts[0]}:${parts[1]}`;
            const crypto = require('crypto');
            const newHmac = crypto.createHmac('sha512', process.env.APP_SECRET)
                .update(authTokenWithoutHmac)
                .digest('hex');
            parts[2] = Buffer.from(newHmac).toString('base64');

            const nonExistentToken = parts.join(':');

            await expect(TokenModel.checkAuthorization(nonExistentToken))
                .rejects
                .toThrow(UnauthorizedError);
        });

        it('should not expose information about which part of validation failed', async () => {
            const created = await TokenModel.create({ name: 'test-token' }, true);

            // All these should throw the same error type
            const invalidTokens = [
                null,
                '',
                'invalid',
                'a:b:c:d',
            ];

            for (const token of invalidTokens) {
                await expect(TokenModel.checkAuthorization(token))
                    .rejects
                    .toThrow(UnauthorizedError);
            }
        });

        it('should use cryptographically secure random for password generation', async () => {
            const results = await Promise.all([
                TokenModel.create({ name: 'token1' }, true),
                TokenModel.create({ name: 'token2' }, true),
                TokenModel.create({ name: 'token3' }, true),
            ]);

            // Extract the actual passwords by checking authorization tokens
            const passwords = results.map(r => {
                const parts = r.authorizationToken.split(':');
                return Buffer.from(parts[1], 'base64').toString('utf-8');
            });

            // All passwords should be unique
            const uniquePasswords = new Set(passwords);
            expect(uniquePasswords.size).toBe(3);

            // All passwords should be hex strings of expected length (64 bytes = 128 hex chars)
            passwords.forEach(pwd => {
                expect(pwd).toMatch(/^[0-9a-f]{128}$/);
            });
        });
    });

    describe('Integration Tests', () => {
        it('should support complete token lifecycle', async () => {
            // Create
            const created = await TokenModel.create({ name: 'lifecycle-token' }, true);
            expect(created).toBeDefined();

            // Authorize
            await expect(TokenModel.checkAuthorization(created.authorizationToken))
                .resolves
                .not.toThrow();

            // Get name
            const name = TokenModel.getNameFromAuthorizationToken(created.authorizationToken);
            expect(name).toBe('lifecycle-token');

            // Expire
            const expired = await TokenModel.expire({ name: created.token.name }, true);
            expect(expired?.expired).toBe(true);

            // Authorization should fail after expiration
            await expect(TokenModel.checkAuthorization(created.authorizationToken))
                .rejects
                .toThrow(UnauthorizedError);
        });

        it('should handle multiple tokens independently', async () => {
            const token1 = await TokenModel.create({ name: 'token1' }, true);
            const token2 = await TokenModel.create({ name: 'token2' }, true);
            const token3 = await TokenModel.create({ name: 'token3' }, true);

            // All should be valid
            await expect(TokenModel.checkAuthorization(token1.authorizationToken))
                .resolves.not.toThrow();
            await expect(TokenModel.checkAuthorization(token2.authorizationToken))
                .resolves.not.toThrow();
            await expect(TokenModel.checkAuthorization(token3.authorizationToken))
                .resolves.not.toThrow();

            // Expire one
            await TokenModel.expire({ name: token2.token.name }, true);

            // Token 2 should fail, others should still work
            await expect(TokenModel.checkAuthorization(token1.authorizationToken))
                .resolves.not.toThrow();
            await expect(TokenModel.checkAuthorization(token2.authorizationToken))
                .rejects.toThrow(UnauthorizedError);
            await expect(TokenModel.checkAuthorization(token3.authorizationToken))
                .resolves.not.toThrow();
        });

        it('should maintain data integrity after multiple operations', async () => {
            const tokens = await Promise.all([
                TokenModel.create({ name: 'token1' }, true),
                TokenModel.create({ name: 'token2' }, true),
                TokenModel.create({ name: 'token3' }, true),
            ]);

            // Expire some tokens
            await TokenModel.expire({ name: tokens[0].token.name }, true);
            await TokenModel.expire({ name: tokens[2].token.name }, true);

            // Verify database state
            const allTokens = await DatabaseTokenModel.getModel().find({});
            expect(allTokens).toHaveLength(3);

            const expiredCount = allTokens.filter(t => t.expired).length;
            expect(expiredCount).toBe(2);

            const activeCount = allTokens.filter(t => !t.expired).length;
            expect(activeCount).toBe(1);
        });
    });
});

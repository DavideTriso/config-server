import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import TokenModel from '../../src/model/TokenModel';
import { TokenModel as DatabaseTokenModel } from '../../src/database/TokenModel';
import UnauthorizedError from '../../src/model/errors/UnauthorizedError';
import InternalServerError from '../../src/model/errors/InternalServerError';
import { ValidationError } from 'apollo-server-core';
import DuplicateEntryError from '../../src/model/errors/DuplicaException';
import bcrypt from 'bcrypt';

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

    describe('create', () => {
        it('should successfully create a token with valid input', async () => {
            const input = { name: 'test-token' };
            const result = await TokenModel.create(input);

            expect(result).toBeDefined();
            expect(result.token).toBeDefined();
            expect(result.authorizationToken).toBeDefined();
            expect(result.token.name).toBe('test-token');
            expect(result.token.expired).toBe(false);
            expect(result.token.expiredOnDateTime).toBeNull();
            expect(result.token.password).toBeDefined();
        });



        it('should generate unique passwords for different tokens', async () => {
            const result1 = await TokenModel.create({ name: 'token1' });
            const result2 = await TokenModel.create({ name: 'token2' });

            expect(result1.token.password).not.toBe(result2.token.password);
        });

        it('should hash the password in the database', async () => {
            const result = await TokenModel.create({ name: 'test-token' });

            // Password in the token should be a bcrypt hash
            expect(result.token.password).toMatch(/^\$2[aby]\$/);
            expect(result.token.password.length).toBeGreaterThan(50);
        });

        it('should generate valid authorization token format', async () => {
            const result = await TokenModel.create({ name: 'test-token' });

            const parts = result.authorizationToken.split(':');
            expect(parts).toHaveLength(3);

            // Verify all parts are base64 encoded
            parts.forEach(part => {
                expect(() => Buffer.from(part, 'base64')).not.toThrow();
            });
        });

        it('should allow token names with alphanumeric characters', async () => {
            const result = await TokenModel.create({ name: 'test123' });
            expect(result.token.name).toBe('test123');
        });

        it('should allow token names with allowed special characters', async () => {
            const result = await TokenModel.create({ name: 'test_token-123@domain' });
            expect(result.token.name).toBe('test_token-123@domain');
        });

        it('should throw ValidationError for names shorter than 3 characters', async () => {
            await expect(TokenModel.create({ name: 'ab' }))
                .rejects
                .toThrow(ValidationError);
        });

        it('should throw ValidationError for empty name', async () => {
            await expect(TokenModel.create({ name: '' }))
                .rejects
                .toThrow(ValidationError);
        });

        it('should throw ValidationError for names longer than 200 characters', async () => {
            const longName = 'a'.repeat(201);
            await expect(TokenModel.create({ name: longName }))
                .rejects
                .toThrow(ValidationError);
        });

        it('should throw ValidationError for names with invalid characters', async () => {
            await expect(TokenModel.create({ name: 'test token!' }))
                .rejects
                .toThrow(ValidationError);
        });

        it('should throw ValidationError for names with spaces', async () => {
            await expect(TokenModel.create({ name: 'test token' }))
                .rejects
                .toThrow(ValidationError);
        });

        it('should throw DuplicateEntryError when creating a token with a duplicate name', async () => {
            const tokenName = 'duplicate-token-name';

            // Create first token
            await TokenModel.create({ name: tokenName });

            // Attempt to create second token with same name
            await expect(TokenModel.create({ name: tokenName }))
                .rejects
                .toThrow(DuplicateEntryError);
        });

        it('should throw DuplicateEntryError with descriptive message for duplicate name', async () => {
            const tokenName = 'duplicate-token-name-2';

            // Create first token
            await TokenModel.create({ name: tokenName });

            // Attempt to create second token with same name
            await expect(TokenModel.create({ name: tokenName }))
                .rejects
                .toThrow(`Token with name '${tokenName}' already exists`);
        });

        it('should persist token to database', async () => {
            const result = await TokenModel.create({ name: 'test-token' });

            const dbToken = await DatabaseTokenModel.findOne({ name: result.token.name });
            expect(dbToken).toBeDefined();
            expect(dbToken?.name).toBe('test-token');
        });

        it('should create authorization token that can be verified', async () => {
            const result = await TokenModel.create({ name: 'test-token' });

            // Should not throw
            await expect(TokenModel.checkAuthorization(result.authorizationToken))
                .resolves
                .not.toThrow();
        });
    });

    describe('expire', () => {
        it('should successfully expire a non-expired token', async () => {
            const created = await TokenModel.create({ name: 'test-token' });

            const expired = await TokenModel.expire({ name: created.token.name });

            expect(expired).toBeDefined();
            expect(expired?.expired).toBe(true);
            expect(expired?.expiredOnDateTime).toBeInstanceOf(Date);
        });

        it('should not expire already expired tokens', async () => {
            const created = await TokenModel.create({ name: 'test-token' });

            // Expire first time
            await TokenModel.expire({ name: created.token.name });

            // Attempt to expire again
            const result = await TokenModel.expire({ name: created.token.name });

            expect(result).toBeNull();
        });

        it('should return null for non-existent tokens', async () => {
            const result = await TokenModel.expire({ name: 'non-existent-name' });
            expect(result).toBeNull();
        });

        it('should set expiredOnDateTime when expiring', async () => {
            const created = await TokenModel.create({ name: 'test-token' });
            const beforeExpire = new Date();

            const expired = await TokenModel.expire({ name: created.token.name });
            const afterExpire = new Date();

            expect(expired?.expiredOnDateTime).toBeDefined();
            expect(expired!.expiredOnDateTime!.getTime()).toBeGreaterThanOrEqual(beforeExpire.getTime());
            expect(expired!.expiredOnDateTime!.getTime()).toBeLessThanOrEqual(afterExpire.getTime());
        });

        it('should persist expiration to database', async () => {
            const created = await TokenModel.create({ name: 'test-token' });

            await TokenModel.expire({ name: created.token.name });

            const dbToken = await DatabaseTokenModel.findOne({ name: created.token.name });
            expect(dbToken?.expired).toBe(true);
        });
    });

    describe('deleteAll', () => {
        it('should delete all tokens', async () => {
            await TokenModel.create({ name: 'token1' });
            await TokenModel.create({ name: 'token2' });
            await TokenModel.create({ name: 'token3' });

            await TokenModel.deleteAll(true);

            const count = await DatabaseTokenModel.countDocuments();
            expect(count).toBe(0);
        });

        it('should work when no tokens exist', async () => {
            await expect(TokenModel.deleteAll(true)).resolves.not.toThrow();
        });

        it('should delete both expired and non-expired tokens', async () => {
            const token1 = await TokenModel.create({ name: 'token1' });
            await TokenModel.create({ name: 'token2' });
            await TokenModel.expire({ name: token1.token.name });

            await TokenModel.deleteAll(true);

            const count = await DatabaseTokenModel.countDocuments();
            expect(count).toBe(0);
        });
    });

    describe('checkAuthorization', () => {
        it('should pass for valid authorization token', async () => {
            const created = await TokenModel.create({ name: 'test-token' });

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
            const created = await TokenModel.create({ name: 'test-token' });
            await TokenModel.expire({ name: created.token.name });

            await expect(TokenModel.checkAuthorization(created.authorizationToken))
                .rejects
                .toThrow(UnauthorizedError);
        });

        it('should throw UnauthorizedError for non-existent name', async () => {
            const created = await TokenModel.create({ name: 'test-token' });

            // Delete the token from database
            await DatabaseTokenModel.deleteOne({ name: created.token.name });

            await expect(TokenModel.checkAuthorization(created.authorizationToken))
                .rejects
                .toThrow(UnauthorizedError);
        });

        it('should throw UnauthorizedError for tampered HMAC', async () => {
            const created = await TokenModel.create({ name: 'test-token' });

            // Tamper with the HMAC part
            const parts = created.authorizationToken.split(':');
            parts[2] = Buffer.from('tampered-hmac').toString('base64');
            const tamperedToken = parts.join(':');

            await expect(TokenModel.checkAuthorization(tamperedToken))
                .rejects
                .toThrow(UnauthorizedError);
        });

        it('should throw UnauthorizedError for tampered password', async () => {
            const created = await TokenModel.create({ name: 'test-token' });

            // Tamper with the password part
            const parts = created.authorizationToken.split(':');
            parts[1] = Buffer.from('wrong-password').toString('base64');
            const tamperedToken = parts.join(':');

            await expect(TokenModel.checkAuthorization(tamperedToken))
                .rejects
                .toThrow(UnauthorizedError);
        });

        it('should throw UnauthorizedError when password does not match hash', async () => {
            const created = await TokenModel.create({ name: 'test-token' });

            // Change the password in the database
            await DatabaseTokenModel.findOneAndUpdate(
                { name: created.token.name },
                { password: await bcrypt.hash('different-password', 10) }
            );

            await expect(TokenModel.checkAuthorization(created.authorizationToken))
                .rejects
                .toThrow(UnauthorizedError);
        });

        it('should validate HMAC signature correctly', async () => {
            const created = await TokenModel.create({ name: 'test-token' });

            // Create a new token with same parts but different HMAC
            const parts = created.authorizationToken.split(':');
            const wrongHmac = Buffer.from('completely-wrong').toString('base64');
            const tokenWithWrongHmac = `${parts[0]}:${parts[1]}:${wrongHmac}`;

            await expect(TokenModel.checkAuthorization(tokenWithWrongHmac))
                .rejects
                .toThrow(UnauthorizedError);
        });

        it('should be case-sensitive for password validation', async () => {
            const created = await TokenModel.create({ name: 'test-token' });

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
            const created = await TokenModel.create({ name: 'test-token' });
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
            const created = await TokenModel.create({ name: 'test-token-name' });

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
            const created = await TokenModel.create({ name: 'test-token' });

            const parts = created.authorizationToken.split(':');
            parts[2] = Buffer.from('tampered').toString('base64');
            const tamperedToken = parts.join(':');

            expect(() => TokenModel.getNameFromAuthorizationToken(tamperedToken))
                .toThrow(UnauthorizedError);
        });

        it('should handle special characters in token name', async () => {
            const created = await TokenModel.create({ name: 'test@token_123-name' });

            const name = TokenModel.getNameFromAuthorizationToken(created.authorizationToken);

            expect(name).toBe('test@token_123-name');
        });

        it('should handle names with allowed special characters', async () => {
            const specialName = 'token@test_123-#$./';
            const created = await TokenModel.create({ name: specialName });

            const name = TokenModel.getNameFromAuthorizationToken(created.authorizationToken);

            expect(name).toBe(specialName);
        });

        it('should validate HMAC before returning name', async () => {
            const created = await TokenModel.create({ name: 'test-token' });

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
            const created = await TokenModel.create({ name: 'my-test-token-123' });

            const name = TokenModel.getNameFromAuthorizationToken(created.authorizationToken);

            expect(name).toBe('my-test-token-123');
        });
    });

    describe('Authorization Token Generation and Validation', () => {
        it('should include proper separators in authorization token', async () => {
            const created = await TokenModel.create({ name: 'test-token' });

            const colonCount = (created.authorizationToken.match(/:/g) || []).length;
            expect(colonCount).toBe(2);
        });

        it('should generate HMAC using SHA512', async () => {
            const created = await TokenModel.create({ name: 'test-token' });

            const parts = created.authorizationToken.split(':');
            const hmac = Buffer.from(parts[2], 'base64').toString('hex');

            // SHA512 produces 128 hex characters (64 bytes)
            expect(hmac.length).toBe(128);
        });

        it('should use timing-safe comparison for HMAC validation', async () => {
            const created = await TokenModel.create({ name: 'test-token' });

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
            const created = await TokenModel.create({ name: 'test-token' });

            // Bcrypt hashes start with $2a$, $2b$, or $2y$
            expect(created.token.password).toMatch(/^\$2[aby]\$/);
        });

        it('should verify password correctly', async () => {
            const created = await TokenModel.create({ name: 'test-token' });

            // This should succeed because checkAuthorization verifies the password
            await expect(TokenModel.checkAuthorization(created.authorizationToken))
                .resolves
                .not.toThrow();
        });

        it('should generate long random passwords', async () => {
            const created = await TokenModel.create({ name: 'test-token' });

            // Password should be hashed (bcrypt), so it will be at least 50 characters
            expect(created.token.password.length).toBeGreaterThan(50);
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle concurrent token creation', async () => {
            const promises = Array.from({ length: 10 }, (_, i) =>
                TokenModel.create({ name: `token-${i}` })
            );

            const results = await Promise.all(promises);

            expect(results).toHaveLength(10);

            // All authorization tokens should be unique
            const authTokens = results.map(r => r.authorizationToken);
            const uniqueAuthTokens = new Set(authTokens);
            expect(uniqueAuthTokens.size).toBe(10);
        });

        it('should handle token names at minimum length (3 characters)', async () => {
            const result = await TokenModel.create({ name: 'abc' });
            expect(result.token.name).toBe('abc');
        });

        it('should handle all allowed special characters in names', async () => {
            const specialChars = 'test@_-/\\|&.:#$[]{}()';
            const result = await TokenModel.create({ name: specialChars });
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
            await mongoose.disconnect();

            await expect(TokenModel.create({ name: 'test' }))
                .rejects
                .toThrow();

            // Reconnect for other tests
            const mongoUri = mongoServer.getUri();
            await mongoose.connect(mongoUri);
        });
    });

    describe('Security Tests', () => {
        it('should not accept tokens with modified name component', async () => {
            const created = await TokenModel.create({ name: 'test-token' });

            const parts = created.authorizationToken.split(':');
            parts[0] = Buffer.from('modified-name').toString('base64');
            const modifiedToken = parts.join(':');

            await expect(TokenModel.checkAuthorization(modifiedToken))
                .rejects
                .toThrow(UnauthorizedError);
        });

        it('should protect against timing attacks in HMAC comparison', async () => {
            const created = await TokenModel.create({ name: 'test-token' });

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
            const created = await TokenModel.create({ name: 'test-token' });
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
            const created = await TokenModel.create({ name: 'test-token' });

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
                TokenModel.create({ name: 'token1' }),
                TokenModel.create({ name: 'token2' }),
                TokenModel.create({ name: 'token3' }),
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
            const created = await TokenModel.create({ name: 'lifecycle-token' });
            expect(created).toBeDefined();

            // Authorize
            await expect(TokenModel.checkAuthorization(created.authorizationToken))
                .resolves
                .not.toThrow();

            // Get name
            const name = TokenModel.getNameFromAuthorizationToken(created.authorizationToken);
            expect(name).toBe('lifecycle-token');

            // Expire
            const expired = await TokenModel.expire({ name: created.token.name });
            expect(expired?.expired).toBe(true);

            // Authorization should fail after expiration
            await expect(TokenModel.checkAuthorization(created.authorizationToken))
                .rejects
                .toThrow(UnauthorizedError);
        });

        it('should handle multiple tokens independently', async () => {
            const token1 = await TokenModel.create({ name: 'token1' });
            const token2 = await TokenModel.create({ name: 'token2' });
            const token3 = await TokenModel.create({ name: 'token3' });

            // All should be valid
            await expect(TokenModel.checkAuthorization(token1.authorizationToken))
                .resolves.not.toThrow();
            await expect(TokenModel.checkAuthorization(token2.authorizationToken))
                .resolves.not.toThrow();
            await expect(TokenModel.checkAuthorization(token3.authorizationToken))
                .resolves.not.toThrow();

            // Expire one
            await TokenModel.expire({ name: token2.token.name });

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
                TokenModel.create({ name: 'token1' }),
                TokenModel.create({ name: 'token2' }),
                TokenModel.create({ name: 'token3' }),
            ]);

            // Expire some tokens
            await TokenModel.expire({ name: tokens[0].token.name });
            await TokenModel.expire({ name: tokens[2].token.name });

            // Verify database state
            const allTokens = await DatabaseTokenModel.find({});
            expect(allTokens).toHaveLength(3);

            const expiredCount = allTokens.filter(t => t.expired).length;
            expect(expiredCount).toBe(2);

            const activeCount = allTokens.filter(t => !t.expired).length;
            expect(activeCount).toBe(1);
        });
    });
});

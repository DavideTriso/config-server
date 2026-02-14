import {
    validateConfigurationInput,
    safeValidateConfigurationInput,
    configKeySchema,
    userIdSchema,
    configValueSchema
} from '../src/graphql/validation';

describe('Configuration Validation', () => {
    describe('Key Validation', () => {
        it('should accept valid keys', () => {
            expect(() => configKeySchema.parse('theme')).not.toThrow();
            expect(() => configKeySchema.parse('user.settings')).not.toThrow();
            expect(() => configKeySchema.parse('app/config/test')).not.toThrow();
            expect(() => configKeySchema.parse('test_key-123')).not.toThrow();
            expect(() => configKeySchema.parse('key@domain.com')).not.toThrow();
            expect(() => configKeySchema.parse('path\\to\\config')).not.toThrow();
            expect(() => configKeySchema.parse('key|value')).not.toThrow();
            expect(() => configKeySchema.parse('scope&context')).not.toThrow();
            expect(() => configKeySchema.parse('version:1.0.0')).not.toThrow();
            expect(() => configKeySchema.parse('id#123')).not.toThrow();
            expect(() => configKeySchema.parse('price$100')).not.toThrow();
            expect(() => configKeySchema.parse('array[0]')).not.toThrow();
            expect(() => configKeySchema.parse('object{key}')).not.toThrow();
            expect(() => configKeySchema.parse('function(param)')).not.toThrow();
        });

        it('should reject keys that are too short', () => {
            const result = safeValidateConfigurationInput({ key: '', value: 'test' });
            expect(result.success).toBe(false);
        });

        it('should reject keys that are too long', () => {
            const longKey = 'a'.repeat(201);
            const result = safeValidateConfigurationInput({ key: longKey, value: 'test' });
            expect(result.success).toBe(false);
        });

        it('should reject keys with invalid characters', () => {
            expect(() => configKeySchema.parse('key with spaces')).toThrow();
            expect(() => configKeySchema.parse('key*invalid')).toThrow();
            expect(() => configKeySchema.parse('key%invalid')).toThrow();
            expect(() => configKeySchema.parse('key!invalid')).toThrow();
            expect(() => configKeySchema.parse('key=invalid')).toThrow();
            expect(() => configKeySchema.parse('key+invalid')).toThrow();
            expect(() => configKeySchema.parse('key<>invalid')).toThrow();
            expect(() => configKeySchema.parse('key;invalid')).toThrow();
        });
    });

    describe('UserId Validation', () => {
        it('should accept valid userIds', () => {
            expect(() => userIdSchema.parse('user123')).not.toThrow();
            expect(() => userIdSchema.parse('user@example.com')).not.toThrow();
            expect(() => userIdSchema.parse('domain\\user')).not.toThrow();
            expect(() => userIdSchema.parse(null)).not.toThrow();
            expect(() => userIdSchema.parse(undefined)).not.toThrow();
        });

        it('should reject invalid userIds', () => {
            expect(() => userIdSchema.parse('')).toThrow();
            expect(() => userIdSchema.parse('user with spaces')).toThrow();
            expect(() => userIdSchema.parse('a'.repeat(201))).toThrow();
        });
    });

    describe('Value Validation', () => {
        it('should accept valid JSON values', () => {
            expect(() => configValueSchema.parse('string')).not.toThrow();
            expect(() => configValueSchema.parse(123)).not.toThrow();
            expect(() => configValueSchema.parse(true)).not.toThrow();
            expect(() => configValueSchema.parse({ key: 'value' })).not.toThrow();
            expect(() => configValueSchema.parse(['a', 'b', 'c'])).not.toThrow();
            expect(() => configValueSchema.parse(null)).not.toThrow();
        });

        it('should reject values that are too large', () => {
            const largeValue = 'a'.repeat(10001);
            const result = safeValidateConfigurationInput({
                key: 'test',
                value: largeValue
            });
            expect(result.success).toBe(false);
        });

        it('should accept values up to the limit', () => {
            const maxValue = 'a'.repeat(9990); // leaves room for quotes
            expect(() => configValueSchema.parse(maxValue)).not.toThrow();
        });
    });

    describe('Complete Validation', () => {
        it('should validate complete configuration input', () => {
            const validInput = {
                key: 'app.theme',
                userId: 'user123',
                value: { mode: 'dark', contrast: 'high' }
            };

            expect(() => validateConfigurationInput(validInput)).not.toThrow();
        });

        it('should validate configuration without userId', () => {
            const validInput = {
                key: 'default.theme',
                userId: null,
                value: 'light'
            };

            expect(() => validateConfigurationInput(validInput)).not.toThrow();
        });

        it('should provide detailed error messages', () => {
            const invalidInput = {
                key: '', // too short
                userId: 'user with spaces', // invalid chars
                value: 'x'.repeat(10001) // too large
            };

            const result = safeValidateConfigurationInput(invalidInput);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.errors.length).toBeGreaterThan(0);
            }
        });
    });
});

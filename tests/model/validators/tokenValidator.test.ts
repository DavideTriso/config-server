import { ValidationError } from 'apollo-server-core';
import TokenValidator from '../../../src/model/validators/TokenValidator';

describe('TokenValidator', () => {
    describe('validateCreateTokenInput', () => {
        describe('Valid inputs', () => {
            it('should accept a valid token name with minimum length', () => {
                const input = { name: 'abc' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).not.toThrow();
            });

            it('should accept a valid token name with maximum length', () => {
                const input = { name: 'a'.repeat(30) };
                expect(() => TokenValidator.validateCreateTokenInput(input)).not.toThrow();
            });

            it('should accept a token name with alphanumeric characters', () => {
                const input = { name: 'TokenName123' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).not.toThrow();
            });

            it('should accept a token name with uppercase letters', () => {
                const input = { name: 'UPPERCASE' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).not.toThrow();
            });

            it('should accept a token name with lowercase letters', () => {
                const input = { name: 'lowercase' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).not.toThrow();
            });

            it('should accept a token name with numbers', () => {
                const input = { name: '123456' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).not.toThrow();
            });

            it('should accept a token name with @ symbol', () => {
                const input = { name: 'user@domain' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).not.toThrow();
            });

            it('should accept a token name with underscore', () => {
                const input = { name: 'user_token' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).not.toThrow();
            });

            it('should accept a token name with hyphen', () => {
                const input = { name: 'user-token' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).not.toThrow();
            });

            it('should accept a token name with forward slash', () => {
                const input = { name: 'path/to/token' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).not.toThrow();
            });

            it('should accept a token name with backslash', () => {
                const input = { name: 'path\\to\\token' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).not.toThrow();
            });

            it('should accept a token name with pipe symbol', () => {
                const input = { name: 'token|name' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).not.toThrow();
            });

            it('should accept a token name with ampersand', () => {
                const input = { name: 'token&name' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).not.toThrow();
            });

            it('should accept a token name with period', () => {
                const input = { name: 'token.name' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).not.toThrow();
            });

            it('should accept a token name with colon', () => {
                const input = { name: 'token:name' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).not.toThrow();
            });

            it('should accept a token name with hash symbol', () => {
                const input = { name: 'token#name' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).not.toThrow();
            });

            it('should accept a token name with dollar sign', () => {
                const input = { name: 'token$name' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).not.toThrow();
            });

            it('should accept a token name with square brackets', () => {
                const input = { name: 'token[0]' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).not.toThrow();
            });

            it('should accept a token name with curly brackets', () => {
                const input = { name: 'token{name}' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).not.toThrow();
            });

            it('should accept a token name with parentheses', () => {
                const input = { name: 'token(name)' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).not.toThrow();
            });

            it('should accept a token name with all allowed special characters', () => {
                const input = { name: 'abc@_-/\\|&.:#$[]{}()' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).not.toThrow();
            });

            it('should accept a complex token name', () => {
                const input = { name: '@/v1.0:service#123' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).not.toThrow();
            });
        });

        describe('Invalid inputs - name length validation', () => {
            it('should reject a token name that is too short (2 characters)', () => {
                const input = { name: 'ab' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(/Name must be at least 3 characters long/);
            });

            it('should reject a token name that is too short (1 character)', () => {
                const input = { name: 'a' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(/Name must be at least 3 characters long/);
            });

            it('should reject an empty string token name', () => {
                const input = { name: '' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(/Name must be at least 3 characters long/);
            });

            it('should reject a token name that exceeds maximum length (31 characters)', () => {
                const input = { name: 'a'.repeat(31) };
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(/Name must not exceed 30 characters/);
            });

            it('should reject a token name that is significantly too long', () => {
                const input = { name: 'a'.repeat(500) };
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(/Name must not exceed 30 characters/);
            });
        });

        describe('Invalid inputs - name character validation', () => {
            it('should reject a token name with spaces', () => {
                const input = { name: 'token name' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(/Name can only contain alphanumeric characters/);
            });

            it('should reject a token name with exclamation mark', () => {
                const input = { name: 'token!' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(/Name can only contain alphanumeric characters/);
            });

            it('should reject a token name with question mark', () => {
                const input = { name: 'token?' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(/Name can only contain alphanumeric characters/);
            });

            it('should reject a token name with asterisk', () => {
                const input = { name: 'token*' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(/Name can only contain alphanumeric characters/);
            });

            it('should reject a token name with plus sign', () => {
                const input = { name: 'token+' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(/Name can only contain alphanumeric characters/);
            });

            it('should reject a token name with equals sign', () => {
                const input = { name: 'token=' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(/Name can only contain alphanumeric characters/);
            });

            it('should reject a token name with percent sign', () => {
                const input = { name: 'token%' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(/Name can only contain alphanumeric characters/);
            });

            it('should reject a token name with angle brackets', () => {
                const input = { name: 'token<name>' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(/Name can only contain alphanumeric characters/);
            });

            it('should reject a token name with semicolon', () => {
                const input = { name: 'token;name' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(/Name can only contain alphanumeric characters/);
            });

            it('should reject a token name with comma', () => {
                const input = { name: 'token,name' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(/Name can only contain alphanumeric characters/);
            });

            it('should reject a token name with single quote', () => {
                const input = { name: "token'name" };
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(/Name can only contain alphanumeric characters/);
            });

            it('should reject a token name with double quote', () => {
                const input = { name: 'token"name' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(/Name can only contain alphanumeric characters/);
            });

            it('should reject a token name with tilde', () => {
                const input = { name: 'token~name' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(/Name can only contain alphanumeric characters/);
            });

            it('should reject a token name with backtick', () => {
                const input = { name: 'token`name' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(/Name can only contain alphanumeric characters/);
            });

            it('should reject a token name with newline character', () => {
                const input = { name: 'token\nname' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(/Name can only contain alphanumeric characters/);
            });

            it('should reject a token name with tab character', () => {
                const input = { name: 'token\tname' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(/Name can only contain alphanumeric characters/);
            });

            it('should reject a token name with unicode characters', () => {
                const input = { name: 'token™name' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(/Name can only contain alphanumeric characters/);
            });

            it('should reject a token name with emoji', () => {
                const input = { name: 'token🚀name' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(/Name can only contain alphanumeric characters/);
            });
        });

        describe('Invalid inputs - type validation', () => {
            it('should reject input with missing name field', () => {
                const input = {};
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
            });

            it('should reject input when name is a number', () => {
                const input = { name: 123 };
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
            });

            it('should reject input when name is a boolean', () => {
                const input = { name: true };
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
            });

            it('should reject input when name is null', () => {
                const input = { name: null };
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
            });

            it('should reject input when name is undefined', () => {
                const input = { name: undefined };
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
            });

            it('should reject input when name is an array', () => {
                const input = { name: ['token'] };
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
            });

            it('should reject input when name is an object', () => {
                const input = { name: { value: 'token' } };
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
            });

            it('should reject null input', () => {
                expect(() => TokenValidator.validateCreateTokenInput(null)).toThrow(ValidationError);
            });

            it('should reject undefined input', () => {
                expect(() => TokenValidator.validateCreateTokenInput(undefined)).toThrow(ValidationError);
            });

            it('should reject string input instead of object', () => {
                expect(() => TokenValidator.validateCreateTokenInput('token')).toThrow(ValidationError);
            });

            it('should reject number input instead of object', () => {
                expect(() => TokenValidator.validateCreateTokenInput(123)).toThrow(ValidationError);
            });

            it('should reject array input instead of object', () => {
                expect(() => TokenValidator.validateCreateTokenInput([])).toThrow(ValidationError);
            });
        });

        describe('Edge cases', () => {
            it('should accept a token name with exactly 3 characters', () => {
                const input = { name: 'abc' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).not.toThrow();
            });

            it('should accept a token name with exactly 30 characters', () => {
                const input = { name: 'a'.repeat(30) };
                expect(() => TokenValidator.validateCreateTokenInput(input)).not.toThrow();
            });

            it('should reject a token name with exactly 31 characters', () => {
                const input = { name: 'a'.repeat(31) };
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
            });

            it('should reject a token name with exactly 2 characters', () => {
                const input = { name: 'ab' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
            });

            it('should accept input with extra fields that are ignored', () => {
                const input = { name: 'validtoken', extraField: 'ignored' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).not.toThrow();
            });

            it('should accept a token name with only numbers', () => {
                const input = { name: '123' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).not.toThrow();
            });

            it('should accept a token name with only special characters', () => {
                const input = { name: '@_-' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).not.toThrow();
            });

            it('should accept a token name that starts with a number', () => {
                const input = { name: '123token' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).not.toThrow();
            });

            it('should accept a token name that starts with a special character', () => {
                const input = { name: '@token' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).not.toThrow();
            });

            it('should accept a token name that ends with a special character', () => {
                const input = { name: 'token@' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).not.toThrow();
            });

            it('should reject a token name with only spaces', () => {
                const input = { name: '   ' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
            });

            it('should reject a token name with leading space', () => {
                const input = { name: ' token' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
            });

            it('should reject a token name with trailing space', () => {
                const input = { name: 'token ' };
                expect(() => TokenValidator.validateCreateTokenInput(input)).toThrow(ValidationError);
            });
        });
    });
});

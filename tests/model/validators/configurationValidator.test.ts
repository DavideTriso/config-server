import { ValidationError } from 'apollo-server-core';
import ConfigurationValidator from '../../../src/model/validators/ConfigurationValidator';

describe('ConfigurationValidator', () => {
    describe('validateUpsertInput', () => {
        describe('Valid inputs', () => {
            it('should accept valid input with all required fields', () => {
                const input = {
                    key: 'validKey',
                    userId: 'validUserId',
                    value: { setting: 'value' }
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept input with string value', () => {
                const input = {
                    key: 'appConfig',
                    userId: 'user123',
                    value: 'simpleString'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept input with number value', () => {
                const input = {
                    key: 'maxRetries',
                    userId: 'admin',
                    value: 42
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept input with boolean value', () => {
                const input = {
                    key: 'featureEnabled',
                    userId: 'user1',
                    value: true
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept input with null value', () => {
                const input = {
                    key: 'setting',
                    userId: 'user1',
                    value: null
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept input with array value', () => {
                const input = {
                    key: 'allowedValues',
                    userId: 'admin',
                    value: [1, 2, 3, 'test', true]
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept input with nested object value', () => {
                const input = {
                    key: 'config',
                    userId: 'user123',
                    value: {
                        database: {
                            host: 'localhost',
                            port: 5432,
                            credentials: {
                                username: 'admin',
                                password: 'secret'
                            }
                        }
                    }
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept input with complex nested array and object value', () => {
                const input = {
                    key: 'users',
                    userId: 'admin',
                    value: [
                        { id: 1, name: 'Alice', roles: ['admin', 'user'] },
                        { id: 2, name: 'Bob', roles: ['user'] }
                    ]
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept key with minimum length (1 character)', () => {
                const input = {
                    key: 'a',
                    userId: 'user1',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept key with maximum length (200 characters)', () => {
                const input = {
                    key: 'a'.repeat(200),
                    userId: 'user1',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept userId with minimum length (1 character)', () => {
                const input = {
                    key: 'key1',
                    userId: 'a',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept userId with maximum length (200 characters)', () => {
                const input = {
                    key: 'key1',
                    userId: 'a'.repeat(200),
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept key with all allowed special characters', () => {
                const input = {
                    key: 'key@_-/\\|&.:#$[]{}()',
                    userId: 'user1',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept userId with all allowed special characters', () => {
                const input = {
                    key: 'key1',
                    userId: 'user@_-/\\|&.:#$[]{}()',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept key with alphanumeric characters', () => {
                const input = {
                    key: 'Config123Key',
                    userId: 'user1',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept userId with alphanumeric characters', () => {
                const input = {
                    key: 'key1',
                    userId: 'User123ID',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept key starting with special character', () => {
                const input = {
                    key: '@config',
                    userId: 'user1',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept key with path-like structure', () => {
                const input = {
                    key: 'app/config/database/host',
                    userId: 'user1',
                    value: 'localhost'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept userId with email-like format', () => {
                const input = {
                    key: 'key1',
                    userId: 'user@domain.com',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept value at maximum serialized length', () => {
                // Create a value that serializes to exactly 50000 chars
                const largeString = 'a'.repeat(49996); // Account for quotes and property name
                const input = {
                    key: 'key1',
                    userId: 'user1',
                    value: largeString
                };
                const serialized = JSON.stringify(input.value);
                expect(serialized.length).toBeLessThanOrEqual(50000);
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept input with extra fields', () => {
                const input = {
                    key: 'key1',
                    userId: 'user1',
                    value: 'test',
                    extraField: 'ignored'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });
        });

        describe('Invalid inputs - key validation', () => {
            it('should reject input with empty key', () => {
                const input = {
                    key: '',
                    userId: 'user1',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(/Key must be at least 1 character long/);
            });

            it('should reject input with key exceeding maximum length', () => {
                const input = {
                    key: 'a'.repeat(201),
                    userId: 'user1',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(/Key must not exceed 200 characters/);
            });

            it('should reject key with spaces', () => {
                const input = {
                    key: 'invalid key',
                    userId: 'user1',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(/Key can only contain alphanumeric characters/);
            });

            it('should reject key with exclamation mark', () => {
                const input = {
                    key: 'key!',
                    userId: 'user1',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(/Key can only contain alphanumeric characters/);
            });

            it('should reject key with question mark', () => {
                const input = {
                    key: 'key?',
                    userId: 'user1',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(/Key can only contain alphanumeric characters/);
            });

            it('should reject key with asterisk', () => {
                const input = {
                    key: 'key*',
                    userId: 'user1',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(/Key can only contain alphanumeric characters/);
            });

            it('should reject key with plus sign', () => {
                const input = {
                    key: 'key+',
                    userId: 'user1',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(/Key can only contain alphanumeric characters/);
            });

            it('should reject key with comma', () => {
                const input = {
                    key: 'key,name',
                    userId: 'user1',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(/Key can only contain alphanumeric characters/);
            });

            it('should reject key with semicolon', () => {
                const input = {
                    key: 'key;name',
                    userId: 'user1',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(/Key can only contain alphanumeric characters/);
            });

            it('should reject key with newline character', () => {
                const input = {
                    key: 'key\nname',
                    userId: 'user1',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(/Key can only contain alphanumeric characters/);
            });

            it('should reject key with tab character', () => {
                const input = {
                    key: 'key\tname',
                    userId: 'user1',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(/Key can only contain alphanumeric characters/);
            });

            it('should reject key with emoji', () => {
                const input = {
                    key: 'key🚀',
                    userId: 'user1',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(/Key can only contain alphanumeric characters/);
            });

            it('should reject key that is not a string (number)', () => {
                const input = {
                    key: 123,
                    userId: 'user1',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
            });

            it('should reject key that is not a string (boolean)', () => {
                const input = {
                    key: true,
                    userId: 'user1',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
            });

            it('should reject key that is not a string (object)', () => {
                const input = {
                    key: { name: 'key' },
                    userId: 'user1',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
            });

            it('should reject key that is not a string (array)', () => {
                const input = {
                    key: ['key'],
                    userId: 'user1',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
            });

            it('should reject key that is null', () => {
                const input = {
                    key: null,
                    userId: 'user1',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
            });

            it('should reject key that is undefined', () => {
                const input = {
                    key: undefined,
                    userId: 'user1',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
            });
        });

        describe('Invalid inputs - userId validation', () => {
            it('should reject input with empty userId', () => {
                const input = {
                    key: 'key1',
                    userId: '',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(/UserId must be at least 1 character long/);
            });

            it('should reject input with userId exceeding maximum length', () => {
                const input = {
                    key: 'key1',
                    userId: 'a'.repeat(201),
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(/UserId must not exceed 200 characters/);
            });

            it('should reject userId with spaces', () => {
                const input = {
                    key: 'key1',
                    userId: 'invalid user',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(/UserId can only contain alphanumeric characters/);
            });

            it('should reject userId with exclamation mark', () => {
                const input = {
                    key: 'key1',
                    userId: 'user!',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(/UserId can only contain alphanumeric characters/);
            });

            it('should reject userId with question mark', () => {
                const input = {
                    key: 'key1',
                    userId: 'user?',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(/UserId can only contain alphanumeric characters/);
            });

            it('should reject userId with asterisk', () => {
                const input = {
                    key: 'key1',
                    userId: 'user*',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(/UserId can only contain alphanumeric characters/);
            });

            it('should reject userId with comma', () => {
                const input = {
                    key: 'key1',
                    userId: 'user,id',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(/UserId can only contain alphanumeric characters/);
            });

            it('should reject userId with semicolon', () => {
                const input = {
                    key: 'key1',
                    userId: 'user;id',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(/UserId can only contain alphanumeric characters/);
            });

            it('should reject userId with newline character', () => {
                const input = {
                    key: 'key1',
                    userId: 'user\nid',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(/UserId can only contain alphanumeric characters/);
            });

            it('should reject userId with tab character', () => {
                const input = {
                    key: 'key1',
                    userId: 'user\tid',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(/UserId can only contain alphanumeric characters/);
            });

            it('should reject userId with emoji', () => {
                const input = {
                    key: 'key1',
                    userId: 'user🚀',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(/UserId can only contain alphanumeric characters/);
            });

            it('should reject userId that is not a string (number)', () => {
                const input = {
                    key: 'key1',
                    userId: 123,
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
            });

            it('should reject userId that is not a string (boolean)', () => {
                const input = {
                    key: 'key1',
                    userId: true,
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
            });

            it('should reject userId that is not a string (object)', () => {
                const input = {
                    key: 'key1',
                    userId: { id: 'user' },
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
            });

            it('should reject userId that is not a string (array)', () => {
                const input = {
                    key: 'key1',
                    userId: ['user'],
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
            });

            it('should reject userId that is null', () => {
                const input = {
                    key: 'key1',
                    userId: null,
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
            });

            it('should reject userId that is undefined', () => {
                const input = {
                    key: 'key1',
                    userId: undefined,
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
            });
        });

        describe('Invalid inputs - value validation', () => {
            it('should reject value that exceeds maximum serialized length', () => {
                const largeString = 'a'.repeat(50001);
                const input = {
                    key: 'key1',
                    userId: 'user1',
                    value: largeString
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(/Value must be valid JSON and not exceed 50000 characters/);
            });

            it('should reject large object that exceeds serialization limit', () => {
                const largeObject: any = {};
                for (let i = 0; i < 1000; i++) {
                    largeObject[`property${i}`] = 'some relatively long string value that will make this object huge when serialized';
                }
                const input = {
                    key: 'key1',
                    userId: 'user1',
                    value: largeObject
                };
                const serialized = JSON.stringify(input.value);
                expect(serialized.length).toBeGreaterThan(50000);
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(/Value must be valid JSON and not exceed 50000 characters/);
            });

            it('should reject large array that exceeds serialization limit', () => {
                const largeArray = Array(5000).fill('some value that makes the array exceed the limit');
                const input = {
                    key: 'key1',
                    userId: 'user1',
                    value: largeArray
                };
                const serialized = JSON.stringify(input.value);
                expect(serialized.length).toBeGreaterThan(50000);
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(/Value must be valid JSON and not exceed 50000 characters/);
            });

            it('should reject value with circular reference', () => {
                const circularObj: any = { name: 'test' };
                circularObj.self = circularObj;
                const input = {
                    key: 'key1',
                    userId: 'user1',
                    value: circularObj
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(/Value must be valid JSON and not exceed 50000 characters/);
            });

            it('should reject value with nested circular reference', () => {
                const obj1: any = { name: 'obj1' };
                const obj2: any = { name: 'obj2', parent: obj1 };
                obj1.child = obj2;
                obj2.circular = obj1;
                const input = {
                    key: 'key1',
                    userId: 'user1',
                    value: obj1
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(/Value must be valid JSON and not exceed 50000 characters/);
            });
        });

        describe('Invalid inputs - missing fields', () => {
            it('should reject input with missing key field', () => {
                const input = {
                    userId: 'user1',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
            });

            it('should reject input with missing userId field', () => {
                const input = {
                    key: 'key1',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
            });

            it('should reject input with missing value field', () => {
                const input = {
                    key: 'key1',
                    userId: 'user1'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
            });

            it('should reject empty object input', () => {
                const input = {};
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
            });

            it('should reject null input', () => {
                expect(() => ConfigurationValidator.validateUpsertInput(null)).toThrow(ValidationError);
            });

            it('should reject undefined input', () => {
                expect(() => ConfigurationValidator.validateUpsertInput(undefined)).toThrow(ValidationError);
            });

            it('should reject string input instead of object', () => {
                expect(() => ConfigurationValidator.validateUpsertInput('invalid')).toThrow(ValidationError);
            });

            it('should reject number input instead of object', () => {
                expect(() => ConfigurationValidator.validateUpsertInput(123)).toThrow(ValidationError);
            });

            it('should reject array input instead of object', () => {
                expect(() => ConfigurationValidator.validateUpsertInput([])).toThrow(ValidationError);
            });
        });

        describe('Edge cases', () => {
            it('should accept key with exactly 1 character', () => {
                const input = {
                    key: 'a',
                    userId: 'user1',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept key with exactly 200 characters', () => {
                const input = {
                    key: 'a'.repeat(200),
                    userId: 'user1',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should reject key with exactly 201 characters', () => {
                const input = {
                    key: 'a'.repeat(201),
                    userId: 'user1',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
            });

            it('should accept userId with exactly 1 character', () => {
                const input = {
                    key: 'key1',
                    userId: 'a',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept userId with exactly 200 characters', () => {
                const input = {
                    key: 'key1',
                    userId: 'a'.repeat(200),
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should reject userId with exactly 201 characters', () => {
                const input = {
                    key: 'key1',
                    userId: 'a'.repeat(201),
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).toThrow(ValidationError);
            });

            it('should accept value with empty object', () => {
                const input = {
                    key: 'key1',
                    userId: 'user1',
                    value: {}
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept value with empty array', () => {
                const input = {
                    key: 'key1',
                    userId: 'user1',
                    value: []
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept value with empty string', () => {
                const input = {
                    key: 'key1',
                    userId: 'user1',
                    value: ''
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept value with zero', () => {
                const input = {
                    key: 'key1',
                    userId: 'user1',
                    value: 0
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept value with false', () => {
                const input = {
                    key: 'key1',
                    userId: 'user1',
                    value: false
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept key with only numbers', () => {
                const input = {
                    key: '123',
                    userId: 'user1',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept userId with only numbers', () => {
                const input = {
                    key: 'key1',
                    userId: '123',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept key with only special characters', () => {
                const input = {
                    key: '@_-',
                    userId: 'user1',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept userId with only special characters', () => {
                const input = {
                    key: 'key1',
                    userId: '@_-',
                    value: 'test'
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept deeply nested value within size limit', () => {
                const input = {
                    key: 'key1',
                    userId: 'user1',
                    value: {
                        level1: {
                            level2: {
                                level3: {
                                    level4: {
                                        level5: {
                                            data: 'deep'
                                        }
                                    }
                                }
                            }
                        }
                    }
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept value with mixed types in array', () => {
                const input = {
                    key: 'key1',
                    userId: 'user1',
                    value: [1, 'two', true, null, { four: 4 }, [5]]
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept value with special JSON characters', () => {
                const input = {
                    key: 'key1',
                    userId: 'user1',
                    value: {
                        quote: 'He said "hello"',
                        backslash: 'C:\\path\\to\\file',
                        newline: 'line1\nline2',
                        tab: 'col1\tcol2'
                    }
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept value with unicode characters', () => {
                const input = {
                    key: 'key1',
                    userId: 'user1',
                    value: {
                        chinese: '你好',
                        arabic: 'مرحبا',
                        emoji: '🚀🌟'
                    }
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });

            it('should accept realistic configuration example', () => {
                const input = {
                    key: 'app/config/production',
                    userId: 'admin@company.com',
                    value: {
                        database: {
                            host: 'db.example.com',
                            port: 5432,
                            name: 'production_db',
                            poolSize: 20
                        },
                        cache: {
                            enabled: true,
                            ttl: 3600,
                            type: 'redis'
                        },
                        features: {
                            newUI: false,
                            analytics: true,
                            debugMode: false
                        },
                        allowedOrigins: [
                            'https://app.example.com',
                            'https://admin.example.com'
                        ]
                    }
                };
                expect(() => ConfigurationValidator.validateUpsertInput(input)).not.toThrow();
            });
        });
    });
});

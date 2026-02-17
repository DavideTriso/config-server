import { z } from 'zod';

/**
 * Allowed characters for key and userId:
 * - Alphanumeric: a-zA-Z0-9
 * - Special characters: @ _ - / \ | & . : # $ [ ] { } ( )
 */
const KEY_USER_PATTERN = /^[a-zA-Z0-9@_/\\|&.:#$\[\]{}()\-]+$/;

/**
 * Validation schema for configuration key
 * - Length: 1-200 characters
 * - Allowed characters: a-zA-Z0-9 and @ _ - / \ | & . : # $ [ ] { } ( )
 */
export const configKeySchema = z
    .string()
    .min(1, 'Key must be at least 1 character long')
    .max(200, 'Key must not exceed 200 characters')
    .regex(
        KEY_USER_PATTERN,
        'Key can only contain alphanumeric characters and the following special characters: @ _ - / \\ | & . : # $ [ ] { } ( )'
    );

/**
 * Validation schema for userId
 * - Length: 1-200 characters
 * - Allowed characters: same as key
 * - Required (cannot be null or undefined)
 */
export const userIdSchema = z
    .string()
    .min(1, 'UserId must be at least 1 character long')
    .max(200, 'UserId must not exceed 200 characters')
    .regex(
        KEY_USER_PATTERN,
        'UserId can only contain alphanumeric characters and the following special characters: @ _ - / \\ | & . : # $ [ ] { } ( )'
    );

/**
 * Validation schema for configuration value
 * - Must be valid JSON (any type)
 * - Serialized length must not exceed 10000 characters
 */
export const configValueSchema = z
    .unknown()
    .refine(
        (value: unknown) => {
            try {
                const serialized = JSON.stringify(value);
                return serialized.length <= 10000;
            } catch {
                return false;
            }
        },
        {
            message: 'Value must be valid JSON and not exceed 10000 characters when serialized'
        }
    );

/**
 * Complete validation schema for configuration upsert
 */
export const upsertConfigurationSchema = z.object({
    key: configKeySchema,
    userId: userIdSchema,
    value: configValueSchema,
});

/**
 * Inferred type from upsert configuration schema
 * Re-exported to separate type file for consistency
 */
type InferredValidationType = z.infer<typeof upsertConfigurationSchema>;
export type { InferredValidationType as ValidatedConfigurationInputType };

/**
 * Validates configuration input for upsert operation
 * @throws {z.ZodError} If validation fails
 */
export function validateConfigurationInput(input: unknown) {
    return upsertConfigurationSchema.parse(input);
}

/**
 * Safely validates configuration input and returns result with error details
 */
export function safeValidateConfigurationInput(input: unknown) {
    return upsertConfigurationSchema.safeParse(input);
}

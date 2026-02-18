import { ValidationError } from 'apollo-server-core';
import { z } from 'zod';


export default class ConfigurationValidator {
    private static readonly keyValidationRule = z
        .string()
        .min(1, 'Key must be at least 1 character long')
        .max(200, 'Key must not exceed 200 characters')
        .regex(
            /^[a-zA-Z0-9@_/\\|&.:#$\[\]{}()\-]+$/,
            'Key can only contain alphanumeric characters and the following special characters: @ _ - / \\ | & . : # $ [ ] { } ( )'
        );


    private static readonly userIdValidationRule = z
        .string()
        .min(1, 'UserId must be at least 1 character long')
        .max(200, 'UserId must not exceed 200 characters')
        .regex(
            /^[a-zA-Z0-9@_/\\|&.:#$\[\]{}()\-]+$/,
            'UserId can only contain alphanumeric characters and the following special characters: @ _ - / \\ | & . : # $ [ ] { } ( )'
        );


    /**
     * Validation schema for configuration value
     * - Must be valid JSON (any type)
     * - Serialized length must not exceed 10000 characters
     */
    private static readonly configValidationRule = z
        .unknown()
        .refine(
            (value: unknown) => {
                try {
                    const serialized = JSON.stringify(value);
                    return serialized.length <= 50000;
                } catch {
                    return false;
                }
            },
            {
                message: 'Value must be valid JSON and not exceed 50000 characters when serialized'
            }
        );

    private static readonly upsertConfigurationSchema = z.object({
        key: ConfigurationValidator.keyValidationRule,
        userId: ConfigurationValidator.userIdValidationRule,
        value: ConfigurationValidator.configValidationRule,
    });

    public static validateUpsertInput(input: unknown): void {
        try {
            ConfigurationValidator.upsertConfigurationSchema.parse(input);
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new ValidationError(error.message);
            }
            throw error;
        }
    }

}
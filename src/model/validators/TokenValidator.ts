import { ValidationError } from 'apollo-server-core';
import { z } from 'zod';


export default class TokenValidator {
    private static readonly nameValidationRule = z
        .string()
        .min(3, 'Name must be at least 3 characters long')
        .max(30, 'Name must not exceed 30 characters')
        .regex(
            /^[a-zA-Z0-9@_/\\|&.:#$\[\]{}()\-]+$/,
            'Name can only contain alphanumeric characters and the following special characters: @ _ - / \\ | & . : # $ [ ] { } ( )'
        );

    private static readonly createTokenSchema = z.object({
        name: TokenValidator.nameValidationRule,
    });

    public static validateCreateTokenInput(input: unknown): void {
        try {
            TokenValidator.createTokenSchema.parse(input);
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new ValidationError(error.message);
            }
            throw error;
        }
    }

}
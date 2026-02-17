import ErrorInterface from "../../types/ErrorInterface";

export default class ValidationError extends Error implements ErrorInterface {
    public readonly httpCode: string = '400';
    public readonly code: string = 'INVALID_INPUT';

    constructor(message: string = 'Invalid input') {
        super(message);
    }
}
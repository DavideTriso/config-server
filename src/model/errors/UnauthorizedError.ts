import ErrorInterface from "../types/ErrorInterface";

export default class UnauthorizedError extends Error implements ErrorInterface {
    public readonly httpCode: string = '401';
    public readonly code: string = 'UNAUTHORIZED';

    constructor(message: string = 'Unauthorized') {
        super(message);
    }
}
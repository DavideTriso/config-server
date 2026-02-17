import ErrorInterface from "../types/ErrorInterface";

export default class ForbiddenError extends Error implements ErrorInterface {
    public readonly httpCode: string = '403';
    public readonly code: string = 'FORBIDDEN';

    constructor(message: string = 'Forbidden') {
        super(message);
    }
}
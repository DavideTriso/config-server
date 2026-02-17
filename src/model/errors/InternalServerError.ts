import ErrorInterface from "../types/ErrorInterface";

export default class InternalServerError extends Error implements ErrorInterface {
    public readonly httpCode: string = '500';
    public readonly code: string = 'INTERNAL_SERVER_ERROR';

    constructor(message: string = 'Internal Server Error') {
        super(message);
    }
}
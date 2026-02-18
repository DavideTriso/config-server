import ErrorInterface from "../types/ErrorInterface";

export default class DuplicateEntryError extends Error implements ErrorInterface {
    public readonly httpCode: string = '409';
    public readonly code: string = 'DUPLICATE_ENTRY';

    constructor(message: string = 'Duplicate entry') {
        super(message);
    }
}
import { GraphQLError } from 'graphql';
import ErrorInterface from '../model/types/ErrorInterface';
import InternalServerError from '../model/errors/InternalServerError';

function isErrorInterface(error: unknown): error is ErrorInterface {
    return (error as ErrorInterface).code !== undefined && (error as ErrorInterface).httpCode !== undefined;
}

export default function handleError(error: unknown): void {
    if (isErrorInterface(error)) {
        throw new GraphQLError(error.message, { extensions: { code: error.code, httpCode: error.httpCode } });
    }

    const internalServerError = new InternalServerError();
    throw new GraphQLError(
        internalServerError.message,
        { extensions: { code: internalServerError.code, httpCode: internalServerError.httpCode } }
    );
}
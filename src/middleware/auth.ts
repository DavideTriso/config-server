import { TokenModel } from '../database/TokenModel';
import { AuthContextInterface, TokenInterface } from '../types';
import { AuthRequestInterface } from './types/AuthRequestInterface';

const tokenModel = new TokenModel();

const UNAUTHENTICATED_CONTEXT: AuthContextInterface = { userId: null };
const AUTHENTICATED_CONTEXT: AuthContextInterface = { userId: 'authenticated' };

function extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
        return null;
    }
    return authHeader.replace('Bearer ', '');
}

function isTokenExpired(token: TokenInterface): boolean {
    if (!token.expiresAt) {
        return false;
    }
    return new Date() > new Date(token.expiresAt);
}

function isTokenValid(token: TokenInterface | null): boolean {
    if (!token) {
        return false;
    }

    if (!token.active) {
        return false;
    }

    if (isTokenExpired(token)) {
        return false;
    }

    return true;
}

async function authMiddleware(req: AuthRequestInterface): Promise<AuthContextInterface> {
    const tokenString = extractTokenFromHeader(req.headers.authorization);

    if (!tokenString) {
        return UNAUTHENTICATED_CONTEXT;
    }

    try {
        const tokenDoc = await tokenModel.findByToken(tokenString);

        if (!isTokenValid(tokenDoc)) {
            return UNAUTHENTICATED_CONTEXT;
        }

        return AUTHENTICATED_CONTEXT;
    } catch (error) {
        console.error('Authentication error:', error);
        return UNAUTHENTICATED_CONTEXT;
    }
}

export default authMiddleware;

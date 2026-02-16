import { TokenSchema } from '../database/schemas';
import { AuthContextInterface, TokenInterface } from '../types';
import { AuthRequestInterface } from './types/AuthRequestInterface';

const UNAUTHENTICATED_CONTEXT: AuthContextInterface = { userId: null, isAdmin: false };

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

async function authMiddleware(request: AuthRequestInterface): Promise<AuthContextInterface> {
    const tokenString = extractTokenFromHeader(request.headers.authorization);

    if (!tokenString) {
        return UNAUTHENTICATED_CONTEXT;
    }

    try {
        const tokenDoc = await TokenSchema.findByToken(tokenString);

        if (!isTokenValid(tokenDoc)) {
            return UNAUTHENTICATED_CONTEXT;
        }

        return {
            userId: 'authenticated',
            isAdmin: tokenDoc?.admin || false
        };
    } catch (error) {
        console.error('Authentication error:', error);
        return UNAUTHENTICATED_CONTEXT;
    }
}

export default authMiddleware;

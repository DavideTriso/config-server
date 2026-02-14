import { TokenDocumentInterface } from '../types/TokenDocumentInterface';
import { randomBytes } from 'crypto';

function generateToken(): string {
    return randomBytes(32).toString('hex');
}

export const tokensData: Partial<TokenDocumentInterface>[] = [
    {
        token: generateToken(),
        name: 'Development Token 1',
        active: true,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    },
    {
        token: generateToken(),
        name: 'Development Token 2',
        active: true,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    },
    {
        token: generateToken(),
        name: 'Mobile App Token',
        active: true,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    },
    {
        token: generateToken(),
        name: 'Test Client Token',
        active: true,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    },
    {
        token: generateToken(),
        name: 'Expired Token',
        active: false,
        expiresAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    },
];

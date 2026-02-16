import { Document } from 'mongoose';
import { TokenInterface } from './TokenInterface';

export interface TokenDocumentInterface extends Omit<TokenInterface, '_id'>, Document {
    token: string;
    name: string;
    active: boolean;
    admin: boolean;
    expiresAt?: Date;
}

import { Document } from 'mongoose';
import { TokenInterface } from '../../document/types/TokenInterface';

export interface TokenDocumentInterface extends Omit<TokenInterface, '_id'>, Document {
    token: string;
    name: string;
    active: boolean;
    admin: boolean;
    expiresAt?: Date;
}

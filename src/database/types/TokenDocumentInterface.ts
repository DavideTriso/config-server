import { Document } from 'mongoose';
import { TokenInterface } from '../../types/TokenInterface';

export interface TokenDocumentInterface extends Omit<TokenInterface, '_id'>, Document {
    token: string;
    name: string;
    active: boolean;
    expiresAt?: Date;
}

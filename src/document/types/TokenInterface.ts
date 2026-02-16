import { Types } from 'mongoose';

export interface TokenInterface {
    _id: Types.ObjectId;
    token: string;
    name: string;
    active: boolean;
    admin: boolean;
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

import { Types } from 'mongoose';

export default interface TokenInterface {
    _id: Types.ObjectId;
    password: string;
    key: string;
    name: string;
    expired: boolean;
    expiredOnDateTime: Date | null;
}
import { Types } from 'mongoose';

export default interface TokenInterface {
    _id: Types.ObjectId;
    token: string;
    name: string;
    admin: boolean;
    expired: boolean;
    createdOnDateTime: Date;
    createdBy: string;
    updatedOnDateTime: Date;
    updatedBy: string;
}
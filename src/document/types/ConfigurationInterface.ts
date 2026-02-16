import { Types } from 'mongoose';

export interface ConfigurationInterface {
    _id?: Types.ObjectId;
    key: string;
    userId: string;
    value: object | [];
    createdAt?: Date;
    updatedAt?: Date;
}

import { Types } from 'mongoose';

export default interface ConfigurationInterface {
    _id: Types.ObjectId;
    key: string;
    userId: string;
    value: object | [];
    createdOnDateTime: Date;
    createdBy: string;
    updatedOnDateTime: Date;
    updatedBy: string;
}

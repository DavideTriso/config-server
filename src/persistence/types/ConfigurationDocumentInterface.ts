import { Document } from 'mongoose';
import { ConfigurationInterface } from '../../document/types/ConfigurationInterface';

export interface ConfigurationDocumentInterface extends Omit<ConfigurationInterface, '_id'>, Document {
    key: string;
    userId?: string;
    value: unknown;
}

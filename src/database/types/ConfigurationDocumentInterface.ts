import { Document, Types } from 'mongoose';
import ConfigurationInterface from './ConfigurationInterface';

export default interface ConfigurationDocumentInterface extends
    ConfigurationInterface,
    Document<Types.ObjectId> {
}
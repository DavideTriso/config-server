import { Document, Types } from 'mongoose';
import TokenInterface from './TokenInterface';

export default interface TokenDocumentInterface extends
    TokenInterface,
    Document<Types.ObjectId> {
}
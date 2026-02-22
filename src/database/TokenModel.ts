import mongoose, { Schema } from 'mongoose';
import TokenModelInterface from './types/TokenModelInterface';
import TokenDocumentInterface from './types/TokenInterface';

const tokenSchema = new Schema<TokenDocumentInterface, TokenModelInterface>(
    {
        password: { type: String, required: true },
        name: { type: String, required: true },
        expired: { type: Boolean, required: true, default: false },
        expiredOnDateTime: { type: Schema.Types.Date }
    },
    { collection: 'Tokens' }
);

tokenSchema.index(
    { name: 1 },
    { name: 'idx_name', unique: true }
);

tokenSchema.index(
    { name: 1, expired: 1 },
    { name: 'idx_name_expired' }
);

const tokenModel = mongoose.model<TokenDocumentInterface, TokenModelInterface>(
    'Token',
    tokenSchema,
);

export default class TokenModel {
    public static getModel() {
        return tokenModel;
    }
}
import mongoose, { Schema } from 'mongoose';
import TokenModelInterface from './types/TokenModelInterface';
import TokenDocumentInterface from './types/TokenInterface';

const tokenSchema = new Schema<TokenDocumentInterface, TokenModelInterface>(
    {
        token: { type: String, required: true },
        name: { type: String, required: true },
        admin: { type: Boolean, required: true, default: false },
        expired: { type: Boolean, required: true, default: false },
        createdOnDateTime: { type: Schema.Types.Date, required: true },
        createdBy: { type: String, required: true },
        updatedOnDateTime: { type: Schema.Types.Date },
        updatedBy: { type: String }
    },
    { collection: 'Tokens' }
);

tokenSchema.index(
    { token: 1, expired: 1, admin: 1 },
    { name: 'idx_token_expired_admin', unique: true }
);

export const TokenModel = mongoose.model<TokenDocumentInterface, TokenModelInterface>(
    'Token',
    tokenSchema,
);

import mongoose, { Schema } from 'mongoose';
import TokenModelInterface from './types/TokenModelInterface';
import TokenDocumentInterface from './types/TokenInterface';

const tokenSchema = new Schema<TokenDocumentInterface, TokenModelInterface>(
    {
        password: { type: String, required: true },
        key: { type: String, required: true },
        name: { type: String, required: true },
        expired: { type: Boolean, required: true, default: false },
        expiredOnDateTime: { type: Schema.Types.Date }
    },
    { collection: 'Tokens' }
);

tokenSchema.index(
    { key: 1 },
    { name: 'idx_key', unique: true }
);

tokenSchema.index(
    { key: 1, expired: 1 },
    { name: 'idx_key_expired' }
);

export const TokenModel = mongoose.model<TokenDocumentInterface, TokenModelInterface>(
    'Token',
    tokenSchema,
);

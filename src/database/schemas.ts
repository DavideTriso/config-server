import mongoose, { Schema } from 'mongoose';
import { ConfigurationDocumentInterface } from './types/ConfigurationDocumentInterface';
import { TokenDocumentInterface } from './types/TokenDocumentInterface';

// Re-export for convenience
export type ConfigurationDocument = ConfigurationDocumentInterface;
export type TokenDocument = TokenDocumentInterface;

const configurationSchema = new Schema<ConfigurationDocumentInterface>(
    {
        key: { type: String, required: true },
        userId: { type: String, sparse: true },
        value: { type: Schema.Types.Mixed, required: true },
    },
    {
        timestamps: true,
        collection: 'configurations'
    }
);

// Compound index for efficient querying
configurationSchema.index(
    { key: 1, userId: 1 },
    { name: 'idx_key_userId', unique: true, sparse: true }
);
configurationSchema.index(
    { userId: 1 },
    { name: 'idx_userId' }
);
configurationSchema.index(
    { key: 1 },
    { name: 'idx_key' }
);

export const ConfigurationModel = mongoose.model<ConfigurationDocumentInterface>('Configuration', configurationSchema);

const tokenSchema = new Schema<TokenDocumentInterface>(
    {
        token: { type: String, required: true },
        name: { type: String, required: true },
        active: { type: Boolean, required: true, default: true },
        expiresAt: { type: Date }
    },
    {
        timestamps: true,
        collection: 'tokens'
    }
);

// Token indexes with explicit names
tokenSchema.index(
    { token: 1 },
    { name: 'idx_token', unique: true }
);

export const TokenModel = mongoose.model<TokenDocumentInterface>('Token', tokenSchema);

import mongoose, { Schema, Document } from 'mongoose';
import { Configuration, Token } from '../types';

// Configuration Schema
export interface ConfigurationDocument extends Omit<Configuration, '_id'>, Document {}

const configurationSchema = new Schema<ConfigurationDocument>(
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
configurationSchema.index({ key: 1, userId: 1 }, { unique: true, sparse: true });
configurationSchema.index({ userId: 1 });
configurationSchema.index({ key: 1 });

export const ConfigurationModel = mongoose.model<ConfigurationDocument>('Configuration', configurationSchema);

// Token Schema
export interface TokenDocument extends Omit<Token, '_id'>, Document {}

const tokenSchema = new Schema<TokenDocument>(
  {
    token: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    name: { type: String, required: true },
    active: { type: Boolean, required: true, default: true },
    expiresAt: { type: Date }
  },
  {
    timestamps: true,
    collection: 'tokens'
  }
);

tokenSchema.index({ userId: 1 });

export const TokenModel = mongoose.model<TokenDocument>('Token', tokenSchema);

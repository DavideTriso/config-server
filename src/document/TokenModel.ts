import mongoose, { Schema } from 'mongoose';
import { TokenDocumentInterface } from './types/TokenDocumentInterface';
import { TokenInterface, TokenCreateInputInterface } from '../types';
import TokenModelInterface from './types/TokenModelInterface';
import { TokenUpdateInputInterface } from './types/TokenUpdateInputInterface';

const tokenSchema = new Schema<TokenDocumentInterface, TokenModelInterface>(
    {
        token: { type: String, required: true },
        name: { type: String, required: true },
        active: { type: Boolean, required: true, default: true },
        admin: { type: Boolean, required: true, default: false },
        expiresAt: { type: Date }
    },
    {
        timestamps: true,
        collection: 'Tokens',
        statics: {
            async createToken(tokenData: TokenCreateInputInterface): Promise<TokenInterface> {
                const token = new this({
                    ...tokenData
                });

                await token.save();
                const savedToken = token.toObject<TokenInterface>();
                return savedToken;
            },
            async findByToken(token: string): Promise<TokenInterface | null> {
                const result = await this.findOne({ token }).lean<TokenInterface>();
                return result;
            },
            async updateTokenById(id: string, updateData: Partial<TokenUpdateInputInterface>): Promise<boolean> {
                const result = await this.updateOne(
                    { _id: id },
                    {
                        $set: {
                            ...updateData,
                            updatedAt: new Date()
                        }
                    }
                );
                return result.modifiedCount > 0;
            }
        }
    }
);

// Token indexes with explicit names
tokenSchema.index(
    { token: 1 },
    { name: 'idx_token', unique: true }
);

export const TokenModel = mongoose.model<TokenDocumentInterface, TokenModelInterface>(
    'Token',
    tokenSchema
);

import { TokenModel as TokenSchema } from './schemas';
import { TokenInterface, TokenCreateInputInterface } from '../types';

export class TokenModel {
    async create(tokenData: TokenCreateInputInterface): Promise<TokenInterface> {
        const token = new TokenSchema({
            ...tokenData
        });

        await token.save();
        const savedToken = token.toObject<TokenInterface>();
        return savedToken;
    }

    async findByToken(token: string): Promise<TokenInterface | null> {
        const result = await TokenSchema.findOne({ token }).lean<TokenInterface>();
        return result;
    }

    async findAll(): Promise<TokenInterface[]> {
        const tokens = await TokenSchema.find({}).lean<TokenInterface[]>();
        return tokens;
    }

    async updateById(id: string, updateData: Partial<TokenInterface>): Promise<boolean> {
        const result = await TokenSchema.updateOne(
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

    async deleteById(id: string): Promise<boolean> {
        const result = await TokenSchema.deleteOne({ _id: id });
        return result.deletedCount > 0;
    }

    async deleteByToken(token: string): Promise<boolean> {
        const result = await TokenSchema.deleteOne({ token });
        return result.deletedCount > 0;
    }
}

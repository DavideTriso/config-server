import { ConfigurationModel, TokenModel as TokenSchema } from './schemas';
import { Configuration, ConfigurationUpsertResult, Token, TokenCreateInput } from '../types';

export class ConfigModel {
  async findByKeyAndUserId(key: string, userId: string): Promise<Configuration | null> {
    const config = await ConfigurationModel.findOne({ key, userId }).lean();
    return config as Configuration | null;
  }

  async upsert(key: string, userId: string | null, value: unknown): Promise<ConfigurationUpsertResult> {
    const filter = userId ? { key, userId } : { key, userId: { $exists: false } };
    const setData: any = { 
      key, 
      value, 
      updatedAt: new Date() 
    };
    
    if (userId) {
      setData.userId = userId;
    }
    
    const result = await ConfigurationModel.updateOne(
      filter,
      { 
        $set: setData,
        $setOnInsert: { 
          createdAt: new Date() 
        }
      },
      { upsert: true }
    );
    
    return {
      key,
      userId: userId || undefined,
      value,
      updatedAt: new Date(),
      upserted: result.upsertedCount > 0
    };
  }

  async findByUserId(userId: string): Promise<Configuration[]> {
    const configs = await ConfigurationModel.find({ userId }).lean();
    return configs as Configuration[];
  }

  async findByUserIdAndKeys(userId: string, keys?: string[]): Promise<Configuration[]> {
    if (!keys || keys.length === 0) {
      // Return all configurations for the user (limited to 1000)
      const configs = await ConfigurationModel.find({ userId }).limit(1000).lean();
      return configs as Configuration[];
    }
    
    // Find user-specific configurations for the given keys
    const userConfigs = await ConfigurationModel.find({ 
      userId, 
      key: { $in: keys } 
    }).lean();
    
    // Create a map of found keys
    const foundKeys = new Set(userConfigs.map(c => c.key));
    
    // Find missing keys
    const missingKeys = keys.filter(k => !foundKeys.has(k));
    
    // Find default configurations for missing keys
    let defaultConfigs: any[] = [];
    if (missingKeys.length > 0) {
      defaultConfigs = await ConfigurationModel.find({ 
        userId: { $exists: false },
        key: { $in: missingKeys } 
      }).lean();
    }
    
    // Combine and return
    return [...userConfigs, ...defaultConfigs] as Configuration[];
  }
}

export class TokenModel {
  async create(tokenData: TokenCreateInput): Promise<Token> {
    const token = new TokenSchema({
      ...tokenData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await token.save();
    return token.toObject() as Token;
  }

  async findByToken(token: string): Promise<Token | null> {
    const result = await TokenSchema.findOne({ token }).lean();
    return result as Token | null;
  }

  async findByUserId(userId: string): Promise<Token[]> {
    const tokens = await TokenSchema.find({ userId }).lean();
    return tokens as Token[];
  }

  async findAll(): Promise<Token[]> {
    const tokens = await TokenSchema.find({}).lean();
    return tokens as Token[];
  }

  async updateById(id: string, updateData: Partial<Token>): Promise<boolean> {
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

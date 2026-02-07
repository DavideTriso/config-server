import { ObjectId, Collection } from 'mongodb';
import db from './connection';
import { Configuration, ConfigurationUpsertResult, Token, TokenCreateInput } from '../types';

export class ConfigModel {
  private collectionName: string;

  constructor() {
    this.collectionName = 'configurations';
  }

  private getCollection(): Collection<Configuration> {
    return db.getDb().collection(this.collectionName);
  }

  async findByKeyAndUserId(key: string, userId: string): Promise<Configuration | null> {
    return await this.getCollection().findOne({ key, userId });
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
    
    const result = await this.getCollection().updateOne(
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
    return await this.getCollection().find({ userId }).toArray();
  }

  async findByUserIdAndKeys(userId: string, keys?: string[]): Promise<Configuration[]> {
    if (!keys || keys.length === 0) {
      // Return all configurations for the user (limited to 1000)
      return await this.getCollection().find({ userId }).limit(1000).toArray();
    }
    
    // Find user-specific configurations for the given keys
    const userConfigs = await this.getCollection().find({ 
      userId, 
      key: { $in: keys } 
    }).toArray();
    
    // Create a map of found keys
    const foundKeys = new Set(userConfigs.map(c => c.key));
    
    // Find missing keys
    const missingKeys = keys.filter(k => !foundKeys.has(k));
    
    // Find default configurations for missing keys
    let defaultConfigs: Configuration[] = [];
    if (missingKeys.length > 0) {
      defaultConfigs = await this.getCollection().find({ 
        userId: { $exists: false },
        key: { $in: missingKeys } 
      }).toArray();
    }
    
    // Combine and return
    return [...userConfigs, ...defaultConfigs];
  }
}

export class TokenModel {
  private collectionName: string;

  constructor() {
    this.collectionName = 'tokens';
  }

  private getCollection(): Collection<Token> {
    return db.getDb().collection(this.collectionName);
  }

  async create(tokenData: TokenCreateInput): Promise<Token> {
    const token: Token = {
      ...tokenData,
      _id: new ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await this.getCollection().insertOne(token);
    return token;
  }

  async findByToken(token: string): Promise<Token | null> {
    return await this.getCollection().findOne({ token });
  }

  async findByUserId(userId: string): Promise<Token[]> {
    return await this.getCollection().find({ userId }).toArray();
  }

  async findAll(): Promise<Token[]> {
    return await this.getCollection().find({}).toArray();
  }

  async updateById(id: string, updateData: Partial<Token>): Promise<boolean> {
    const result = await this.getCollection().updateOne(
      { _id: new ObjectId(id) },
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
    const result = await this.getCollection().deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  async deleteByToken(token: string): Promise<boolean> {
    const result = await this.getCollection().deleteOne({ token });
    return result.deletedCount > 0;
  }
}

const { ObjectId } = require('mongodb');
const db = require('./connection');

class ConfigModel {
  constructor() {
    this.collectionName = 'configurations';
  }

  getCollection() {
    return db.getDb().collection(this.collectionName);
  }

  async findByKeyAndUserId(key, userId) {
    return await this.getCollection().findOne({ key, userId });
  }

  async upsert(key, userId, value) {
    const result = await this.getCollection().updateOne(
      { key, userId },
      { 
        $set: { 
          key, 
          userId, 
          value, 
          updatedAt: new Date() 
        },
        $setOnInsert: { 
          createdAt: new Date() 
        }
      },
      { upsert: true }
    );
    
    return {
      key,
      userId,
      value,
      updatedAt: new Date(),
      upserted: result.upsertedCount > 0
    };
  }

  async findByUserId(userId) {
    return await this.getCollection().find({ userId }).toArray();
  }
}

class TokenModel {
  constructor() {
    this.collectionName = 'tokens';
  }

  getCollection() {
    return db.getDb().collection(this.collectionName);
  }

  async create(tokenData) {
    const token = {
      ...tokenData,
      _id: new ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await this.getCollection().insertOne(token);
    return token;
  }

  async findByToken(token) {
    return await this.getCollection().findOne({ token });
  }

  async findByUserId(userId) {
    return await this.getCollection().find({ userId }).toArray();
  }

  async findAll() {
    return await this.getCollection().find({}).toArray();
  }

  async updateById(id, updateData) {
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

  async deleteById(id) {
    const result = await this.getCollection().deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  async deleteByToken(token) {
    const result = await this.getCollection().deleteOne({ token });
    return result.deletedCount > 0;
  }
}

module.exports = {
  ConfigModel,
  TokenModel
};
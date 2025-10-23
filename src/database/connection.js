const { MongoClient } = require('mongodb');

class DatabaseConnection {
  constructor() {
    this.client = null;
    this.db = null;
  }

  async connect(uri = process.env.MONGODB_URI) {
    try {
      this.client = new MongoClient(uri);
      await this.client.connect();
      this.db = this.client.db();
      console.log('Connected to MongoDB');
      return this.db;
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('Disconnected from MongoDB');
    }
  }

  getDb() {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }
}

module.exports = new DatabaseConnection();
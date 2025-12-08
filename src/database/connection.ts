import { MongoClient, Db } from 'mongodb';

class DatabaseConnection {
  client: MongoClient | null;
  db: Db | null;

  constructor() {
    this.client = null;
    this.db = null;
  }

  async connect(uri: string = process.env.MONGODB_URI || ''): Promise<Db> {
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

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      console.log('Disconnected from MongoDB');
    }
  }

  getDb(): Db {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }
}

export default new DatabaseConnection();

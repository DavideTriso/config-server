import mongoose from 'mongoose';

class DatabaseConnection {
  private isConnected: boolean = false;

  async connect(uri: string = process.env.MONGODB_URI || ''): Promise<typeof mongoose> {
    try {
      if (this.isConnected) {
        return mongoose;
      }

      // Configure connection options with connection pooling
      const options = {
        maxPoolSize: 10, // Maximum number of connections in the pool
        minPoolSize: 2,  // Minimum number of connections in the pool
        maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
        serverSelectionTimeoutMS: 5000, // Timeout for initial connection
        socketTimeoutMS: 45000, // Timeout for socket operations
      };

      await mongoose.connect(uri, options);
      this.isConnected = true;
      
      mongoose.connection.on('connected', () => {
        console.log('Connected to MongoDB with connection pooling');
      });

      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('Disconnected from MongoDB');
        this.isConnected = false;
      });

      return mongoose;
    } catch (error) {
      console.error('MongoDB connection error:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('Disconnected from MongoDB');
    }
  }

  getConnection(): typeof mongoose {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return mongoose;
  }

  // Backward compatibility property - throws error if not connected
  get db() {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return mongoose.connection.db;
  }
}

export default new DatabaseConnection();

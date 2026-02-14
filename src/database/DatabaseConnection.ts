import mongoose from 'mongoose';

class DatabaseConnection {
    private isConnected: boolean = false;

    private getConnectionOptions() {
        return {
            maxPoolSize: 10,
            minPoolSize: 2,
            maxIdleTimeMS: 30000,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        };
    }

    private setupEventListeners(): void {
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
    }

    async connect(uri: string = process.env.MONGODB_URI || ''): Promise<typeof mongoose> {
        if (this.isConnected) {
            return mongoose;
        }

        try {
            const options = this.getConnectionOptions();
            await mongoose.connect(uri, options);
            this.isConnected = true;
            this.setupEventListeners();
            return mongoose;
        } catch (error) {
            console.error('MongoDB connection error:', error);
            this.isConnected = false;
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (!this.isConnected) {
            return;
        }

        await mongoose.disconnect();
        this.isConnected = false;
    }

    getConnection(): typeof mongoose {
        if (!this.isConnected) {
            throw new Error('Database not connected. Call connect() first.');
        }
        return mongoose;
    }
}

export default new DatabaseConnection();

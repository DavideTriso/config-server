import mongoose from 'mongoose';

export default class DatabaseConnection {

    private isConnected: boolean = false;

    private readonly CONNECTION_OPTIONS = {
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    };

    private setupEventListeners(): void {
        mongoose.connection.on('connected', () => {
            this.isConnected = true;
            console.log('Connected to MongoDB');
        });

        mongoose.connection.on('error', (error) => {
            console.error('MongoDB connection error:', error);
        });

        mongoose.connection.on('disconnected', () => {
            this.isConnected = false;
            console.log('Disconnected from MongoDB');
        });
    }

    async connect(uri: string = process.env.MONGODB_URI || ''): Promise<void> {
        this.setupEventListeners();

        try {
            await mongoose.connect(uri, this.CONNECTION_OPTIONS);
            this.isConnected = true;
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
}
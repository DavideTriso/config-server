import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

export default class DatabaseConnection {

    private readonly CONNECTION_OPTIONS = {
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    };

    private static instance: DatabaseConnection | null = null;

    private static useMemoryServer: boolean = false;

    private mongoMemoryServer: MongoMemoryServer | null = null;

    private isConnected: boolean = false;

    private isConnectCalled: boolean = false;

    private constructor() {
    }

    public static async enableTestMemoryServer(): Promise<void> {
        if (DatabaseConnection.instance) {
            throw new Error('Cannot enable test memory server after instance has been created');
        }
        DatabaseConnection.useMemoryServer = true;
    }

    public static getInstance(): DatabaseConnection {
        if (!DatabaseConnection.instance) {
            DatabaseConnection.instance = new DatabaseConnection();
        }
        return DatabaseConnection.instance;
    }

    public async connect(): Promise<void> {
        if (this.isConnectCalled) {
            return;
        }

        this.isConnectCalled = true;

        this.setupEventListeners();

        try {
            if (DatabaseConnection.useMemoryServer) {
                this.mongoMemoryServer = await MongoMemoryServer.create();
                await mongoose.connect(this.mongoMemoryServer.getUri(), {});
            } else {
                const uri = process.env.MONGODB_URI || '';
                await mongoose.connect(process.env.MONGODB_URI || '', this.CONNECTION_OPTIONS);
            }
            this.isConnected = true;
        } catch (error) {
            console.error('MongoDB connection error:', error);
            this.isConnected = false;
            throw error;
        }
    }

    public async disconnect(): Promise<void> {
        if (!this.isConnected) {
            return;
        }

        await mongoose.disconnect();

        if (this.mongoMemoryServer) {
            await this.mongoMemoryServer.stop();
            this.mongoMemoryServer = null;
        }

        this.isConnected = false;
        this.isConnectCalled = false;
    }

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
}
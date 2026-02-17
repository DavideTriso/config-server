import dotenv from 'dotenv';
import DatabaseConnection from '../database/DatabaseConnection';
import seed from '../seed/seed';

// Load environment variables
dotenv.config();

async function runSeed() {
    try {
        const databaseConnection = new DatabaseConnection();
        await databaseConnection.connect();
        console.log('Starting database seeding...');
        await seed();
        console.log('Database seeding completed successfully');;
        process.exit(0);
    } catch (error) {
        console.error('Failed to seed database:', error);
        process.exit(1);
    }
}

runSeed();

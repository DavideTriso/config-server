import dotenv from 'dotenv';

dotenv.config();

import { program } from 'commander';
import seed from '../seed/seed';

program.name('seeder').description('CLI for seeding the database with initial data').version('1.0.0');

program
    .command('seed')
    .description('Seed the database with initial data')
    .action(async (): Promise<void> => {
        try {
            console.log('Starting database seeding...');
            await seed();
            console.log('Database seeding completed successfully');;
            process.exit(0);
        } catch (error) {
            console.error('Failed to seed database:', error);
            process.exit(1);
        }
    });

program.parse();